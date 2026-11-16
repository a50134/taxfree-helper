# 日本免稅退稅小幫手

## 第一次執行
```
npm install
npm run dev     # 開發伺服器
npm test        # 跑測試
npm run build   # 型別檢查＋打包
```

## 結構
- `src/domain/rules.ts`：規則與計算（純函式，規則數字集中在 `RULES`）
- `src/domain/rules.test.ts`：測試
- `src/domain/types.ts`：資料型別
- `src/App.tsx`：目前是示範畫面，下一步做收據表單與 localStorage
