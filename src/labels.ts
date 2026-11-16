import type { RiskFlag } from './domain/rules';
import type { RefundMethod } from './domain/types';

/** 之後做多語言時，把這裡換成 i18n 字典 */
export const riskLabels: Record<RiskFlag, { text: string; level: 'danger' | 'warn' }> = {
  EMPTY: { text: '還沒加品項', level: 'warn' },
  BELOW_MINIMUM: { text: '稅前未滿 ¥5,000，可能不能退', level: 'danger' },
  HAS_CONSUMABLE: { text: '有消耗品：在日本用掉一件，整張收據都不能退', level: 'warn' },
  EXPIRED: { text: '已超過 90 天期限', level: 'danger' },
  DEADLINE_SOON: { text: '7 天內到期', level: 'warn' },
  DEPARTS_AFTER_DEADLINE: { text: '出境日晚於期限，這張會退不到', level: 'danger' },
};

export const refundMethodLabels: Record<RefundMethod, string> = {
  unknown: '還不確定',
  cash: '機場現金',
  card: '退到信用卡',
  bank: '銀行轉帳',
  app: 'App',
};
