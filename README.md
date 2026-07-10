# ICTA-WEBINAR — 自動化模擬直播研討會系統

多租戶「模擬直播」研討會平台：用預錄的 Vimeo 影片營造準時開播的直播體驗，內建報名頁、Email 通知、即時聊天室（含預排訊息與假人）、CTA 導購按鈕、投票、Q&A、提示卡、出席與觀看分析、UTM 追蹤、Webhook 整合，以及 AI 一鍵生成互動內容。

> 本版本已完全脫離 Replit：寄信改用 **Resend**、AI 改用**標準 Anthropic API**、資料庫為任何 **PostgreSQL**（建議 Supabase），並移除了預設管理員帳號等原始範例資料。

## 技術架構

| 模組 | 技術 |
| --- | --- |
| 前端 | React 18 + TypeScript + Tailwind + shadcn/ui + Wouter + TanStack Query |
| 後端 | Express 5 + WebSocket (ws) — 需要長駐伺服器 |
| 資料庫 | PostgreSQL（Drizzle ORM；資料表全部放在獨立的 `webinar` schema） |
| 寄信 | Resend HTTP API |
| AI | Anthropic API（Claude，預設模型 `claude-sonnet-5`） |
| 金流（選用） | Stripe（多租戶訂閱用；自架單一帳號不需要） |

## 環境變數

複製 `.env.example` 為 `.env` 後填入：

| 變數 | 必填 | 說明 |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL 連線字串。用 Supabase 時建議取 Dashboard → Connect 的「Session pooler」字串（IPv4 相容） |
| `SESSION_SECRET` | ✅ | 隨機長字串；正式環境未設定會拒絕啟動 |
| `APP_URL` | ✅ | 對外網址，寄信中的直播間連結會用到 |
| `RESEND_API_KEY` | 寄信必填 | Resend API 金鑰 |
| `EMAIL_FROM` | 寄信必填 | 寄件人；網域需先在 Resend 完成 DNS 驗證（未驗證前可暫用 `onboarding@resend.dev`，只能寄給帳號本人） |
| `ANTHROPIC_API_KEY` | 選填 | 未設定時 AI 助教／一鍵生成自動停用，其他功能不受影響 |
| `AI_MODEL` | 選填 | 預設 `claude-sonnet-5` |
| `STRIPE_SECRET_KEY` 等 | 選填 | 只有要開放多租戶訂閱收費才需要 |
| `DB_SCHEMA` | 選填 | Session 資料表所在 schema，預設 `webinar` |

## 快速開始

```bash
npm install

cp .env.example .env   # 填入上表變數

# 建立資料表（擇一）：
npm run db:push                          # 由 Drizzle 直接同步 schema
# 或用 migrations/0000_init.sql 手動執行（內容相同，含 session 資料表）

# 建立超級管理員（取代舊版寫死的預設帳號）
npm run create-admin -- <帳號> <Email> [密碼]   # 不給密碼會自動產生並顯示一次

npm run dev            # http://localhost:5000
```

登入後台：`/admin`。直播間預設是「草稿」，發佈後報名頁（`/register/:id`）與直播間（`/webinar/:id`）才會生效。

## 正式部署

```bash
npm run build   # 產出 dist/（前端 + 單檔後端 dist/index.cjs）
npm start       # NODE_ENV=production node dist/index.cjs
```

- 需要**長駐 Node 伺服器**（WebSocket 聊天室 + Email 排程輪詢）：Railway、Render、Fly.io、VPS 皆可；**Vercel/Netlify 之類 serverless 平台不適用**。
- 圖片上傳存於本機磁碟 `client/public/uploads/`；主機磁碟若非持久化（如某些容器平台），請掛載 Volume 或改用物件儲存。
- 資料庫共用注意：本系統只讀寫 `webinar` schema，可與其他系統共用同一個 PostgreSQL／Supabase 專案而互不干擾（建議用專屬的資料庫角色連線，只授權 `webinar` schema）。

### 驗證 Resend 寄信

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":["你的帳號Email"],"subject":"測試","html":"<p>OK</p>"}'
```

要用自己的網域寄信（寄給任何人），先到 Resend Dashboard → Domains 完成 DNS 驗證，再把 `EMAIL_FROM` 改成該網域的地址。

## 嵌入到其他網站（例如課程平台）

- 報名表單 iframe：`/embed/register/:id`
- 直播間 iframe：`/embed/webinar/:id`
- 或載入 `<script src="https://你的網域/livecast-widget.js">`，用 `window.ICTA_WEBINAR`（相容 `window.LiveCast`）產生內嵌表單／彈窗。

## 安全注意事項

- 已移除舊版寫死的預設管理員帳號；管理員一律用 `npm run create-admin` 建立。
- 正式環境必須設定 `SESSION_SECRET`，否則拒絕啟動。
- 公開報名端點（`POST /api/registrations`）僅對「已發佈」的直播間開放；直播間連結本身沒有觀眾登入驗證，付費內容請勿公開散佈連結。
- `.env` 已列入 `.gitignore`，金鑰請勿提交進版控。

## 開發指令

```bash
npm run dev           # 開發模式（vite middleware + tsx）
npm run check         # TypeScript 檢查
npm run build         # 正式建置
npm run db:push       # 同步資料庫 schema
npm run db:generate   # 產生 SQL migration
npm run create-admin  # 建立/重設超級管理員
```
