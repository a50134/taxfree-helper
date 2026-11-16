import type { TaxRate } from './types';

export interface ParsedItem {
  name: string;
  priceInclTax: number;
  taxRate: TaxRate;
}

export interface ParsedReceipt {
  storeName?: string;
  /** YYYY-MM-DD */
  purchaseDate?: string;
  items: ParsedItem[];
  /** 收據上的「合計」，用來跟品項加總比對 */
  total?: number;
}

/**
 * 把 OCR 讀出來的日文收據文字，整理成表單可用的資料（純函式）。
 * OCR 一定會有錯，這裡只負責「盡量猜」，使用者要在表單上核對。
 */
export function parseReceiptText(raw: string): ParsedReceipt {
  const lines = raw
    .split(/\r?\n/)
    .map(normalize)
    .filter((l) => l.length > 0);

  // 收據常用 ※ 或 * 標示軽減税率（8%）品項
  const reducedMark = /[※*]/;
  const hasReducedLegend = lines.some((l) => /軽減/.test(l));

  const items: ParsedItem[] = [];
  let total: number | undefined;
  let purchaseDate: string | undefined;

  for (const line of lines) {
    const date = findDate(line);
    if (date) {
      purchaseDate ??= date;
      continue; // 日期那一行不會是商品
    }

    if (/^(合計|総合計|お買上げ?合計|お買い上げ合計)/.test(line)) {
      total ??= findPrice(line);
      continue;
    }
    if (SKIP.test(line)) continue;

    const price = findPrice(line);
    if (price === undefined) continue;

    const name = line
      .replace(PRICE_AT_END, '')
      .replace(reducedMark, '')
      .replace(/\s+\d+(個|点|コ)\s*$/, '')
      .trim();
    if (!name || /^\d+$/.test(name)) continue;

    items.push({
      name,
      priceInclTax: price,
      taxRate: hasReducedLegend && reducedMark.test(line) ? 8 : 10,
    });
  }

  return { storeName: findStoreName(lines), purchaseDate, items, total };
}

/** 全形轉半形、統一 ¥ 符號、去掉多餘空白 */
function normalize(line: string): string {
  return line.normalize('NFKC').replace(/[￥]/g, '¥').replace(/\s+/g, ' ').trim();
}

/** 這些行有金額，但不是商品 */
const SKIP =
  /(小計|税込|税抜|内税|外税|消費税|対象|お預|預り|預かり|お釣|釣銭|おつり|クレジット|カード|現金|値引|割引|ポイント|点数|買上点数|合計点数|TEL|電話|No\.|レジ|責任者|領収)/i;

/** 行尾的金額，例如「¥1,980」「1,980円」「1980」 */
const PRICE_AT_END = /[¥\\]?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*円?\s*(?:内?[*※])?\s*$/;

function findPrice(line: string): number | undefined {
  const m = line.match(PRICE_AT_END);
  if (!m) return undefined;
  const value = Number(m[1].replace(/,/g, ''));
  // 太小多半是數量或代碼，太大多半是條碼或電話
  if (!Number.isFinite(value) || value < 10 || value > 10_000_000) return undefined;
  return value;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIsoDate(y: number, m: number, d: number): string | undefined {
  if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${pad(m)}-${pad(d)}`;
}

function findDate(line: string): string | undefined {
  // 2026年11月16日、2026/11/16、2026-11-16、2026.11.16
  let m = line.match(/(20\d{2})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})/);
  if (m) return toIsoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  // 令和8年11月16日（令和 1 年 = 2019 年）
  m = line.match(/令和\s*(\d{1,2}|元)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
  if (m) {
    const year = m[1] === '元' ? 1 : Number(m[1]);
    return toIsoDate(2018 + year, Number(m[2]), Number(m[3]));
  }
  // R8.11.16
  m = line.match(/\bR\s*(\d{1,2})[.\/](\d{1,2})[.\/](\d{1,2})/);
  if (m) return toIsoDate(2018 + Number(m[1]), Number(m[2]), Number(m[3]));
  return undefined;
}

/** 前幾行裡，第一個看起來像店名的（不是日期、電話、純數字） */
function findStoreName(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 6)) {
    if (findDate(line)) continue;
    if (/(TEL|電話|〒|領収|レシート|^\d[\d\s\-]*$)/i.test(line)) continue;
    if (findPrice(line) !== undefined && /\d{3,}/.test(line)) continue;
    if (line.replace(/[^\p{L}]/gu, '').length < 2) continue;
    return line;
  }
  return undefined;
}
