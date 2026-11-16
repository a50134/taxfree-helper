import { describe, expect, it } from 'vitest';
import {
  addDays,
  checkEligibility,
  daysLeft,
  getRiskFlags,
  itemTax,
  meetsMinimum,
  receiptTotals,
  refundDeadline,
  sortByDeadline,
  todayInJapan,
  tripSummary,
} from './rules';
import type { Item, Receipt, Trip } from './types';

// ---------- 測試用的小工具 ----------

let seq = 0;
function item(priceInclTax: number, opts: Partial<Item> = {}): Item {
  seq += 1;
  return {
    id: `i${seq}`,
    name: `item${seq}`,
    priceInclTax,
    taxRate: 10,
    isConsumable: false,
    ...opts,
  };
}

function receipt(purchaseDate: string, items: Item[]): Receipt {
  seq += 1;
  return { id: `r${seq}`, storeName: `store${seq}`, purchaseDate, items, refundMethod: 'unknown' };
}

// ---------- 期限 ----------

describe('refundDeadline', () => {
  it('官方範例：11/1 購買，期限是隔年 1/30', () => {
    expect(refundDeadline('2026-11-01')).toBe('2027-01-30');
  });

  it('會正確跨過閏年 2 月', () => {
    expect(refundDeadline('2027-12-15')).toBe('2028-03-14');
  });

  it('格式錯誤或不存在的日期要報錯', () => {
    expect(() => refundDeadline('2026/11/01')).toThrow();
    expect(() => refundDeadline('2026-02-30')).toThrow();
  });
});

describe('daysLeft', () => {
  it('期限當天是 0，隔天是 -1', () => {
    expect(daysLeft('2026-11-01', '2027-01-30')).toBe(0);
    expect(daysLeft('2026-11-01', '2027-01-31')).toBe(-1);
  });

  it('購買當天剩 90 天', () => {
    expect(daysLeft('2026-11-01', '2026-11-01')).toBe(90);
  });
});

describe('todayInJapan', () => {
  it('台灣 11/15 晚上 11:30，日本已經是 11/16', () => {
    // 2026-11-15 15:30 UTC = 台灣 23:30 = 日本隔天 00:30
    expect(todayInJapan(new Date('2026-11-15T15:30:00Z'))).toBe('2026-11-16');
  });

  it('日本白天就是同一天', () => {
    expect(todayInJapan(new Date('2026-11-15T03:00:00Z'))).toBe('2026-11-15');
  });
});

