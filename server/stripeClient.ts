import Stripe from 'stripe';

// 標準 Stripe 設定（選用）：
//   STRIPE_SECRET_KEY       伺服器端金鑰
//   STRIPE_PUBLISHABLE_KEY  前端公開金鑰
// 未設定時，訂閱／儲值相關 API 會回覆錯誤訊息，其餘功能不受影響。
// 自架給單一帳號（超級管理員）使用時不需要 Stripe。

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

let stripeClient: Stripe | null = null;

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe 未設定：請設定 STRIPE_SECRET_KEY 環境變數（未使用訂閱功能可忽略）');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2025-08-27.basil' as any,
    });
  }
  return stripeClient;
}

export async function getStripePublishableKey(): Promise<string> {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}
