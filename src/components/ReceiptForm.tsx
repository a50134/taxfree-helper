import { useState, type FormEvent } from 'react';
import type { Item, Receipt, RefundMethod, TaxRate } from '../domain/types';
import { refundMethodLabels } from '../labels';

interface Props {
  today: string;
  /** 預先填好的內容（編輯或掃描結果） */
  initial?: Receipt;
  title: string;
  /** 掃描來的原始文字和合計，給使用者核對用 */
  scan?: { text: string; total?: number };
  onSave: (receipt: Receipt) => void;
  onCancel: () => void;
}

/** 表單裡的金額先用字串存，送出時才轉數字，使用者打字比較順 */
interface ItemDraft {
  id: string;
  name: string;
  price: string;
  taxRate: TaxRate;
  isConsumable: boolean;
}

const newId = () => crypto.randomUUID();
const blankItem = (): ItemDraft => ({
  id: newId(),
  name: '',
  price: '',
  taxRate: 10,
  isConsumable: false,
});

export function ReceiptForm({ today, initial, title, scan, onSave, onCancel }: Props) {
  const [storeName, setStoreName] = useState(initial?.storeName ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? today);
  const [refundMethod, setRefundMethod] = useState<RefundMethod>(initial?.refundMethod ?? 'unknown');
  const [items, setItems] = useState<ItemDraft[]>(
    initial?.items.map((i) => ({ ...i, price: String(i.priceInclTax) })) ?? [blankItem()],
  );
  const [error, setError] = useState('');

  const updateItem = (id: string, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!storeName.trim()) return setError('請填店名');
    if (!purchaseDate) return setError('請選購買日');

    const parsed: Item[] = [];
    for (const d of items) {
      if (!d.name.trim() && !d.price) continue; // 整列空白就略過
      const price = Number(d.price);
      if (!Number.isInteger(price) || price <= 0) {
        return setError(`「${d.name || '未命名品項'}」的金額要是正整數（日圓）`);
      }
      parsed.push({
        id: d.id,
        name: d.name.trim() || '未命名品項',
        priceInclTax: price,
        taxRate: d.taxRate,
        isConsumable: d.isConsumable,
      });
    }
    if (parsed.length === 0) return setError('至少要有一個品項');

    onSave({
      id: initial?.id ?? newId(),
      storeName: storeName.trim(),
      purchaseDate,
      refundMethod,
      items: parsed,
    });
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{title}</h2>
      {scan && (
        <div className="scan-notice">
          <p>
            已從照片填入，<strong>請逐項核對</strong>，辨識常會讀錯數字。
            {scan.total !== undefined && (
              <>
                {' '}收據合計 ¥{scan.total.toLocaleString()}，品項加總 ¥
                {items.reduce((sum, i) => sum + (Number(i.price) || 0), 0).toLocaleString()}
                {items.reduce((sum, i) => sum + (Number(i.price) || 0), 0) === scan.total
                  ? '，一致 ✓'
                  : '，不一致，請檢查'}
              </>
            )}
          </p>
          <details>
            <summary>看辨識原文</summary>
            <pre>{scan.text}</pre>
          </details>
        </div>
      )}
      <p className="muted small">一張收據填一筆。同一張收據的商品，出境時要全部帶著。</p>

      <label className="field">
        店名
        <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="例：松本清 心齋橋店" />
      </label>
      <div className="row">
        <label className="field">
          購買日
          <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </label>
        <label className="field">
          退款方式
          <select value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as RefundMethod)}>
            {Object.entries(refundMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="items">
        <legend>品項（含稅價）</legend>
        {items.map((d) => (
          <div className="item-row" key={d.id}>
            <input
              aria-label="品名"
              placeholder="品名"
              value={d.name}
              onChange={(e) => updateItem(d.id, { name: e.target.value })}
            />
            <input
              aria-label="含稅金額"
              placeholder="¥ 含稅"
              inputMode="numeric"
              value={d.price}
              onChange={(e) => updateItem(d.id, { price: e.target.value.replace(/[^\d]/g, '') })}
            />
            <select
              aria-label="稅率"
              value={d.taxRate}
              onChange={(e) => updateItem(d.id, { taxRate: Number(e.target.value) as TaxRate })}
            >
              <option value={10}>10%</option>
              <option value={8}>8% 食品</option>
            </select>
            <label className="check">
              <input
                type="checkbox"
                checked={d.isConsumable}
                onChange={(e) => updateItem(d.id, { isConsumable: e.target.checked })}
              />
              消耗品
            </label>
            {items.length > 1 && (
              <button
                type="button"
                className="link danger"
                onClick={() => setItems((list) => list.filter((i) => i.id !== d.id))}
              >
                刪除
              </button>
            )}
          </div>
        ))}
        <button type="button" className="link" onClick={() => setItems((list) => [...list, blankItem()])}>
          ＋ 再加一個品項
        </button>
      </fieldset>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="button" className="secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit">儲存</button>
      </div>
    </form>
  );
}
