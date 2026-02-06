import { storage } from "./storage";
import { sendEmail } from "./gmail";
import type { Webinar, Registration } from "@shared/schema";

function getEmailHtml(type: string, name: string, webinarTitle: string, startTime: Date, webinarUrl: string, timezone: string = "Asia/Taipei", customSubject?: string, customTemplate?: string): { subject: string; html: string } {
  const formattedDate = startTime.toLocaleString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: timezone
  });

  const baseStyle = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
      .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
      .info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
      .footer { text-align: center; color: #666; font-size: 14px; margin-top: 20px; }
    </style>`;

  if (customSubject && customTemplate) {
    const filledSubject = customSubject
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{title\}\}/g, webinarTitle)
      .replace(/\{\{date\}\}/g, formattedDate);
    const filledTemplate = customTemplate
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{title\}\}/g, webinarTitle)
      .replace(/\{\{date\}\}/g, formattedDate)
      .replace(/\{\{url\}\}/g, webinarUrl);
    return {
      subject: filledSubject,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyle}</head><body>
        <div class="container">
          <div class="content">${filledTemplate}</div>
          <div class="footer"><p>此郵件由系統自動發送，請勿直接回覆。</p></div>
        </div></body></html>`
    };
  }

  switch (type) {
    case "confirmation":
      return {
        subject: `【報名成功】${webinarTitle}`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>報名成功！</h1></div>
            <div class="content">
              <p>親愛的 ${name}，</p>
              <p>您已成功報名線上研討會！</p>
              <div class="info">
                <h3>${webinarTitle}</h3>
                <p><strong>直播時間：</strong>${formattedDate}</p>
              </div>
              <p>請記得準時參加：</p>
              <center><a href="${webinarUrl}" class="button">進入直播間</a></center>
            </div>
            <div class="footer"><p>此郵件由系統自動發送，請勿直接回覆。</p></div>
          </div></body></html>`
      };
    case "reminder_24h":
      return {
        subject: `【明天開播】${webinarTitle}`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>明天就要開播了！</h1></div>
            <div class="content">
              <p>親愛的 ${name}，</p>
              <p>提醒您，您報名的線上研討會將在明天開始！</p>
              <div class="info">
                <h3>${webinarTitle}</h3>
                <p><strong>直播時間：</strong>${formattedDate}</p>
              </div>
              <p>請記得準時參加：</p>
              <center><a href="${webinarUrl}" class="button">進入直播間</a></center>
            </div>
            <div class="footer"><p>此郵件由系統自動發送，請勿直接回覆。</p></div>
          </div></body></html>`
      };
    case "reminder_1h":
      return {
        subject: `【即將開播】${webinarTitle} - 1小時後開始`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>1 小時後開播！</h1></div>
            <div class="content">
              <p>親愛的 ${name}，</p>
              <p>您報名的線上研討會即將在 1 小時後開始！</p>
              <div class="info">
                <h3>${webinarTitle}</h3>
                <p><strong>直播時間：</strong>${formattedDate}</p>
              </div>
              <p>請準備好，點擊下方按鈕進入直播間：</p>
              <center><a href="${webinarUrl}" class="button">立即進入直播間</a></center>
            </div>
            <div class="footer"><p>此郵件由系統自動發送，請勿直接回覆。</p></div>
          </div></body></html>`
      };
    case "followup":
      return {
        subject: `【感謝參與】${webinarTitle}`,
        html: `<!DOCTYPE html><html><head><meta charset="utf-8">${baseStyle}</head><body>
          <div class="container">
            <div class="header"><h1>感謝您的參與！</h1></div>
            <div class="content">
              <p>親愛的 ${name}，</p>
              <p>感謝您參加我們的線上研討會「${webinarTitle}」！</p>
              <div class="info">
                <p>希望您在本次研討會中收穫滿滿。如果您有任何問題或建議，歡迎隨時與我們聯繫。</p>
              </div>
              <p>期待下次再見！</p>
            </div>
            <div class="footer"><p>此郵件由系統自動發送，請勿直接回覆。</p></div>
          </div></body></html>`
      };
    default:
      return { subject: "", html: "" };
  }
}

export async function createEmailRemindersForRegistration(
  registration: Registration,
  webinar: Webinar,
  baseUrl: string
) {
  const emailSettings = webinar.emailSettings as any;
  if (!emailSettings) return;

  const webinarUrl = `${baseUrl}/webinar/${webinar.id}`;
  const startTime = new Date(webinar.startTime);
  const now = new Date();

  const remindersToCreate: Array<{
    type: string;
    scheduledFor: Date;
    enabled: boolean;
  }> = [];

  if (emailSettings.reminder24hEnabled) {
    const t = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
    if (t > now) {
      remindersToCreate.push({ type: "reminder_24h", scheduledFor: t, enabled: true });
    }
  }

  if (emailSettings.reminder1hEnabled) {
    const t = new Date(startTime.getTime() - 60 * 60 * 1000);
    if (t > now) {
      remindersToCreate.push({ type: "reminder_1h", scheduledFor: t, enabled: true });
    }
  }

  if (emailSettings.followUpEnabled) {
    const duration = webinar.videoDuration || 3600;
    const t = new Date(startTime.getTime() + duration * 1000 + 30 * 60 * 1000);
    remindersToCreate.push({ type: "followup", scheduledFor: t, enabled: true });
  }

  for (const reminder of remindersToCreate) {
    try {
      await storage.createEmailReminder({
        webinarId: webinar.id,
        registrationId: registration.id,
        reminderType: reminder.type,
        scheduledFor: reminder.scheduledFor,
        status: "pending",
      });
    } catch (err) {
      console.error(`Failed to create ${reminder.type} reminder:`, err);
    }
  }

  if (emailSettings.confirmationEnabled) {
    try {
      const webinarUrl = `${baseUrl}/webinar/${webinar.id}`;
      const { subject, html } = getEmailHtml(
        "confirmation",
        registration.name,
        webinar.title,
        new Date(webinar.startTime),
        webinarUrl,
        webinar.timezone || "Asia/Taipei",
        emailSettings.customSubject,
        emailSettings.customTemplate
      );
      if (subject && html) {
        await sendEmail({ to: registration.email, subject, htmlBody: html });
        console.log(`Sent confirmation email to ${registration.email}`);
      }
    } catch (err) {
      console.error(`Failed to send confirmation email:`, err);
    }
  }
}

export function startEmailScheduler() {
  console.log("Email scheduler started - checking every 60 seconds");

  setInterval(async () => {
    try {
      const now = new Date();
      const pendingReminders = await storage.getPendingEmailReminders(now);

      if (pendingReminders.length === 0) return;

      console.log(`Processing ${pendingReminders.length} pending email reminders`);

      for (const reminder of pendingReminders) {
        try {
          const registration = await storage.getRegistration(reminder.registrationId);
          if (!registration) {
            await storage.updateEmailReminder(reminder.id, { status: "failed", errorMessage: "Registration not found" });
            continue;
          }

          const webinar = await storage.getWebinar(reminder.webinarId);
          if (!webinar) {
            await storage.updateEmailReminder(reminder.id, { status: "failed", errorMessage: "Webinar not found" });
            continue;
          }

          const baseUrl = process.env.REPLIT_DEV_DOMAIN
            ? `https://${process.env.REPLIT_DEV_DOMAIN}`
            : "http://localhost:5000";
          const webinarUrl = `${baseUrl}/webinar/${webinar.id}`;

          const emailSettings = webinar.emailSettings as any;
          const { subject, html } = getEmailHtml(
            reminder.reminderType,
            registration.name,
            webinar.title,
            new Date(webinar.startTime),
            webinarUrl,
            webinar.timezone || "Asia/Taipei",
            emailSettings?.customSubject,
            emailSettings?.customTemplate
          );

          if (subject && html) {
            await sendEmail({ to: registration.email, subject, htmlBody: html });
            await storage.updateEmailReminder(reminder.id, {
              status: "sent",
              sentAt: new Date(),
            });
            console.log(`Sent ${reminder.reminderType} email to ${registration.email}`);
          } else {
            await storage.updateEmailReminder(reminder.id, { status: "failed", errorMessage: "Unknown reminder type" });
          }
        } catch (err: any) {
          console.error(`Failed to send reminder ${reminder.id}:`, err);
          await storage.updateEmailReminder(reminder.id, {
            status: "failed",
            errorMessage: err.message || "Send failed",
          });
        }
      }
    } catch (err) {
      console.error("Email scheduler error:", err);
    }
  }, 60 * 1000);
}
