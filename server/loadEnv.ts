// 載入 .env（必須是進入點的第一個 import，確保先於其他模組讀取 process.env）
// .env 不存在時略過，例如部署平台已直接注入環境變數。
try {
  process.loadEnvFile();
} catch {}
