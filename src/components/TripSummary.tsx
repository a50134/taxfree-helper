import type { TripSummary as Summary } from '../domain/rules';

interface Props {
  summary: Summary;
  today: string;
  departureDate?: string;
  onDepartureChange: (date: string) => void;
}

export function TripSummary({ summary, today, departureDate, onDepartureChange }: Props) {
  return (
    <section className="card summary">
      <div className="summary-grid">
        <div>
          <div className="muted">預估可退</div>
          <div className="big">¥{summary.estimatedRefund.toLocaleString()}</div>
        </div>
        <div>
          <div className="muted">最早期限</div>
          <div className="big">{summary.earliestDeadline ?? '—'}</div>
        </div>
      </div>
      <label className="field">
        出境日
        <input
          type="date"
          value={departureDate ?? ''}
          min={today}
          onChange={(e) => onDepartureChange(e.target.value)}
        />
      </label>
      <p className="muted small">
        收據 {summary.receiptCount} 張
        {summary.expiredCount > 0 && `（${summary.expiredCount} 張已過期）`}・今天（日本）{today}
        ・金額為估算，未扣手續費
      </p>
    </section>
  );
}
