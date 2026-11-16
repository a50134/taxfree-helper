import { useRef, useState } from 'react';
import { scanReceipt } from '../ocr/scanReceipt';

interface Props {
  onScanned: (text: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': '準備辨識程式',
  'loading language traineddata': '下載日文辨識資料（第一次比較久）',
  'initializing api': '準備中',
  'recognizing text': '辨識文字中',
};

export function ScanButton({ onScanned }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    setStatus('準備中');
    setProgress(0);
    try {
      const text = await scanReceipt(file, (s, p) => {
        setStatus(STATUS_LABELS[s] ?? '處理中');
        setProgress(p);
      });
      onScanned(text);
    } catch {
      setError('辨識失敗，請確認網路連線後再試，或改用手動新增。');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = ''; // 同一張照片可以再選一次
    }
  }

  return (
    <div className="scan">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button type="button" className="add" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? '辨識中…' : '📷 拍收據自動填入'}
      </button>
      {busy && (
        <div className="scan-status">
          <div className="progress" aria-hidden="true">
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <span className="muted small">{status}</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <p className="muted small scan-tip">平放、光線充足、整張入鏡最準。照片只在手機上辨識，不會上傳。</p>
    </div>
  );
}
