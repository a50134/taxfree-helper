import type { Item, Receipt, Trip } from './types';

/**
 * 規則常數。規則有變動時只改這裡。
 * 來源：観光庁「旅行者向け よくある質問（リファンド方式）」、国税庁リファンド方式 Q&A
 */
export const RULES = {
  /** 購買日的隔天算第 1 天，第 90 天前要完成出境確認 */
  deadlineDays: 90,
  /** 稅前 5,000 日圓以上（合算單位以官方為準，這裡以一張收據計算） */
  minimumExclTax: 5000,
  /** 剩幾天以內算「快到期」 */
  soonDays: 7,
} as const;

// ---------- 日期工具（全部用 YYYY-MM-DD 字串，不碰時區） ----------

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMs(date: string): number {
  if (!DATE_RE.test(date)) {
    throw new Error(`日期格式要是 YYYY-MM-DD：${date}`);
  }
  const [y, m, d] = date.split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  // 擋掉 2026-02-30 這種不存在的日期
  if (
    check.getUTCFullYear() !== y ||
    check.getUTCMonth() !== m - 1 ||
    check.getUTCDate() !== d
  ) {
    throw new Error(`不存在的日期：${date}`);
  }
  return ms;
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** to 減 from 的天數（to 比較晚就是正數） */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** 現在的「日本日期」。台灣晚上 11 點時，日本已經是隔天 */
export function todayInJapan(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// ---------- 期限 ----------

/** 退稅期限（最後一天，當天出境仍有效） */
export function refundDeadline(purchaseDate: string): string {
  return addDays(purchaseDate, RULES.deadlineDays);
}

/** 剩幾天：0 = 今天是最後一天；負數 = 已過期 */
export function daysLeft(purchaseDate: string, today: string): number {
  return daysBetween(today, refundDeadline(purchaseDate));
}

// ---------- 金額 ----------

/** 單一品項的消費稅估算：含稅價 × 稅率 ÷ (100 + 稅率)，小數捨去 */
export function itemTax(item: Item): number {
  return Math.floor((item.priceInclTax * item.taxRate) / (100 + item.taxRate));
}

export interface ReceiptTotals {
  inclTax: number;
  exclTax: number;
  /** 預估可退的消費稅（未扣手續費） */
  tax: number;
}

export function receiptTotals(receipt: Receipt): ReceiptTotals {
  let inclTax = 0;
  let tax = 0;
  for (const item of receipt.items) {
    inclTax += item.priceInclTax;
    tax += itemTax(item);
  }
  return { inclTax, exclTax: inclTax - tax, tax };
}

export function meetsMinimum(receipt: Receipt): boolean {
  return receiptTotals(receipt).exclTax >= RULES.minimumExclTax;
}

// ---------- 風險提醒 ----------

export type RiskFlag =
  | 'EMPTY' // 還沒加品項
  | 'BELOW_MINIMUM' // 稅前未滿 5,000 日圓
  | 'HAS_CONSUMABLE' // 有消耗品：用掉一件，整張收據都不能退
  | 'EXPIRED' // 已過 90 天期限
  | 'DEADLINE_SOON' // 快到期
  | 'DEPARTS_AFTER_DEADLINE'; // 出境日晚於期限

export function getRiskFlags(
  receipt: Receipt,
  today: string,
  departureDate?: string,
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (receipt.items.length === 0) {
    flags.push('EMPTY');
  } else if (!meetsMinimum(receipt)) {
    flags.push('BELOW_MINIMUM');
  }

  if (receipt.items.some((item) => item.isConsumable)) {
    flags.push('HAS_CONSUMABLE');
  }

  const left = daysLeft(receipt.purchaseDate, today);
  if (left < 0) {
    flags.push('EXPIRED');
  } else {
    if (left <= RULES.soonDays) flags.push('DEADLINE_SOON');
    const deadline = refundDeadline(receipt.purchaseDate);
    if (departureDate && daysBetween(deadline, departureDate) > 0) {
      flags.push('DEPARTS_AFTER_DEADLINE');
    }
  }

  return flags;
}

// ---------- 資格檢查 ----------

export interface EligibilityAnswers {
  nationality: 'foreign' | 'japanese';
  /** 外國籍：是否以「短期滞在」身分入境（一般觀光多半是） */
  shortTermVisitor?: boolean;
  /** 日本籍：是否在國外住滿 2 年以上 */
  livedAbroad2Years?: boolean;
  workingInJapan: boolean;
  /** 入境後是否已滿 6 個月 */
  stayed6MonthsOrMore: boolean;
}

export type Eligibility = 'eligible' | 'not_eligible' | 'needs_check';

export function checkEligibility(a: EligibilityAnswers): Eligibility {
  if (a.workingInJapan || a.stayed6MonthsOrMore) return 'not_eligible';
  if (a.nationality === 'japanese') {
    return a.livedAbroad2Years ? 'eligible' : 'not_eligible';
  }
  // 外交、公用、其他上陸許可等身分，交給使用者自己確認
  return a.shortTermVisitor ? 'eligible' : 'needs_check';
}

// ---------- 整趟旅程摘要 ----------

/** 依期限排序（最早到期在前），不改動原陣列 */
export function sortByDeadline(receipts: Receipt[]): Receipt[] {
  return [...receipts].sort((a, b) => daysBetween(b.purchaseDate, a.purchaseDate));
}

export interface TripSummary {
  receiptCount: number;
  expiredCount: number;
  /** 還沒過期的收據裡，最早的期限；沒有就是 null */
  earliestDeadline: string | null;
  /** 未過期且達門檻的收據，預估可退稅額合計（未扣手續費） */
  estimatedRefund: number;
}

export function tripSummary(trip: Trip, today: string): TripSummary {
  const active = trip.receipts.filter((r) => daysLeft(r.purchaseDate, today) >= 0);
  const sorted = sortByDeadline(active);
  const estimatedRefund = active
    .filter(meetsMinimum)
    .reduce((sum, r) => sum + receiptTotals(r).tax, 0);

  return {
    receiptCount: trip.receipts.length,
    expiredCount: trip.receipts.length - active.length,
    earliestDeadline: sorted.length > 0 ? refundDeadline(sorted[0].purchaseDate) : null,
    estimatedRefund,
  };
}
