import type { Trip } from '../domain/types';
import { emptyTrip } from './tripReducer';

/** 資料格式改版時把 v1 改成 v2，舊資料就不會讓畫面壞掉 */
const KEY = 'taxfree-helper:trip:v1';

/** 讀不到、格式不對、或瀏覽器禁止儲存時，都回傳空的旅程 */
export function loadTrip(storage: Storage | undefined = globalThis.localStorage): Trip {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return emptyTrip;
    const data = JSON.parse(raw) as Partial<Trip>;
    if (!Array.isArray(data.receipts)) return emptyTrip;
    return {
      departureDate: typeof data.departureDate === 'string' ? data.departureDate : undefined,
      receipts: data.receipts,
      checklistDone: Array.isArray(data.checklistDone) ? data.checklistDone : [],
    };
  } catch {
    return emptyTrip;
  }
}

export function saveTrip(trip: Trip, storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(KEY, JSON.stringify(trip));
  } catch {
    // 無痕模式或空間不足時存不了，畫面照常運作
  }
}
