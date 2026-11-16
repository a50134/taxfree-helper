import { describe, expect, it } from 'vitest';
import { parseReceiptText } from './receiptParser';

const drugstore = `
マツモトキヨシ 心斎橋店
〒542-0085 大阪市中央区心斎橋筋
TEL 06-0000-0000
2026年11月16日(月) 14:32 レジ0003
ハダラボ 化粧水        ¥1,980
ロキソニンS            ¥1,078
※ポッキー 2個           ¥396
小計                   ¥3,454
(10%対象 ¥3,058)
(8%対象 ¥396)
合計                   ¥3,454
お預り                 ¥5,000
お釣り                 ¥1,546
※は軽減税率対象商品です
`;

describe('parseReceiptText', () => {
  it('讀出店名、日期、品項和合計', () => {
    const r = parseReceiptText(drugstore);
    expect(r.storeName).toBe('マツモトキヨシ 心斎橋店');
    expect(r.purchaseDate).toBe('2026-11-16');
    expect(r.total).toBe(3454);
    expect(r.items).toEqual([
      { name: 'ハダラボ 化粧水', priceInclTax: 1980, taxRate: 10 },
      { name: 'ロキソニンS', priceInclTax: 1078, taxRate: 10 },
      { name: 'ポッキー', priceInclTax: 396, taxRate: 8 },
    ]);
  });

  it('全形數字、￥、円都能讀', () => {
    const r = parseReceiptText('ビックカメラ\n２０２６／１１／２０\nイヤホン　１２，８００円\n合計 ￥１２，８００');
    expect(r.purchaseDate).toBe('2026-11-20');
    expect(r.items).toEqual([{ name: 'イヤホン', priceInclTax: 12800, taxRate: 10 }]);
    expect(r.total).toBe(12800);
  });

  it('令和年號換算成西元', () => {
    expect(parseReceiptText('店\n令和8年11月3日').purchaseDate).toBe('2026-11-03');
    expect(parseReceiptText('店\nR8.12.01 10:00').purchaseDate).toBe('2026-12-01');
  });

  it('沒有軽減税率說明時，※ 不會被當成 8%', () => {
    const r = parseReceiptText('店\n※特価 Tシャツ ¥2,990');
    expect(r.items[0]).toEqual({ name: '特価 Tシャツ', priceInclTax: 2990, taxRate: 10 });
  });

  it('讀不到東西時回傳空結果，不會出錯', () => {
    expect(parseReceiptText('')).toEqual({
      storeName: undefined,
      purchaseDate: undefined,
      items: [],
      total: undefined,
    });
  });
});
