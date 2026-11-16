import { daysLeft, getRiskFlags, receiptTotals, refundDeadline } from '../domain/rules';
import type { Receipt } from '../domain/types';
import { refundMethodLabels, riskLabels } from '../labels';

interface Props {
  receipt: Receipt;
  today: string;
  departureDate?: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function ReceiptCard({ receipt, today, departureDate, onEdit, onDelete }: Props) {
  const totals = receiptTotals(receipt);
  const left = daysLeft(receipt.purchaseDate, today);
  const flags = getRiskFlags(receipt, today, departureDate);

  return (
    <article className="card receipt">
      <header className="receipt-head">
        <div>
          <h3>{receipt.storeName}</h3>
          <div className="muted small">
            {receipt.purchaseDate} 購買・{refundMethodLabels[receipt.refundMethod]}
          </div>
        </div>
        <div className={`countdown ${left < 0 ? 'expired' : left <= 7 ? 'soon' : ''}`}>
          {left < 0 ? '已過期' : left === 0 ? '今天截止' : `剩 ${left} 天`}
          <div className="small">期限 {refundDeadline(receipt.purchaseDate)}</div>
        </div>
      </header>

      <ul className="item-list">
        {receipt.items.map((item) => (
          <li key={item.id}>
            <span>
              {item.name}
              {item.isConsumable && <span className="tag">消耗品</span>}
            </span>
            <span>¥{item.priceInclTax.toLocaleString()}</span>
          </li>
        ))}
      </ul>

      <div className="receipt-total">
        <span className="muted small">稅前 ¥{totals.exclTax.toLocaleString()}</span>
        <span>預估退 ¥{totals.tax.toLocaleString()}</span>
      </div>

      {flags.length > 0 && (
        <ul className="flags">
          {flags.map((f) => (
            <li key={f} className={`flag ${riskLabels[f].level}`}>
              {riskLabels[f].text}
            </li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button type="button" className="link" onClick={onEdit}>
          編輯
        </button>
        <button
          type="button"
          className="link danger"
          onClick={() => {
            if (window.confirm(`確定刪除「${receipt.storeName}」這張收據？`)) onDelete();
          }}
        >
          刪除
        </button>
      </div>
    </article>
  );
}
