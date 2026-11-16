import { useState } from 'react';
import { DepartureChecklist } from './components/DepartureChecklist';
import { ReceiptCard } from './components/ReceiptCard';
import { ReceiptForm } from './components/ReceiptForm';
import { TripSummary } from './components/TripSummary';
import { buildChecklist } from './domain/checklist';
import { sortByDeadline, todayInJapan, tripSummary } from './domain/rules';
import type { Receipt } from './domain/types';
import { useTrip } from './store/useTrip';

/** null = 不顯示表單；'new' = 新增；Receipt = 編輯這張 */
type Editing = null | 'new' | Receipt;

export default function App() {
  const { trip, dispatch } = useTrip();
  const [editing, setEditing] = useState<Editing>(null);
  const today = todayInJapan();
  const summary = tripSummary(trip, today);

  function handleSave(receipt: Receipt) {
    dispatch({ type: editing === 'new' ? 'addReceipt' : 'updateReceipt', receipt });
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
          key={editing === 'new' ? 'new' : editing.id}
          today={today}
          initial={editing === 'new' ? undefined : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button type="button" className="add" onClick={() => setEditing('new')}>
          ＋ 新增收據
        </button>
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
          onEdit={() => setEditing(r)}
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
