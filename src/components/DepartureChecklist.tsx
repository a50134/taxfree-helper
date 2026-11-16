import type { ChecklistItem } from '../domain/checklist';

interface Props {
  items: ChecklistItem[];
  done: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
}

export function DepartureChecklist({ items, done, onToggle, onReset }: Props) {
  const doneCount = items.filter((i) => done.includes(i.id)).length;
  const allDone = doneCount === items.length;

  return (
    <section className="card checklist">
      <header className="checklist-head">
        <h2>出境前檢查清單</h2>
        <span className={allDone ? 'ok' : 'muted'}>
          {doneCount} / {items.length}
        </span>
      </header>
      <div className="progress" aria-hidden="true">
        <div style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>

      <ul className="check-list">
        {items.map((item) => {
          const checked = done.includes(item.id);
          return (
            <li key={item.id} className={item.important ? 'important' : undefined}>
              <label>
                <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} />
                <span className={checked ? 'checked' : undefined}>
                  {item.text}
                  {item.detail && <span className="muted small detail">{item.detail}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {allDone && <p className="ok">都準備好了，一路順風！</p>}
      {doneCount > 0 && (
        <div className="actions">
          <button type="button" className="link" onClick={onReset}>
            全部取消勾選
          </button>
        </div>
      )}
    </section>
  );
}
