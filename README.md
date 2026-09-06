# Google 登入的幕後｜氛圍學院互動教學 Demo

一個可嵌入課程的互動教學元件：從手機上的 **Continue with Google** 出發，同時觀察瀏覽器、Backend、Google Identity 與 Users DB 如何完成登入。

視覺參考使用者提供的氛圍學院課程截圖。這是應徵作品的獨立教學模擬，並非氛圍學院正式產品。

## 本機開發

使用 Node.js 22.12+ 與 npm。

```sh
npm ci
npm run dev
```

開啟終端機輸出的 localhost 網址。其他指令：

```sh
npm test
npm run typecheck
npm run build
npm run preview
npm run format:check
```

## 操作方式

1. 在手機內按 **Continue with Google**。
2. 在模擬 Google 畫面確認帳號，或取消返回。
3. Google 確認身分、Backend 收到 Code 時，各停留 **2 秒**；其他流程自動執行。
4. 用播放控制暫停，或直接點系統節點、移動封包、固定資料標籤，檢查當下資訊。關閉檢查後按播放續行。
5. 點 **AUTH.LOG** 回看事件快照；按「回到目前進度」回到原本暫停的位置。回看不修改會員、不重跑事件。
6. 登入完成後按「登出，再試一次」，觀察同一個 Google 身份直接找到 **user 42**。
7. 「重設示範」或重新整理會清空本次模擬會員。

切換到背景分頁會暫停，返回後需自行續行。減少動態效果模式以固定封包與路徑高亮取代移動，仍保留相同流程。

## 教學模型與簡化

示範 **OpenID Connect 的後端 Authorization Code 登入流程**，不是所有 Google 登入整合方式的通用時序。

- 登入請求由 Backend 準備，Browser 前往 Google。
- 本例假設使用者已登入 Google；帳號確認畫面是教學模擬，不是 Google 真實 UI。
- Google 的一次性 Code 經瀏覽器送至 Backend，Backend 再直接向 Google 交換 ID Token。
- 展示取得憑證、驗證憑證、對應會員與建立 App 登入狀態的區別。
- 以 Google 的穩定識別碼 `sub` 對應會員，Email 僅作顯示資訊。
- 首次登入自動建立會員是本例 App 的產品選擇，不代表所有產品皆不需要額外註冊資料。
- 僅展示當步需要的欄位。真實流程的 state、nonce、PKCE、client authentication、access token、憑證簽章驗證及 session cookie 等並未完整實作；不可將此模擬器當成正式身份驗證程式使用。
- 全部資料、Code、身份與 DB 均為前端記憶體中的虛構資料。沒有 API、OAuth 金鑰、真實帳密、追蹤分析或永久儲存。介面字型透過 Google Fonts 載入，失敗時使用系統字型。

技術參考：[Google OpenID Connect 文件](https://developers.google.com/identity/openid-connect/openid-connect)。

## 程式架構

| 檔案                      | 職責                                                                              |
| ------------------------- | --------------------------------------------------------------------------------- |
| `src/flow.ts`             | 純 reducer、登入流程階段、事件快照、首次／再次登入分支                            |
| `src/useFlow.ts`          | 統一 requestAnimationFrame 時鐘、暫停與背景分頁處理                               |
| `src/AuthDemo.tsx`        | AuthDemo、PhonePreview、SystemMap、DataFlow、Inspector、PlaybackControls、AuthLog |
| `src/AuthDemo.module.css` | 元件版面、手機模擬、系統面板及 1024px 以下響應式排列                              |
| `src/global.css`          | 共用視覺變數、字型、鍵盤焦點、減少動態效果規則                                    |

`AuthDemo` 不需要 props，可以嵌入其他 React 頁面。所有狀態局限在元件內，不使用全域資料儲存。

`run` 與 `stage` 同時作為計時事件的識別：舊流程或舊階段的回呼無法推進新流程。業務狀態和回看的唯讀快照分開；快照不包含可寫的會員物件。所有封包位置都由目前階段的同一個 elapsed 時間決定。

資料路徑以 ResizeObserver 讀取實際 DOM 節點位置，SVG 路徑會隨桌面／手機排列重算。

## 驗證

Vitest 與 React Testing Library 覆蓋：

- 首次註冊及第二次找到既有會員。
- Google 確認／Code 抵達的精確 2 秒停留。
- 暫停後保留剩餘時間、等待使用者的階段不被計時跳過。
- 取消、快速連點、資料檢查、回看快照與完整重設。
- 重設後拒絕舊計時事件，背景分頁暫停。
- 透過實際 React 按鈕走完首次與再次登入。

瀏覽器人工驗收應在 390px、768px、1440px 檢查溢出、封包位置、文字可讀性、鍵盤操作及減少動態效果。jsdom 測試不會驗證真實排版或 SVG 路徑幾何。

## 部署至 Vercel

此專案為 Vite 靜態網站，設定已在 `vercel.json` 中：

- Framework：Vite
- Build command：`npm run build`
- Output directory：`dist`
- Environment variables：無

在 Vercel 匯入此 Git repository，或在本機完成帳號登入後執行：

```sh
vercel login
vercel --prod
```

將正式網域設為訪客可直接開啟。部署後以未登入 Vercel 的視窗，驗證完整登入、第二次登入及重新整理。不要將需要 Deployment Protection 登入的預覽網址當作交付網址。
