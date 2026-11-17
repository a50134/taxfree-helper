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

/** 退款方式的差別。能用哪幾種、手續費多少，由各店或代辦業者決定 */
export const refundMethodHints: Record<RefundMethod, string> = {
  unknown: '結帳時店員會請你選，可以先問清楚手續費。',
  cash: '出境時在機場領日圓現金，最快拿到；但可能要排隊，有些店會收手續費。',
  card: '退回刷卡的那張信用卡，不用排隊；入帳通常要等一段時間。',
  bank: '匯到你指定的銀行帳戶；海外帳戶可能有匯款手續費。',
  app: '透過店家指定的 App 或線上服務領取，要先註冊。',
};
