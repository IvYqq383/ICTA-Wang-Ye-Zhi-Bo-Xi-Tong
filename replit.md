# LiveCast - 線上模擬直播研討會 SaaS 系統

## 專案概述
一個「模擬直播」研討會平台，使用預錄的 Vimeo 影片營造直播體驗。支援多場直播管理，可作為 SaaS 出租給他人使用。

## 核心功能

### 前台功能（觀眾端）
- **報名頁面**：訪客輸入姓名/Email 報名，系統自動發送 Gmail 通知
- **直播間頁面**：
  - 響應式設計：手機上影片下聊天、電腦左影片右聊天
  - Vimeo 影片播放器
  - CTA 按鈕覆蓋（按時間顯示，用於銷售導購）
  - 即時聊天室（WebSocket）
  - 按讚按鈕 + 讚數統計
  - 投票互動功能

### 後台功能（管理員）
- **帳號**：admin / aa3210
- **直播間管理**：建立多個直播、設定 Vimeo 連結、開始時間
- **假人設定**：建立虛擬觀眾角色、預排時間點訊息
- **CTA 按鈕設定**：設定按鈕文字、連結、顯示時間
- **投票設定**：預排投票問題
- **即時控制台**：主辦人用自訂名稱即時發言

## 技術架構

### 前端
- React + TypeScript
- TailwindCSS + shadcn/ui
- Wouter 路由
- TanStack Query 資料管理
- WebSocket 即時通訊

### 後端
- Express.js
- WebSocket (ws)
- PostgreSQL (Drizzle ORM)
- Gmail API (Replit 整合)

## 資料庫結構

### Tables
- `webinars` - 直播間資訊
- `registrations` - 報名記錄
- `fake_users` - 假人角色
- `scheduled_messages` - 預排訊息
- `cta_buttons` - CTA 按鈕
- `polls` - 投票問題
- `poll_votes` - 投票記錄
- `chat_messages` - 聊天訊息
- `likes` - 按讚統計
- `users` - 管理員帳號

## 頁面路由

| 路徑 | 說明 |
|------|------|
| `/admin` | 管理員登入頁 |
| `/admin/dashboard` | 管理後台首頁 |
| `/admin/webinar/:id` | 直播間設定頁 |
| `/admin/webinar/:id/control` | 即時控制台 |
| `/register/:id` | 觀眾報名頁 |
| `/webinar/:id` | 直播間觀看頁 |

## API 端點

### 認證
- `POST /api/admin/login` - 管理員登入
- `POST /api/admin/logout` - 登出

### 直播間
- `GET /api/webinars` - 取得所有直播間
- `GET /api/webinars/:id` - 取得單一直播間
- `POST /api/webinars` - 建立直播間（需認證）
- `DELETE /api/webinars/:id` - 刪除直播間（需認證）

### 報名
- `POST /api/registrations` - 報名
- `GET /api/webinars/:id/registrations` - 取得報名列表（需認證）

### 假人
- `GET /api/webinars/:id/fake-users` - 取得假人列表
- `POST /api/webinars/:id/fake-users` - 新增假人（需認證）
- `DELETE /api/webinars/:id/fake-users/:userId` - 刪除假人（需認證）

### 預排訊息
- `GET /api/webinars/:id/scheduled-messages` - 取得預排訊息
- `POST /api/webinars/:id/scheduled-messages` - 新增預排訊息（需認證）
- `DELETE /api/webinars/:id/scheduled-messages/:msgId` - 刪除（需認證）

### CTA 按鈕
- `GET /api/webinars/:id/ctas` - 取得 CTA 列表
- `POST /api/webinars/:id/ctas` - 新增 CTA（需認證）
- `DELETE /api/webinars/:id/ctas/:ctaId` - 刪除 CTA（需認證）

### 投票
- `GET /api/webinars/:id/polls` - 取得投票列表
- `POST /api/webinars/:id/polls` - 新增投票（需認證）
- `DELETE /api/webinars/:id/polls/:pollId` - 刪除投票（需認證）

## WebSocket 訊息類型

### 客戶端發送
- `join` - 加入直播間
- `joinAsHost` - 以主辦人身份加入
- `chat` - 發送聊天訊息
- `like` - 按讚
- `vote` - 投票
- `triggerPoll` - 觸發投票（主辦人）

### 伺服器發送
- `history` - 歷史訊息
- `chat` - 新聊天訊息
- `like` - 按讚更新
- `viewerCount` - 觀看人數
- `poll` - 投票問題
- `pollResults` - 投票結果
- `scheduledMessage` - 預排訊息

## 開發指令

```bash
npm run dev          # 開發模式
npm run db:push      # 同步資料庫結構
npm run build        # 建置生產版本
```

## 整合服務
- Gmail API - 發送報名通知郵件（透過 Replit 連接器）
- Vimeo Player API - 影片播放控制
