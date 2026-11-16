export type ScanProgress = (status: string, progress: number) => void;

/** 長邊縮到這個大小再辨識：手機照片太大會很慢，太小會讀不到字 */
const MAX_SIDE = 2000;

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.9));
}

/**
 * 在瀏覽器裡辨識收據照片的文字，照片不會上傳。
 * 第一次使用時會下載日文辨識資料（之後瀏覽器會快取）。
 * tesseract.js 用動態載入，沒用到掃描功能的人不用下載它。
 */
export async function scanReceipt(file: File, onProgress?: ScanProgress): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const image = await downscale(file);
  const worker = await createWorker('jpn', undefined, {
    logger: (m) => onProgress?.(m.status, m.progress),
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
