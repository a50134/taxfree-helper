import { describe, expect, it } from 'vitest';
import { buildChecklist } from './checklist';
import type { Receipt, Trip } from './types';

const receipt = (purchaseDate: string, isConsumable = false): Receipt => ({
  id: purchaseDate,
  storeName: 's',
  purchaseDate,
  refundMethod: 'unknown',
  items: [{ id: 'i', name: 'x', priceInclTax: 11000, taxRate: 10, isConsumable }],
});
const ids = (trip: Trip) => buildChecklist(trip).map((i) => i.id);

describe('buildChecklist', () => {
  it('基本項目都在，順序固定', () => {
    expect(ids({ receipts: [receipt('2026-11-20')], checklistDone: [] })).toEqual([
      'carry-on',
      'kiosk-before-checkin',
      'passport',
      'same-receipt',
      'keep-receipts',
    ]);
  });

  it('有消耗品才出現消耗品提醒', () => {
    expect(ids({ receipts: [receipt('2026-11-20', true)], checklistDone: [] })).toContain(
      'consumables',
    );
  });

  it('出境日晚於期限時，最上面提醒有幾張退不到', () => {
    const trip: Trip = {
      departureDate: '2027-01-31',
      receipts: [receipt('2026-11-01'), receipt('2026-11-20')],
      checklistDone: [],
    };
    const first = buildChecklist(trip)[0];
    expect(first.id).toBe('late-receipts');
    expect(first.text).toContain('1 張');
  });

  it('期限當天出境不算太晚', () => {
    const trip: Trip = { departureDate: '2027-01-30', receipts: [receipt('2026-11-01')], checklistDone: [] };
    expect(ids(trip)).not.toContain('late-receipts');
  });
});
