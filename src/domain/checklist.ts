import { daysBetween, refundDeadline } from './rules';
import type { Trip } from './types';

export interface ChecklistItem {
  id: string;
  text: string;
  detail?: string;
  /** 跟目前資料有關、特別要注意的項目 */
  important?: boolean;
}

/**
 * 依旅程內容產生出境前檢查清單（純函式）。
 * 規則來源：観光庁「旅行者向け よくある質問（リファンド方式）」
 * id 要固定，勾選紀錄才對得上。
 */
export function buildChecklist(trip: Trip): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const hasConsumable = trip.receipts.some((r) => r.items.some((i) => i.isConsumable));

  if (trip.departureDate) {
    const late = trip.receipts.filter(
      (r) => daysBetween(refundDeadline(r.purchaseDate), trip.departureDate!) > 0,
    );
    if (late.length > 0) {
      items.push({
        id: 'late-receipts',
        text: `有 ${late.length} 張收據的期限早於出境日`,
        detail: '這幾張出境時已過 90 天期限，退不到稅，就不用特地留著商品給海關看。',
        important: true,
      });
    }
  }

  items.push(
    {
      id: 'carry-on',
      text: '退稅品全部放進隨身行李',
      detail: '出境時要能拿出來給海關看，不要放進托運行李。',
    },
    {
      id: 'kiosk-before-checkin',
      text: '先到免稅手續機器辦理，再去托運行李',
      detail: '機器設在托運櫃台之前的國際線出發大廳。行李托運後就不能辦，也拿不到退款。',
      important: true,
    },
    {
      id: 'passport',
      text: '帶著購物時出示的那本護照',
      detail: '要讓機器讀取護照。',
    },
    {
      id: 'same-receipt',
      text: '同一張收據的商品全部都在',
      detail: '海關以一張收據為單位確認，少一件，整張收據的商品都不能退。',
    },
  );

  if (hasConsumable) {
    items.push({
      id: 'consumables',
      text: '消耗品沒有拆開使用',
      detail:
        '食品、化妝品在日本用掉就不能退。如果已經用掉一部分，不要用機器辦理，直接到海關窗口說明。',
      important: true,
    });
  }

  items.push({
    id: 'keep-receipts',
    text: '收據留到退款入帳為止',
    detail: '海關不一定要看收據，但退款若有問題時用得到。',
  });

  return items;
}
