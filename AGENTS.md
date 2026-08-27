# AGENTS.md — 給接手的 AI 開發代理人看

這份文件補充 `README.md`（環境變數、部署、快速開始），專門記錄**這個
codebase 裡不直觀、容易踩坑的地方**，避免重新踩一次已經修過的問題。

## 專案結構速覽

- `shared/schema.ts` — 唯一的資料表定義來源（Drizzle ORM）。改資料表**一定先改這裡**，
  再跑 `npm run db:generate` 產生 migration。所有資料表都在獨立的 `webinar` Postgres schema
  底下（見 `webinarDbSchema`），可以安全跟其他系統共用同一個資料庫。
- `server/routes.ts` — 所有 API 路由，單一大檔案（原始架構如此，沒有拆分成多個 router）。
- `server/storage.ts` — 資料庫存取層（`IStorage` 介面 + Drizzle 實作），路由不應直接寫 SQL。
- `server/aiGenerator.ts` / `server/aiAssistant.ts` — AI 一鍵生成互動 / AI 助教回覆，
  都呼叫 `server/anthropic.ts` 的共用 client。
- `client/src/pages/admin-webinar-detail.tsx` — 後台單一直播間管理頁，**非常大**
  （所有分頁：排程/通知/互動/聊天/報名/分析/設定/AI助教 都在同一個檔案的不同 Tab），
  改動前務必先用 grep 定位到正確的 Tab 區塊，不要整檔重寫。
- `client/public/livecast-widget.js` — 給外部網站嵌入用的原生 JS（無框架），
  跟 `client/src/pages/embed-*.tsx` 之間用 `postMessage` 溝通（例如自動回報高度）。

## 排程模式是三個「應該互斥、實際上不會自動互斥」的旗標——最容易重複踩的坑

一個 webinar 的「什麼時候有場次」由三組獨立欄位決定，`GET /api/webinars/:id/available-sessions`
依序判斷（**第一個符合條件的就回傳，後面的完全不會執行**）：

1. `webinar.recurringSchedule.enabled`（+ `days`/`times`）→ 循環排程，動態算出未來場次
2. `webinar.scheduleMode.onDemand` → 隨選觀看
3. `webinar.scheduleMode.justInTime` → 即時開始（每個訪客各自的倒數計時）
4. 以上皆非 → 讀 `webinar_sessions` 資料表的實際場次列（後台「場次管理」手動建立的）

**這三個旗標分別由後台三個不同分頁的三個不同「儲存」按鈕各自 PATCH**，
如果某個儲存按鈕只設定自己負責的旗標為 `true`、卻沒有把另外兩個明確設回 `false`，
就會出現「兩個模式同時是 true，畫面上卻只看得到優先權較高的那個，另一個在資料庫裡
悄悄殘留、介面上完全沒有跡象」——這個 bug 在同一個 session 內出現過兩次
（`recurringSchedule.enabled` 開了關不掉、`scheduleMode.justInTime` 殘留蓋過一般排程設定）。

**修改任何一個排程相關的儲存/PATCH 邏輯時，務必確認它有把另外兩組旗標明確重置**，
不要只 assume「使用者現在存的這個分頁就是唯一有效的設定」。

## 報名信箱驗證（`POST /api/registrations`）

公開報名頁（`registration.tsx` / `embed-register.tsx`）送出的報名**預設需要信箱驗證**
才算完成（`emailVerified: false` + 寄驗證信，不會馬上寄提醒信序列，也不會在回應裡
給前端顯示「進入直播間」按鈕）。唯一例外是 `source === "course-platform"`
（已登入使用者透過課程平台一鍵報名，Email 視同已由會員系統驗證過，直接
`emailVerified: true`，行為維持原本「報名後立即可進場」）。

新增其他「信任來源」時，請比照 `trustedSource` 的判斷方式擴充，
不要繞過 `insertRegistrationSchema` 直接讓外部呼叫端自行設定 `emailVerified`
（該欄位已從 Zod 的公開輸入 schema 中 `omit`，這是刻意的安全邊界，不要移除）。

## AI 生成失敗時，一定要看得到「為什麼」

`aiGenerator.ts` / `aiAssistant.ts` 呼叫 Anthropic API 後，如果回應解析失敗
（JSON 格式不對、或被 `max_tokens` 截斷），**務必 `console.error` 記錄原始回應內容**
（`parseJson` 已內建這個機制）。曾經發生「金鑰有效、Anthropic 帳號有扣款，
但功能仍回報失敗」，結果是回應解析失敗被靜默吞掉、Render Logs 完全查不到原因，
排查花了很長時間。新增任何呼叫 Anthropic API 的路徑，都要延續這個「解析失敗必留痕跡」
的習慣，不要只 `return null`。

## CTA 按鈕的 `endTime`

`webinar-room.tsx` 只會顯示「時間區間有重疊時最近觸發的一個」CTA（不是全部疊加顯示）。
AI 一鍵生成的 CTA 會自動計算 `endTime`（觸發後 120 秒、且不晚於下一個 CTA 開始時間），
確保彼此不重疊。手動在後台新增 CTA 時如果留空結束時間，會一路顯示到影片結束——
這是預期行為，不是 bug，只是提醒：多個「結束時間留空」的 CTA 疊在同一段時間內，
畫面上仍然只會顯示其中一個。

## 沒有自動化測試——驗證方式是本機起一個拋棄式 Postgres 跑真實流程

這個 repo 目前沒有 test suite。過去驗證重大改動（信箱驗證流程、CTA 不重疊、
出席追蹤等）的方式都是：本機起一個乾淨的 PostgreSQL、`npm run db:push` 建表、
`npm run dev` 起服務、用 `curl` 實際打 API 走一次完整流程（含資料庫查詢核對欄位值），
而不是只看 `npm run check`（TypeScript 檢查）通過就假設邏輯正確。改動報名／
排程／AI 生成這類多步驟流程時，建議延續這個方式驗證，型別檢查通過不代表
執行期行為正確。

## 部署後如何實際驗證（沒有測試環境時）

- 正式環境是 Render（見 `render.yaml`），資料庫是 Supabase Postgres。
- 如果你的執行環境連不到外部網路（無法 curl 正式網址、連不到 Supabase），
  這是常見的沙箱限制，不代表程式碼有問題——改用本機 Postgres 走一次流程
  驗證邏輯，再請人類在正式環境手動確認一次即可，不需要為了「這個環境連不到」
  而改動程式碼本身。
