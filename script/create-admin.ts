// 建立（或重設）超級管理員帳號
// 用法：npm run create-admin -- <帳號> <Email> [密碼]
// 未提供密碼時會自動產生一組隨機密碼並顯示一次，請立即保存或登入後更換。
import "../server/loadEnv";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "../server/storage";

async function main() {
  const [username, email, passwordArg] = process.argv.slice(2);
  if (!username || !email) {
    console.error("用法：npm run create-admin -- <帳號> <Email> [密碼]");
    process.exit(1);
  }

  const password = passwordArg || crypto.randomBytes(12).toString("base64url");
  if (password.length < 6) {
    console.error("密碼至少需要 6 個字元");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);

  let user = await storage.getUserByUsername(username);
  if (user) {
    await storage.updateUserPassword(user.id, hashed);
    await storage.updateUser(user.id, {
      email,
      isSuperAdmin: true,
      subscriptionPlan: "enterprise",
      maxWebinars: 999,
      isActive: true,
    });
    console.log(`已更新既有帳號「${username}」為超級管理員，並重設密碼。`);
  } else {
    user = await storage.createUser({ username, password: hashed, email, companyName: "" });
    await storage.updateUser(user.id, {
      isSuperAdmin: true,
      subscriptionPlan: "enterprise",
      maxWebinars: 999,
      isActive: true,
    });
    console.log(`已建立超級管理員帳號「${username}」。`);
  }

  if (!passwordArg) {
    console.log(`自動產生的密碼（僅顯示這一次）：${password}`);
  }
  console.log(`登入頁：/admin`);
  process.exit(0);
}

main().catch((err) => {
  console.error("建立管理員失敗：", err);
  process.exit(1);
});