describe('addDays', () => {
  it('可以加負數', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

// ---------- 金額 ----------

describe('itemTax', () => {
  it('10%：含稅 11,000 日圓，稅額 1,000', () => {
    expect(itemTax(item(11000))).toBe(1000);
  });

  it('8%（食品）：含稅 1,080 日圓，稅額 80', () => {
    expect(itemTax(item(1080, { taxRate: 8 }))).toBe(80);
  });

  it('除不盡時捨去小數', () => {
    // 1234 × 10 ÷ 110 = 112.18…
    expect(itemTax(item(1234))).toBe(112);
  });
});

describe('receiptTotals / meetsMinimum', () => {
  it('混合稅率加總正確', () => {
    const r = receipt('2026-11-20', [item(11000), item(1080, { taxRate: 8 })]);
    expect(receiptTotals(r)).toEqual({ inclTax: 12080, exclTax: 11000, tax: 1080 });
  });

  it('含稅 5,500（稅前 5,000）剛好達門檻', () => {
    expect(meetsMinimum(receipt('2026-11-20', [item(5500)]))).toBe(true);
  });

  it('含稅剛好 5,000 未達門檻（稅前只有 4,546）', () => {
    const r = receipt('2026-11-20', [item(5000)]);
    expect(receiptTotals(r).exclTax).toBe(4546);
    expect(meetsMinimum(r)).toBe(false);
  });
});

// ---------- 風險提醒 ----------

describe('getRiskFlags', () => {
  it('正常收據沒有提醒', () => {
    const r = receipt('2026-11-20', [item(11000)]);
    expect(getRiskFlags(r, '2026-11-21', '2026-11-25')).toEqual([]);
  });

  it('沒有品項', () => {
    expect(getRiskFlags(receipt('2026-11-20', []), '2026-11-21')).toEqual(['EMPTY']);
  });

  it('未達門檻＋有消耗品', () => {
    const r = receipt('2026-11-20', [item(3300, { isConsumable: true, taxRate: 8 })]);
    expect(getRiskFlags(r, '2026-11-21')).toEqual(['BELOW_MINIMUM', 'HAS_CONSUMABLE']);
  });

  it('剩 7 天內算快到期', () => {
    const r = receipt('2026-11-01', [item(11000)]);
    expect(getRiskFlags(r, '2027-01-23')).toEqual(['DEADLINE_SOON']);
    expect(getRiskFlags(r, '2027-01-22')).toEqual([]);
  });

  it('過期只標 EXPIRED，不再檢查出境日', () => {
    const r = receipt('2026-11-01', [item(11000)]);
    expect(getRiskFlags(r, '2027-01-31', '2027-02-05')).toEqual(['EXPIRED']);
  });

  it('出境日晚於期限要提醒；剛好期限當天出境沒問題', () => {
    const r = receipt('2026-11-01', [item(11000)]);
    expect(getRiskFlags(r, '2026-11-02', '2027-01-31')).toEqual(['DEPARTS_AFTER_DEADLINE']);
    expect(getRiskFlags(r, '2026-11-02', '2027-01-30')).toEqual([]);
  });
});

// ---------- 資格 ----------

describe('checkEligibility', () => {
  const base = { workingInJapan: false, stayed6MonthsOrMore: false };

  it('短期滞在的外國旅客可以', () => {
    expect(checkEligibility({ ...base, nationality: 'foreign', shortTermVisitor: true })).toBe(
      'eligible',
    );
  });

  it('其他身分的外國人需要自己確認', () => {
    expect(checkEligibility({ ...base, nationality: 'foreign', shortTermVisitor: false })).toBe(
      'needs_check',
    );
  });

  it('在日本工作或入境滿 6 個月不行', () => {
    expect(
      checkEligibility({ ...base, nationality: 'foreign', shortTermVisitor: true, workingInJapan: true }),
    ).toBe('not_eligible');
    expect(
      checkEligibility({
        ...base,
        nationality: 'foreign',
        shortTermVisitor: true,
        stayed6MonthsOrMore: true,
      }),
    ).toBe('not_eligible');
  });

  it('日本籍要在國外住滿 2 年', () => {
    expect(checkEligibility({ ...base, nationality: 'japanese', livedAbroad2Years: true })).toBe(
      'eligible',
    );
    expect(checkEligibility({ ...base, nationality: 'japanese', livedAbroad2Years: false })).toBe(
      'not_eligible',
    );
  });
});

// ---------- 旅程摘要 ----------

describe('sortByDeadline / tripSummary', () => {
  const early = receipt('2026-11-01', [item(11000)]); // 稅 1,000
  const late = receipt('2026-11-10', [item(22000)]); // 稅 2,000
  const small = receipt('2026-11-05', [item(3300)]); // 未達門檻
  const trip: Trip = { receipts: [late, small, early], checklistDone: [] };

  it('最早到期的排前面，且不改動原陣列', () => {
    const sorted = sortByDeadline(trip.receipts);
    expect(sorted.map((r) => r.id)).toEqual([early.id, small.id, late.id]);
    expect(trip.receipts[0].id).toBe(late.id);
  });

  it('只加總未過期且達門檻的收據', () => {
    expect(tripSummary(trip, '2026-11-15')).toEqual({
      receiptCount: 3,
      expiredCount: 0,
      earliestDeadline: '2027-01-30',
      estimatedRefund: 3000,
    });
  });

  it('過期的收據不算進退稅額', () => {
    // 2027-01-31：early 已過期，small 和 late 還沒
    expect(tripSummary(trip, '2027-01-31')).toEqual({
      receiptCount: 3,
      expiredCount: 1,
      earliestDeadline: '2027-02-03',
      estimatedRefund: 2000,
    });
  });

  it('沒有收據時', () => {
    expect(tripSummary({ receipts: [], checklistDone: [] }, '2026-11-15')).toEqual({
      receiptCount: 0,
      expiredCount: 0,
      earliestDeadline: null,
      estimatedRefund: 0,
    });
  });
});
