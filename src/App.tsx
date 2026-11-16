import { useState } from 'react';
import { DepartureChecklist } from './components/DepartureChecklist';
import { ReceiptCard } from './components/ReceiptCard';
import { ReceiptForm } from './components/ReceiptForm';
import { ScanButton } from './components/ScanButton';
import { TripSummary } from './components/TripSummary';
import { buildChecklist } from './domain/checklist';
import { parseReceiptText } from './domain/receiptParser';
import { sortByDeadline, todayInJapan, tripSummary } from './domain/rules';
import type { Receipt } from './domain/types';
import { useTrip } from './store/useTrip';

type Editing =
  | null
  | { mode: 'new'; draft?: Receipt; scan?: { text: string; total?: number } }
  | { mode: 'edit'; receipt: Receipt };

export default function App() {
  const { trip, dispatch } = useTrip();
  const [editing, setEditing] = useState<Editing>(null);
  const today = todayInJapan();
  const summary = tripSummary(trip, today);

  function handleSave(receipt: Receipt) {
    dispatch({ type: editing?.mode === 'edit' ? 'updateReceipt' : 'addReceipt', receipt });
    setEditing(null);
  }

  return (
    <main className="container">
      <h1>日本免稅退稅小幫手</h1>

      <TripSummary
        summary={summary}
        today={today}
        departureDate={trip.departureDate}
        onDepartureChange={(date) => dispatch({ type: 'setDeparture', date })}
      />

      {editing ? (
        <ReceiptForm
          key={editing.mode === 'edit' ? editing.receipt.id : (editing.draft?.id ?? 'new')}
          today={today}
          title={editing.mode === 'edit' ? '編輯收據' : editing.scan ? '核對掃描結果' : '新增收據'}
          initial={editing.mode === 'edit' ? editing.receipt : editing.draft}
          scan={editing.mode === 'new' ? editing.scan : undefined}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <>
          <ScanButton onScanned={(text) => setEditing(draftFromScan(text, today))} />
          <button type="button" className="add secondary" onClick={() => setEditing({ mode: 'new' })}>
            ＋ 手動新增收據
          </button>
        </>
      )}

      {trip.receipts.length === 0 && !editing && (
        <p className="muted empty">還沒有收據。每在免稅店結帳一次，就新增一張。</p>
      )}

      {sortByDeadline(trip.receipts).map((r) => (
        <ReceiptCard
          key={r.id}
          receipt={r}
          today={today}
          departureDate={trip.departureDate}
          onEdit={() => setEditing({ mode: 'edit', receipt: r })}
          onDelete={() => dispatch({ type: 'deleteReceipt', id: r.id })}
        />
      ))}

      {trip.receipts.length > 0 && (
        <DepartureChecklist
          items={buildChecklist(trip)}
          done={trip.checklistDone}
          onToggle={(id) => dispatch({ type: 'toggleChecklist', id })}
          onReset={() => dispatch({ type: 'resetChecklist' })}
        />
      )}

      <footer className="muted small">
        資料只存在這台裝置的瀏覽器，不會上傳。金額與期限僅供參考，以観光庁、国税庁官方公告為準。
      </footer>
    </main>
  );
}

/** 把掃描文字轉成「尚未儲存」的收據草稿 */
function draftFromScan(text: string, today: string): Editing {
  const parsed = parseReceiptText(text);
  const draft: Receipt = {
    id: crypto.randomUUID(),
    storeName: parsed.storeName ?? '',
    purchaseDate: parsed.purchaseDate ?? today,
    refundMethod: 'unknown',
    items: parsed.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      isConsumable: false,
    })),
  };
  return { mode: 'new', draft, scan: { text, total: parsed.total } };
}
