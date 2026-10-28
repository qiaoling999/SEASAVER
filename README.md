# SEA SAVER — VS Code Starter

這個版本只是把原本單一 HTML 拆開，**沒有刻意重寫遊戲規則**。

## 專案結構

- `index.html`：網頁結構
- `css/style.css`：畫面、棋盤、按鈕、動畫等樣式
- `js/script.js`：遊戲邏輯與互動
- `assets/map/ocean_board.png`：海洋棋盤底圖
- `assets/home/sea_saver_home.png`：首頁主視覺

## 在 VS Code 開啟

1. 解壓縮整個 `SEA_SAVER_VSCode_Starter` 資料夾。
2. 開啟 VS Code。
3. 選「File / 檔案 → Open Folder / 開啟資料夾」。
4. 選擇整個 `SEA_SAVER_VSCode_Starter` 資料夾。
5. 開啟 `index.html`。
6. 建議使用 Live Server 類型的本機伺服器來預覽；若暫時不裝，也可先直接用瀏覽器開啟 `index.html` 測試。

## 目前先記住

- 改文字與 HTML 結構 → `index.html`
- 改顏色、大小、排版、Hover → `css/style.css`
- 改關卡規則、RUN、移動、預判 → `js/script.js`
- 換圖片 → `assets/`

## 暫時不要做

先不要大幅重構 `script.js`，也不要一次拆很多 JS 檔。
第一階段目標只有一個：確認「拆開後功能跟原版一樣」。
