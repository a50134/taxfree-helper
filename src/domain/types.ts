/** 消費稅稅率：用百分比整數（10、8），避免小數運算誤差 */
export type TaxRate = 10 | 8;

export type RefundMethod = 'cash' | 'bank' | 'card' | 'app' | 'unknown';

export interface Item {
  id: string;
  name: string;
  /** 日圓，含稅價 */
  priceInclTax: number;
  taxRate: TaxRate;
  /** 食品、化妝品等消耗品：在日本用掉就不能退稅 */
  isConsumable: boolean;
}

export interface Receipt {
  id: string;
  storeName: string;
  /** YYYY-MM-DD，以日本日期為準 */
  purchaseDate: string;
  items: Item[];
  refundMethod: RefundMethod;
}

export interface Trip {
  /** YYYY-MM-DD，出境日 */
  departureDate?: string;
  receipts: Receipt[];
  checklistDone: string[];
}
