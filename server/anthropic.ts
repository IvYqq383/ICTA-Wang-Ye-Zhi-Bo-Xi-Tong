import Anthropic from "@anthropic-ai/sdk";

// 標準 Anthropic API 設定：
//   ANTHROPIC_API_KEY   必填（未設定時 AI 功能自動停用，其餘系統正常運作）
//   ANTHROPIC_BASE_URL  選填（走代理或相容端點時才需要）
//   AI_MODEL            選填，預設 claude-sonnet-5

export const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
    });
  }
  return client;
}
