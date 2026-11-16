import { describe, expect, it } from 'vitest';
import type { Receipt } from '../domain/types';
import { loadTrip, saveTrip } from './storage';
import { emptyTrip, tripReducer } from './tripReducer';

const r1: Receipt = {
  id: 'r1',
  storeName: 'A',
  purchaseDate: '2026-11-20',
  refundMethod: 'unknown',
  items: [{ id: 'i1', name: 'x', priceInclTax: 11000, taxRate: 10, isConsumable: false }],
};

/** 測試用的假 localStorage */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('tripReducer', () => {
  it('新增、修改、刪除收據', () => {
    let s = tripReducer(emptyTrip, { type: 'addReceipt', receipt: r1 });
    expect(s.receipts).toHaveLength(1);
    s = tripReducer(s, { type: 'updateReceipt', receipt: { ...r1, storeName: 'B' } });
    expect(s.receipts[0].storeName).toBe('B');
    s = tripReducer(s, { type: 'deleteReceipt', id: 'r1' });
    expect(s.receipts).toHaveLength(0);
  });

  it('出境日清空時變成 undefined', () => {
    const s = tripReducer(emptyTrip, { type: 'setDeparture', date: '2026-11-25' });
    expect(s.departureDate).toBe('2026-11-25');
    expect(tripReducer(s, { type: 'setDeparture', date: '' }).departureDate).toBeUndefined();
  });
});

describe('checklist actions', () => {
  it('勾選、取消勾選、全部重設', () => {
    let s = tripReducer(emptyTrip, { type: 'toggleChecklist', id: 'passport' });
    expect(s.checklistDone).toEqual(['passport']);
    s = tripReducer(s, { type: 'toggleChecklist', id: 'carry-on' });
    s = tripReducer(s, { type: 'toggleChecklist', id: 'passport' });
    expect(s.checklistDone).toEqual(['carry-on']);
    expect(tripReducer(s, { type: 'resetChecklist' }).checklistDone).toEqual([]);
  });
});

describe('storage', () => {
  it('存進去再讀出來一樣', () => {
    const storage = memoryStorage();
    const trip = { ...emptyTrip, receipts: [r1], departureDate: '2026-11-25' };
    saveTrip(trip, storage);
    expect(loadTrip(storage)).toEqual(trip);
  });

  it('沒資料或資料壞掉時回傳空旅程', () => {
    expect(loadTrip(memoryStorage())).toEqual(emptyTrip);
    expect(loadTrip(memoryStorage({ 'taxfree-helper:trip:v1': '{壞掉' }))).toEqual(emptyTrip);
    expect(loadTrip(memoryStorage({ 'taxfree-helper:trip:v1': '{"receipts":"x"}' }))).toEqual(
      emptyTrip,
    );
  });

  it('沒有 localStorage 也不會出錯', () => {
    expect(loadTrip(undefined)).toEqual(emptyTrip);
    expect(() => saveTrip(emptyTrip, undefined)).not.toThrow();
  });
});
