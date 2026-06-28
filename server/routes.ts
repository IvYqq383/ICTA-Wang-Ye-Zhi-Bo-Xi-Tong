import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { sendWebinarRegistrationEmail, sendQuestionNotificationEmail } from "./gmail";
import { createEmailRemindersForRegistration, startEmailScheduler } from "./email-scheduler";
import crypto from "crypto";
import {
  insertWebinarSchema,
  insertRegistrationSchema,
  insertFakeUserSchema,
  insertScheduledMessageSchema,
  insertCtaButtonSchema,
  insertPollSchema,
  insertTipSchema,
  insertQuestionSchema,
  insertFeedbackSurveySchema,
  insertFeedbackResponseSchema,
  insertViewerProgressSchema,
  insertWebinarSessionSchema,
  insertWebhookSchema,
  insertWebinarDocumentSchema,
} from "@shared/schema";

import bcrypt from "bcryptjs";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { looksLikeQuestion, answerViewerQuestion } from "./aiAssistant";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const sessionConnections = new Map<string, WebSocket>();
const webinarSessions = new Map<string, Set<string>>();
const hostConnections = new Map<string, Set<WebSocket>>();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.userId) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || !user.isSuperAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

async function requireWebinarOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const webinarId = req.params.id as string | undefined;
  if (webinarId) {
    const webinar = await storage.getWebinar(webinarId);
    if (!webinar || webinar.userId !== req.session.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 發問通知信節流：每個直播間最短寄送間隔
  const questionNotifyThrottle = new Map<string, number>();
  const QUESTION_NOTIFY_COOLDOWN_MS = 60 * 1000;

  // Allow iframe embedding for embed routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/embed/') || req.path === '/livecast-widget.js') {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }
    const isPublicGetRoute =
      (req.method === 'GET' || req.method === 'OPTIONS') &&
      (req.path.match(/^\/api\/webinars\/[^/]+$/) || req.path === '/api/webinars') &&
      !req.path.includes('/stats/');
    const isPublicPostRoute =
      (req.method === 'POST' || req.method === 'OPTIONS') &&
      req.path === '/api/registrations';
    if (isPublicGetRoute || isPublicPostRoute) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
    }
    next();
  });

  // ============ Image Upload ============
  const uploadsDir = path.join(process.cwd(), "client", "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      const name = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
      cb(null, name);
    },
  });

  const upload = multer({
    storage: uploadStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("只允許上傳圖片格式 (jpg, png, gif, webp)"));
      }
    },
  });

  app.post("/api/upload", requireAdmin, upload.single("file"), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "未選擇檔案" });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });

  app.delete("/api/upload", requireAdmin, (req: Request, res: Response) => {
    const { url } = req.body;
    if (url && url.startsWith("/uploads/")) {
      const filename = url.replace("/uploads/", "");
      if (filename && !filename.includes("/") && !filename.includes("..")) {
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    res.json({ success: true });
  });

  const serveStatic = (await import("express")).default.static;
  app.use("/uploads", serveStatic(uploadsDir, {
    maxAge: "1d",
    immutable: true,
  }));

  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let currentWebinarId: string | null = null;
    let currentSessionId: string | null = null;
    let isHost = false;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "join": {
            // Each viewer gets a unique session - complete isolation
            const { webinarId, sessionId, nickname } = message.data;
            currentWebinarId = webinarId;
            currentSessionId = sessionId;
            
            // Store session connection
            sessionConnections.set(sessionId, ws);
            
            // Track sessions per webinar
            if (!webinarSessions.has(webinarId)) {
              webinarSessions.set(webinarId, new Set());
            }
            webinarSessions.get(webinarId)!.add(sessionId);
            
            // Send ONLY this session's messages (not other viewers')
            // For new sessions, this will be empty - they only see scheduled messages
            const sessionMessages = await storage.getChatMessagesBySession(webinarId, sessionId);
            const likeData = await storage.getLikes(webinarId);
            
            ws.send(JSON.stringify({
              type: "history",
              data: {
                messages: sessionMessages,
                likeCount: likeData?.count || 0
              }
            }));
            
            // Send session ID confirmation
            ws.send(JSON.stringify({
              type: "sessionConfirmed",
              data: { sessionId }
            }));
            
            // Update viewer count for hosts only
            broadcastToHosts(webinarId, {
              type: "viewerCount",
              data: { count: webinarSessions.get(webinarId)?.size || 0 }
            });
            break;
          }
          
          case "joinAsHost": {
            const { webinarId } = message.data;
            currentWebinarId = webinarId;
            isHost = true;
            
            if (!hostConnections.has(webinarId)) {
              hostConnections.set(webinarId, new Set());
            }
            hostConnections.get(webinarId)!.add(ws);
            
            // Hosts see ALL messages from all sessions
            const allMessages = await storage.getChatMessagesByWebinar(webinarId);
            const likeData = await storage.getLikes(webinarId);
            ws.send(JSON.stringify({
              type: "history",
              data: {
                messages: allMessages,
                likeCount: likeData?.count || 0
              }
            }));
            
            // Send viewer count
            const viewerCount = webinarSessions.get(webinarId)?.size || 0;
            ws.send(JSON.stringify({
              type: "viewerCount",
              data: { count: viewerCount }
            }));
            break;
          }
          
          case "chat": {
            const { senderName, message: chatMessage } = message.data;

            // Always use server-bound connection identity; never trust client-supplied
            // webinarId/sessionId (prevents cross-webinar spoofing & AI cost abuse).
            const webinarId = currentWebinarId;
            if (!webinarId) break; // not joined yet

            // Host broadcast: requires server-verified host connection. Persist a single
            // canonical row (sessionId=null) and fan-out via WS to every connected viewer.
            // Per-session history reads include sessionId=null host rows, so reloads work.
            if (isHost) {
              const saved = await storage.createChatMessage({
                webinarId,
                sessionId: null,
                senderName,
                message: chatMessage,
                senderType: "host",
                isPrivate: false,
              });
              const sessions = webinarSessions.get(webinarId);
              if (sessions) {
                const payload = JSON.stringify({ type: "chat", data: saved });
                sessions.forEach(sid => {
                  const vws = sessionConnections.get(sid);
                  if (vws && vws.readyState === WebSocket.OPEN) {
                    vws.send(payload);
                  }
                });
              }
              broadcastToHosts(webinarId, { type: "chat", data: saved }, ws);
              break;
            }

            // Viewer: must have joined a session; session-tagged & always senderType "viewer"
            const sessionId = currentSessionId;
            if (!sessionId) break;

            const savedMessage = await storage.createChatMessage({
              webinarId,
              sessionId,
              senderName,
              message: chatMessage,
              senderType: "viewer",
              isPrivate: true
            });
            
            const viewerWs = sessionConnections.get(sessionId);
            if (viewerWs && viewerWs.readyState === WebSocket.OPEN && viewerWs !== ws) {
              viewerWs.send(JSON.stringify({
                type: "chat",
                data: savedMessage
              }));
            }
            
            broadcastToHosts(webinarId, {
              type: "chat",
              data: { ...savedMessage, sessionId }
            }, ws);

            // AI 助教：只對「看起來像問題」的觀眾訊息回覆（省成本）
            maybeAiReply(webinarId, sessionId, chatMessage).catch((err) =>
              console.error("AI reply failed:", err)
            );
            break;
          }
          
          case "hostReply": {
            if (!isHost) break; // only verified host sockets may reply as host
            const { webinarId, sessionId, senderName, message: chatMessage } = message.data;
            
            const savedMessage = await storage.createChatMessage({
              webinarId,
              sessionId,
              senderName,
              message: chatMessage,
              senderType: "host",
              isPrivate: true
            });
            
            const viewerWs = sessionConnections.get(sessionId);
            if (viewerWs && viewerWs.readyState === WebSocket.OPEN && viewerWs !== ws) {
              viewerWs.send(JSON.stringify({
                type: "chat",
                data: savedMessage
              }));
            }
            
            broadcastToHosts(webinarId, {
              type: "chat",
              data: { ...savedMessage, sessionId }
            }, ws);
            break;
          }
          
          case "scheduledMessage": {
            // Scheduled/fake user messages - only send to specific session
            const { webinarId, sessionId, senderName, message: chatMessage } = message.data;
            
            const viewerWs = sessionConnections.get(sessionId);
            if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
              viewerWs.send(JSON.stringify({
                type: "chat",
                data: {
                  id: `scheduled-${Date.now()}`,
                  webinarId,
                  senderName,
                  message: chatMessage,
                  senderType: "scheduled",
                  sentAt: new Date().toISOString()
                }
              }));
            }
            break;
          }
          
          case "like": {
            const { webinarId, sessionId } = message.data;
            const newCount = await storage.incrementLikes(webinarId);
            
            // Only send like update to this viewer
            const viewerWs = sessionConnections.get(sessionId);
            if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
              viewerWs.send(JSON.stringify({
                type: "like",
                data: { count: newCount }
              }));
            }
            
            broadcastToHosts(webinarId, {
              type: "like",
              data: { count: newCount }
            });
            break;
          }
          
          case "vote": {
            const { pollId, optionIndex, sessionId } = message.data;
            
            await storage.createPollVote({
              pollId,
              participantId: sessionId || Math.random().toString(36).substring(7),
              optionIndex
            });
            
            // Calculate and send results to this voter only
            const votes = await storage.getPollVotes(pollId);
            const results: Record<number, number> = {};
            votes.forEach(v => {
              results[v.optionIndex] = (results[v.optionIndex] || 0) + 1;
            });
            
            ws.send(JSON.stringify({
              type: "pollResults",
              data: { results }
            }));
            break;
          }
          
          case "triggerPoll": {
            // Host triggers poll for a specific session or all sessions
            const { webinarId, pollId, sessionId } = message.data;
            const poll = await storage.getPoll(pollId);
            
            if (poll) {
              if (sessionId) {
                // Send to specific session
                const viewerWs = sessionConnections.get(sessionId);
                if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
                  viewerWs.send(JSON.stringify({
                    type: "poll",
                    data: poll
                  }));
                }
              } else {
                // Send to all sessions in webinar
                broadcastToAllSessions(webinarId, {
                  type: "poll",
                  data: poll
                });
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (currentWebinarId) {
        if (isHost) {
          hostConnections.get(currentWebinarId)?.delete(ws);
        } else if (currentSessionId) {
          sessionConnections.delete(currentSessionId);
          webinarSessions.get(currentWebinarId)?.delete(currentSessionId);
          
          broadcastToHosts(currentWebinarId, {
            type: "viewerCount",
            data: { count: webinarSessions.get(currentWebinarId)?.size || 0 }
          });
        }
      }
    });
  });

  function broadcastToAllSessions(webinarId: string, message: any) {
    const sessions = webinarSessions.get(webinarId);
    if (sessions) {
      const data = JSON.stringify(message);
      sessions.forEach(sessionId => {
        const ws = sessionConnections.get(sessionId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    }
  }

  function broadcastToHosts(webinarId: string, message: any, excludeWs?: WebSocket) {
    const connections = hostConnections.get(webinarId);
    if (connections) {
      const data = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    }
  }

  // AI 助教：判斷觀眾訊息是否為問題，是則用文檔回答，以老師名義私訊回覆該觀眾
  async function maybeAiReply(webinarId: string, sessionId: string, viewerMessage: string) {
    const webinar = await storage.getWebinar(webinarId);
    const ai = webinar?.aiSettings;
    if (!webinar || !ai?.enabled) return;
    if (!looksLikeQuestion(viewerMessage)) return;

    const teacherName = (ai.teacherName || "").trim() || "老師";
    const answer = await answerViewerQuestion(
      webinarId,
      webinar.title,
      teacherName,
      viewerMessage,
      ai.fallbackMessage
    );
    if (!answer) return;

    const savedMessage = await storage.createChatMessage({
      webinarId,
      sessionId,
      senderName: teacherName,
      message: answer,
      senderType: "host",
      isPrivate: true,
    });

    const viewerWs = sessionConnections.get(sessionId);
    if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
      viewerWs.send(JSON.stringify({ type: "chat", data: savedMessage }));
    }
    broadcastToHosts(webinarId, { type: "chat", data: { ...savedMessage, sessionId } });
  }

  // ============ Auth Routes ============
  app.post("/api/admin/register", async (req, res) => {
    try {
      const { username, password, email, companyName } = req.body;
      if (!username || !password || !email) {
        return res.status(400).json({ message: "請填寫所有必填欄位" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "密碼至少需要 6 個字元" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ message: "此帳號已被使用" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        companyName: companyName || "",
      });
      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, companyName: user.companyName, isSuperAdmin: user.isSuperAdmin } });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "註冊失敗" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "帳號已停用，請聯繫客服" });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "帳號或密碼錯誤" });
    }
    req.session.userId = user.id;
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email, companyName: user.companyName, isSuperAdmin: user.isSuperAdmin } });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/admin/me", requireAdmin, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ id: user.id, username: user.username, email: user.email, companyName: user.companyName, isSuperAdmin: user.isSuperAdmin });
  });

  app.get("/api/admin/subscription", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      const webinarCount = await storage.getWebinarCountByUser(user.id);
      const publishedCount = await storage.getPublishedWebinarCountByUser(user.id);
      const isExpired = user.planExpiresAt ? new Date(user.planExpiresAt) < new Date() : false;
      res.json({
        plan: user.subscriptionPlan,
        planExpiresAt: user.planExpiresAt,
        maxWebinars: user.maxWebinars,
        webinarCount,
        publishedCount,
        isActive: user.isActive,
        isExpired,
        isSuperAdmin: user.isSuperAdmin,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Super Admin Routes ============
  app.get("/api/super-admin/users", requireSuperAdmin, async (req, res) => {
    try {
      const allUsers = await storage.listAllUsers();
      const usersWithCount = await Promise.all(
        allUsers.map(async (u) => {
          const webinarCount = await storage.getWebinarCountByUser(u.id);
          const isExpired = u.planExpiresAt ? new Date(u.planExpiresAt) < new Date() : false;
          return {
            id: u.id,
            username: u.username,
            email: u.email,
            companyName: u.companyName,
            subscriptionPlan: u.subscriptionPlan,
            planExpiresAt: u.planExpiresAt,
            maxWebinars: u.maxWebinars,
            isActive: u.isActive,
            isSuperAdmin: u.isSuperAdmin,
            createdAt: u.createdAt,
            webinarCount,
            isExpired,
          };
        })
      );
      res.json(usersWithCount);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/super-admin/users/:userId", requireSuperAdmin, async (req, res) => {
    try {
      const { subscriptionPlan, planExpiresAt, maxWebinars, isActive } = req.body;
      const updateData: any = {};
      if (subscriptionPlan !== undefined) updateData.subscriptionPlan = subscriptionPlan;
      if (planExpiresAt !== undefined) updateData.planExpiresAt = planExpiresAt ? new Date(planExpiresAt) : null;
      if (maxWebinars !== undefined) updateData.maxWebinars = maxWebinars;
      if (isActive !== undefined) updateData.isActive = isActive;
      const updated = await storage.updateUser(req.params.userId as string, updateData);
      if (!updated) return res.status(404).json({ message: "User not found" });
      const webinarCount = await storage.getWebinarCountByUser(updated.id);
      res.json({ ...updated, webinarCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Webinar Routes ============
  app.get("/api/webinars", async (req, res) => {
    if (req.session?.userId) {
      const webinars = await storage.getWebinarsByUser(req.session.userId);
      return res.json(webinars);
    }
    const webinars = await storage.getAllWebinars();
    res.json(webinars);
  });

  app.get("/api/webinars/stats/summary", requireAdmin, async (req, res) => {
    try {
      const allWebinars = await storage.getWebinarsByUser(req.session.userId!);
      const stats: Record<string, { registered: number; attended: number; engaged: number; onlineCount: number }> = {};
      
      for (const webinar of allWebinars) {
        const regs = await storage.getRegistrationsByWebinar(webinar.id);
        const registered = regs.length;
        const attended = regs.filter(r => r.attended).length;
        
        const chatMsgs = await storage.getChatMessagesByWebinar(webinar.id);
        const viewerChatCount = chatMsgs.filter(m => m.senderType === "viewer").length;
        const likeData = await storage.getLikes(webinar.id);
        const likeCount = likeData?.count || 0;
        const interactionCount = viewerChatCount + likeCount;
        const engaged = attended > 0 ? Math.round((interactionCount / attended) * 100) : (registered > 0 ? Math.round((attended / registered) * 100) : 0);
        
        const onlineCount = webinarSessions.get(webinar.id)?.size || 0;
        
        stats[webinar.id] = { registered, attended, engaged, onlineCount };
      }
      
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/webinars/:id", async (req, res) => {
    const webinar = await storage.getWebinar(req.params.id);
    if (!webinar) {
      return res.status(404).json({ message: "Webinar not found" });
    }
    res.json(webinar);
  });

  app.post("/api/webinars", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: "帳號已停用" });
      }
      if (!user.isSuperAdmin && user.subscriptionPlan === "free") {
        return res.status(403).json({ message: "FREE_PLAN", code: "FREE_PLAN" });
      }
      if (!user.isSuperAdmin && user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
        return res.status(403).json({ message: "SUBSCRIPTION_EXPIRED", code: "SUBSCRIPTION_EXPIRED" });
      }
      const data = insertWebinarSchema.parse({ ...req.body, userId: req.session.userId });
      const webinar = await storage.createWebinar(data);
      res.json(webinar);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id", requireWebinarOwner, async (req, res) => {
    await storage.deleteWebinar(req.params.id as string);
    res.json({ success: true });
  });

  app.patch("/api/webinars/:id", requireWebinarOwner, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.startTime && typeof data.startTime === "string") {
        data.startTime = new Date(data.startTime);
      }
      const webinar = await storage.updateWebinar(req.params.id as string, data);
      if (!webinar) {
        return res.status(404).json({ message: "Webinar not found" });
      }
      res.json(webinar);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Publish / Unpublish Webinar ============
  app.post("/api/webinars/:id/publish", requireWebinarOwner, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.isActive) {
        return res.status(403).json({ message: "帳號已停用" });
      }
      if (!user.isSuperAdmin && user.subscriptionPlan === "free") {
        return res.status(403).json({ message: "FREE_PLAN", code: "FREE_PLAN" });
      }
      if (!user.isSuperAdmin && user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
        return res.status(403).json({ message: "SUBSCRIPTION_EXPIRED", code: "SUBSCRIPTION_EXPIRED" });
      }
      const publishedCount = await storage.getPublishedWebinarCountByUser(user.id);
      const maxPublished = user.isSuperAdmin ? 999 : (user.maxWebinars || 3);
      if (publishedCount >= maxPublished) {
        return res.status(403).json({ message: "PUBLISH_LIMIT", code: "PUBLISH_LIMIT", maxPublished });
      }
      const webinar = await storage.updateWebinar(req.params.id as string, { publishStatus: "published" } as any);
      if (!webinar) {
        return res.status(404).json({ message: "Webinar not found" });
      }
      res.json(webinar);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/webinars/:id/unpublish", requireWebinarOwner, async (req, res) => {
    try {
      const webinar = await storage.updateWebinar(req.params.id as string, { publishStatus: "draft" } as any);
      if (!webinar) {
        return res.status(404).json({ message: "Webinar not found" });
      }
      res.json(webinar);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Stripe Routes ============
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/config", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({
        publishableKey: key,
        monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID || "",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/stripe/checkout", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId: user.id, username: user.username },
        });
        await storage.updateUser(user.id, { stripeCustomerId: customer.id } as any);
        customerId = customer.id;
      }

      const priceId = req.body.priceId;
      if (!priceId) {
        return res.status(400).json({ message: "priceId is required" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/admin/dashboard?checkout=success`,
        cancel_url: `${baseUrl}/admin/dashboard?checkout=cancel`,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/stripe/portal", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "No Stripe customer found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/admin/dashboard`,
      });

      res.json({ url: portalSession.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stripe/subscription-status", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Unauthorized" });

      if (!user.stripeSubscriptionId) {
        return res.json({ active: false, plan: user.subscriptionPlan });
      }

      const stripe = await getUncachableStripeClient();
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId) as any;
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        return res.json({
          active: isActive,
          plan: user.subscriptionPlan,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
      } catch {
        return res.json({ active: false, plan: user.subscriptionPlan });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/stripe/handle-subscription", requireAdmin, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.stripeCustomerId) {
        return res.status(400).json({ message: "No customer" });
      }

      const stripe = await getUncachableStripeClient();
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0] as any;
        const periodEnd = new Date(sub.current_period_end * 1000);
        await storage.updateUser(user.id, {
          subscriptionPlan: "monthly",
          stripeSubscriptionId: sub.id,
          maxWebinars: 3,
          planExpiresAt: periodEnd,
        } as any);
        return res.json({ success: true, plan: "monthly" });
      }

      return res.json({ success: false, message: "No active subscription found" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Registration Routes ============
  app.post("/api/registrations", async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.selectedSession && typeof body.selectedSession === "string") {
        body.selectedSession = new Date(body.selectedSession);
      }
      // tags 為後台專用，禁止公開報名端設定
      delete body.tags;
      const data = insertRegistrationSchema.parse(body);

      const webinarCheck = await storage.getWebinar(data.webinarId);
      if (!webinarCheck || webinarCheck.publishStatus !== "published") {
        return res.status(403).json({ message: "此直播間尚未發佈，無法報名" });
      }
      
      const existing = await storage.getRegistrationByEmail(data.webinarId, data.email);
      if (existing) {
        return res.status(400).json({ message: "此 Email 已報名" });
      }
      
      const registration = await storage.createRegistration(data);
      
      dispatchWebhook(data.webinarId, "registration", {
        registrationId: registration.id, name: data.name, email: data.email
      });
      
      const webinar = await storage.getWebinar(data.webinarId);
      if (webinar) {
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const webinarUrl = `${baseUrl}/webinar/${data.webinarId}`;
        const emailSettings = webinar.emailSettings as any;
        
        if (!emailSettings || emailSettings.confirmationEnabled !== false) {
          try {
            await sendWebinarRegistrationEmail(
              data.email,
              data.name,
              webinar.title,
              new Date(webinar.startTime),
              webinarUrl
            );
          } catch (emailError) {
            console.error("Failed to send email:", emailError);
          }
        }
        
        try {
          await createEmailRemindersForRegistration(registration, webinar, baseUrl);
        } catch (reminderError) {
          console.error("Failed to create reminders:", reminderError);
        }
      }
      
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/webinars/:id/registrations/:regId/tags", requireWebinarOwner, async (req, res) => {
    try {
      const reg = await storage.getRegistration(req.params.regId as string);
      if (!reg || reg.webinarId !== req.params.id) {
        return res.status(404).json({ message: "找不到此報名記錄" });
      }
      const tags = Array.isArray(req.body.tags)
        ? req.body.tags.map((t: any) => String(t).trim()).filter(Boolean)
        : [];
      const updated = await storage.updateRegistration(req.params.regId as string, { tags });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/webinars/:id/registrations", requireWebinarOwner, async (req, res) => {
    const registrations = await storage.getRegistrationsByWebinar(req.params.id as string);
    res.json(registrations);
  });

  // ============ Attendance Tracking ============
  app.post("/api/registrations/:id/attend", async (req, res) => {
    try {
      const registration = await storage.updateRegistration(req.params.id, {
        attended: true,
        attendedAt: new Date(),
      });
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/registrations/:id/leave", async (req, res) => {
    try {
      const registration = await storage.getRegistration(req.params.id);
      if (registration && registration.attendedAt) {
        const watchDuration = Math.floor((Date.now() - new Date(registration.attendedAt).getTime()) / 1000);
        const updated = await storage.updateRegistration(req.params.id, {
          leftAt: new Date(),
          watchDuration,
        });
        res.json(updated);
      } else {
        res.json(registration);
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Fake Users Routes ============
  app.get("/api/webinars/:id/fake-users", async (req, res) => {
    const fakeUsers = await storage.getFakeUsersByWebinar(req.params.id);
    res.json(fakeUsers);
  });

  app.post("/api/webinars/:id/fake-users", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertFakeUserSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const fakeUser = await storage.createFakeUser(data);
      res.json(fakeUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/fake-users/:userId", requireWebinarOwner, async (req, res) => {
    await storage.deleteFakeUser(req.params.userId as string);
    res.json({ success: true });
  });

  // ============ Scheduled Messages Routes ============
  app.get("/api/webinars/:id/scheduled-messages", async (req, res) => {
    const messages = await storage.getScheduledMessagesByWebinar(req.params.id);
    res.json(messages);
  });

  app.post("/api/webinars/:id/scheduled-messages", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertScheduledMessageSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const message = await storage.createScheduledMessage(data);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/scheduled-messages/:msgId", requireWebinarOwner, async (req, res) => {
    await storage.deleteScheduledMessage(req.params.msgId as string);
    res.json({ success: true });
  });

  // ============ CTA Buttons Routes ============
  app.get("/api/webinars/:id/ctas", async (req, res) => {
    const ctas = await storage.getCtaButtonsByWebinar(req.params.id);
    res.json(ctas);
  });

  app.post("/api/webinars/:id/ctas", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertCtaButtonSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const cta = await storage.createCtaButton(data);
      res.json(cta);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/ctas/:ctaId", requireWebinarOwner, async (req, res) => {
    await storage.deleteCtaButton(req.params.ctaId as string);
    res.json({ success: true });
  });

  // ============ Polls Routes ============
  app.get("/api/webinars/:id/polls", async (req, res) => {
    const polls = await storage.getPollsByWebinar(req.params.id);
    res.json(polls);
  });

  app.post("/api/webinars/:id/polls", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertPollSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const poll = await storage.createPoll(data);
      res.json(poll);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/polls/:pollId", requireWebinarOwner, async (req, res) => {
    await storage.deletePoll(req.params.pollId as string);
    res.json({ success: true });
  });

  // ============ Tips Routes ============
  app.get("/api/webinars/:id/tips", async (req, res) => {
    const tipsList = await storage.getTipsByWebinar(req.params.id);
    res.json(tipsList);
  });

  app.post("/api/webinars/:id/tips", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertTipSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const tip = await storage.createTip(data);
      res.json(tip);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/tips/:tipId", requireWebinarOwner, async (req, res) => {
    await storage.deleteTip(req.params.tipId as string);
    res.json({ success: true });
  });

  // ============ Questions (Q&A) Routes ============
  app.get("/api/webinars/:id/questions", async (req, res) => {
    const questionsList = await storage.getQuestionsByWebinar(req.params.id);
    res.json(questionsList);
  });

  app.get("/api/webinars/:id/questions/preset", async (req, res) => {
    const presetQuestions = await storage.getPresetQuestions(req.params.id);
    res.json(presetQuestions);
  });

  app.post("/api/webinars/:id/questions", async (req, res) => {
    try {
      const data = insertQuestionSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const question = await storage.createQuestion(data);

      // 有人發問時通知主持人（含節流，避免被惡意灌爆）
      if (!data.isPreset) {
        (async () => {
          try {
            const webinar = await storage.getWebinar(req.params.id);
            const notify = webinar?.notifySettings as any;
            if (!webinar || !notify?.questionEmailEnabled) return;
            const lastSent = questionNotifyThrottle.get(webinar.id) || 0;
            if (Date.now() - lastSent < QUESTION_NOTIFY_COOLDOWN_MS) return;
            questionNotifyThrottle.set(webinar.id, Date.now());
            let to = (notify.notifyEmail || "").trim();
            if (!to && webinar.userId) {
              const owner = await storage.getUser(webinar.userId);
              to = owner?.email || "";
            }
            if (!to) return;
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const controlUrl = `${baseUrl}/admin/webinar/${webinar.id}/control`;
            await sendQuestionNotificationEmail(
              to, webinar.title, data.askerName, data.question, controlUrl
            );
          } catch (err) {
            console.error("Failed to send question notification:", err);
          }
        })();
      }

      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/webinars/:id/questions/:questionId", requireWebinarOwner, async (req, res) => {
    try {
      const question = await storage.updateQuestion(req.params.questionId as string, req.body);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/questions/:questionId", requireWebinarOwner, async (req, res) => {
    await storage.deleteQuestion(req.params.questionId as string);
    res.json({ success: true });
  });

  // ============ Feedback Survey Routes ============
  app.get("/api/webinars/:id/feedback-survey", async (req, res) => {
    const survey = await storage.getFeedbackSurveyByWebinar(req.params.id);
    res.json(survey || null);
  });

  app.post("/api/webinars/:id/feedback-survey", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertFeedbackSurveySchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const survey = await storage.createFeedbackSurvey(data);
      res.json(survey);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/webinars/:id/feedback-survey/:surveyId", requireWebinarOwner, async (req, res) => {
    try {
      const survey = await storage.updateFeedbackSurvey(req.params.surveyId as string, req.body);
      res.json(survey);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Feedback Responses Routes ============
  app.post("/api/feedback-responses", async (req, res) => {
    try {
      const data = insertFeedbackResponseSchema.parse(req.body);
      const response = await storage.createFeedbackResponse(data);
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/feedback-surveys/:surveyId/responses", requireAdmin, async (req, res) => {
    const responses = await storage.getFeedbackResponsesBySurvey(req.params.surveyId as string);
    res.json(responses);
  });

  // ============ Viewer Progress Routes ============
  app.get("/api/webinars/:id/progress/:sessionId", async (req, res) => {
    const progress = await storage.getViewerProgress(req.params.id as string, req.params.sessionId as string);
    res.json(progress || { lastPosition: 0, totalWatched: 0 });
  });

  app.post("/api/webinars/:id/progress", async (req, res) => {
    try {
      const data = insertViewerProgressSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const progress = await storage.upsertViewerProgress(data);
      res.json(progress);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Analytics Routes ============
  app.get("/api/webinars/:id/analytics", requireWebinarOwner, async (req, res) => {
    const webinarId = req.params.id as string;
    const webinar = await storage.getWebinar(webinarId);
    if (!webinar) {
      return res.status(404).json({ message: "Webinar not found" });
    }

    const analytics = await storage.getWebinarAnalytics(webinarId);
    const registrations = await storage.getRegistrationsByWebinar(webinarId);
    
    // Calculate summary stats
    const totalRegistrations = registrations.length;
    const attended = registrations.filter(r => r.attended).length;
    const attendanceRate = totalRegistrations > 0 ? (attended / totalRegistrations * 100) : 0;
    const totalWatchTime = registrations.reduce((sum, r) => sum + (r.watchDuration || 0), 0);
    const avgWatchTime = attended > 0 ? Math.round(totalWatchTime / attended) : 0;

    res.json({
      webinar,
      summary: {
        totalRegistrations,
        attended,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        avgWatchTime,
        videoDuration: webinar.videoDuration || 0,
      },
      analytics,
      registrations,
    });
  });

  // ============ Webinar Sessions Routes ============
  app.get("/api/webinars/:id/sessions", async (req, res) => {
    const sessions = await storage.getWebinarSessions(req.params.id as string);
    res.json(sessions);
  });

  app.post("/api/webinars/:id/sessions", requireWebinarOwner, async (req, res) => {
    try {
      const body = {
        ...req.body,
        webinarId: req.params.id,
        scheduledStart: new Date(req.body.scheduledStart),
      };
      if (req.body.scheduledEnd) {
        body.scheduledEnd = new Date(req.body.scheduledEnd);
      }
      const data = insertWebinarSessionSchema.parse(body);
      const session = await storage.createWebinarSession(data);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/sessions/:sessionId", requireWebinarOwner, async (req, res) => {
    try {
      await storage.deleteWebinarSession(req.params.sessionId as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Webinar Duplication ============
  app.post("/api/webinars/:id/duplicate", requireWebinarOwner, async (req, res) => {
    try {
      const sourceWebinar = await storage.getWebinar(req.params.id as string);
      if (!sourceWebinar) {
        return res.status(404).json({ message: "Webinar not found" });
      }

      const newWebinar = await storage.createWebinar({
        title: `${sourceWebinar.title} (副本)`,
        description: sourceWebinar.description || undefined,
        vimeoUrl: sourceWebinar.vimeoUrl,
        coverImage: sourceWebinar.coverImage || undefined,
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        videoDuration: sourceWebinar.videoDuration || undefined,
        scheduleMode: sourceWebinar.scheduleMode as any,
        recurringSchedule: sourceWebinar.recurringSchedule as any,
        timezone: sourceWebinar.timezone || undefined,
        brandSettings: sourceWebinar.brandSettings as any,
        replayEnabled: sourceWebinar.replayEnabled ?? undefined,
        replayAvailableHours: sourceWebinar.replayAvailableHours ?? undefined,
        emailSettings: sourceWebinar.emailSettings as any,
        userId: req.session.userId,
      });

      const [sourceFakeUsers, sourceMessages, sourceCtas, sourcePolls, sourceTips] = await Promise.all([
        storage.getFakeUsersByWebinar(sourceWebinar.id),
        storage.getScheduledMessagesByWebinar(sourceWebinar.id),
        storage.getCtaButtonsByWebinar(sourceWebinar.id),
        storage.getPollsByWebinar(sourceWebinar.id),
        storage.getTipsByWebinar(sourceWebinar.id),
      ]);

      const fakeUserIdMap = new Map<string, string>();
      for (const fu of sourceFakeUsers) {
        const newFu = await storage.createFakeUser({
          webinarId: newWebinar.id,
          name: fu.name,
          avatar: fu.avatar || undefined,
        });
        fakeUserIdMap.set(fu.id, newFu.id);
      }

      for (const msg of sourceMessages) {
        await storage.createScheduledMessage({
          webinarId: newWebinar.id,
          fakeUserId: fakeUserIdMap.get(msg.fakeUserId || "") || msg.fakeUserId || "",
          message: msg.message,
          triggerTime: msg.triggerTime,
        });
      }

      for (const cta of sourceCtas) {
        await storage.createCtaButton({
          webinarId: newWebinar.id,
          text: cta.text,
          url: cta.url,
          startTime: cta.startTime,
          endTime: cta.endTime ?? undefined,
          style: cta.style || undefined,
        });
      }

      for (const poll of sourcePolls) {
        await storage.createPoll({
          webinarId: newWebinar.id,
          question: poll.question,
          options: poll.options as string[],
          triggerTime: poll.triggerTime,
          duration: poll.duration ?? undefined,
        });
      }

      for (const tip of sourceTips) {
        await storage.createTip({
          webinarId: newWebinar.id,
          title: tip.title,
          content: tip.content,
          triggerTime: tip.triggerTime,
          duration: tip.duration ?? undefined,
        });
      }

      res.json(newWebinar);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Public: Available Sessions ============
  app.get("/api/webinars/:id/registration-count", async (req, res) => {
    try {
      const regs = await storage.getRegistrationsByWebinar(req.params.id as string);
      res.json({ count: regs.length });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/webinars/:id/available-sessions", async (req, res) => {
    try {
      const webinar = await storage.getWebinar(req.params.id as string);
      if (!webinar) return res.status(404).json({ message: "Webinar not found" });

      const scheduleMode = webinar.scheduleMode as any;
      const recurring = webinar.recurringSchedule as any;
      const now = new Date();

      // If a recurring schedule (days+times) is configured, always offer those
      // upcoming time slots as pickable sessions — even when scheduleMode says
      // onDemand — so viewers can register for a specific airing.
      if (recurring?.enabled && recurring.times?.length && recurring.days?.length) {
        const excludeSet = new Set<string>(
          (recurring.excludeDates as string[] | undefined)?.map(d => String(d).slice(0, 10)) || []
        );
        const generated: { id: string; scheduledStart: Date; status: string }[] = [];
        for (let d = 0; d < 14 && generated.length < 20; d++) {
          const date = new Date(now);
          date.setDate(date.getDate() + d);
          if (!recurring.days.includes(date.getDay())) continue;
          const ymd = date.toISOString().slice(0, 10);
          if (excludeSet.has(ymd)) continue;
          for (const time of recurring.times as string[]) {
            const match = /^(\d{1,2}):(\d{2})$/.exec(String(time).trim());
            if (!match) continue;
            const h = Number(match[1]);
            const m = Number(match[2]);
            if (h < 0 || h > 23 || m < 0 || m > 59) continue;
            const slot = new Date(date);
            slot.setHours(h, m, 0, 0);
            if (slot.getTime() <= now.getTime()) continue;
            generated.push({
              id: `recurring-${slot.getTime()}`,
              scheduledStart: slot,
              status: "scheduled",
            });
            if (generated.length >= 20) break;
          }
        }
        generated.sort((a, b) => a.scheduledStart.getTime() - b.scheduledStart.getTime());
        if (generated.length > 0) {
          return res.json({
            mode: "recurring",
            sessions: generated,
            hasSessions: true,
          });
        }
      }

      if (scheduleMode?.onDemand) {
        return res.json({
          mode: "onDemand",
          sessions: [],
          message: "隨時可以觀看",
        });
      }

      if (scheduleMode?.justInTime) {
        const minutes = scheduleMode.justInTimeMinutes || 15;
        const nextStart = new Date(now.getTime() + minutes * 60 * 1000);
        return res.json({
          mode: "justInTime",
          sessions: [{ id: "jit", scheduledStart: nextStart, status: "scheduled" }],
          nextStartMinutes: minutes,
          message: `下一場將在 ${minutes} 分鐘內開始`,
        });
      }

      const isRecurring = scheduleMode?.recurring && !scheduleMode?.onDemand && !scheduleMode?.justInTime;
      const mode = isRecurring ? "recurring" : "fixed";

      const allSessions = await storage.getWebinarSessions(webinar.id);
      const seenTimes = new Set<number>();
      const futureSessions = allSessions
        .filter(s => new Date(s.scheduledStart) > now && s.status === "scheduled")
        .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
        .filter(s => {
          const t = new Date(s.scheduledStart).getTime();
          if (seenTimes.has(t)) return false;
          seenTimes.add(t);
          return true;
        })
        .slice(0, 20);

      if (futureSessions.length > 0) {
        return res.json({
          mode,
          sessions: futureSessions,
          hasSessions: true,
        });
      }

      return res.json({
        mode,
        sessions: [{ id: "main", scheduledStart: webinar.startTime, status: "scheduled" }],
        hasSessions: false,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Recurring Schedule Generation ============
  app.post("/api/webinars/:id/generate-sessions", requireWebinarOwner, async (req, res) => {
    try {
      const webinar = await storage.getWebinar(req.params.id as string);
      if (!webinar) {
        return res.status(404).json({ message: "Webinar not found" });
      }

      const schedule = webinar.recurringSchedule as any;
      if (!schedule?.enabled || !schedule.days?.length || !schedule.times?.length) {
        return res.status(400).json({ message: "No recurring schedule configured" });
      }

      const daysToGenerate = req.body.days || 30;
      const now = new Date();
      const sessions: any[] = [];

      const existingSessions = await storage.getWebinarSessions(webinar.id);
      const existingKeys = new Set(
        existingSessions.map(s => `${new Date(s.scheduledStart).getTime()}`)
      );

      for (let d = 0; d < daysToGenerate; d++) {
        const date = new Date(now);
        date.setDate(date.getDate() + d);
        const dayOfWeek = date.getDay();

        if (!schedule.days.includes(dayOfWeek)) continue;

        const dateStr = date.toISOString().split("T")[0];
        if (schedule.excludeDates?.includes(dateStr)) continue;

        for (const time of schedule.times) {
          const [hours, minutes] = time.split(":").map(Number);
          const sessionDate = new Date(date);
          sessionDate.setHours(hours, minutes, 0, 0);

          if (sessionDate <= now) continue;

          const key = `${sessionDate.getTime()}`;
          if (existingKeys.has(key)) continue;

          const session = await storage.createWebinarSession({
            webinarId: webinar.id,
            scheduledStart: sessionDate,
            status: "scheduled",
          });
          sessions.push(session);
          existingKeys.add(key);
        }
      }

      res.json({ generated: sessions.length, sessions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Start email scheduler
  startEmailScheduler();

  // ============ Mark Attendance ============
  app.post("/api/registrations/:id/attend", async (req, res) => {
    try {
      const registration = await storage.updateRegistration(req.params.id as string, {
        attended: true,
        attendedAt: new Date(),
      });
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/registrations/:id/leave", async (req, res) => {
    try {
      const { watchDuration } = req.body;
      const registration = await storage.updateRegistration(req.params.id as string, {
        leftAt: new Date(),
        watchDuration,
      });
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Webhooks ============
  async function dispatchWebhook(webinarId: string, eventType: string, payload: any) {
    try {
      const hooks = await storage.getWebhooksByEvent(webinarId, eventType);
      for (const hook of hooks) {
        const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (hook.secret) {
          const signature = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");
          headers["X-Webhook-Signature"] = signature;
        }
        fetch(hook.targetUrl, { method: "POST", headers, body }).catch(err => {
          console.error(`Webhook delivery failed for ${hook.targetUrl}:`, err.message);
        });
      }
    } catch (err) {
      console.error("Webhook dispatch error:", err);
    }
  }

  app.get("/api/webinars/:id/webhooks", requireWebinarOwner, async (req, res) => {
    const hooks = await storage.getWebhooksByWebinar(req.params.id as string);
    res.json(hooks);
  });

  app.post("/api/webinars/:id/webhooks", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertWebhookSchema.parse({ ...req.body, webinarId: req.params.id });
      const hook = await storage.createWebhook(data);
      res.json(hook);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/webinars/:id/webhooks/:hookId", requireWebinarOwner, async (req, res) => {
    try {
      const hook = await storage.updateWebhook(req.params.hookId as string, req.body);
      res.json(hook);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/webhooks/:hookId", requireWebinarOwner, async (req, res) => {
    await storage.deleteWebhook(req.params.hookId as string);
    res.json({ success: true });
  });

  // ============ AI 助教知識文檔 ============
  app.get("/api/webinars/:id/documents", requireWebinarOwner, async (req, res) => {
    const docs = await storage.getWebinarDocuments(req.params.id as string);
    res.json(docs);
  });

  app.post("/api/webinars/:id/documents", requireWebinarOwner, async (req, res) => {
    try {
      const data = insertWebinarDocumentSchema.parse({ ...req.body, webinarId: req.params.id });
      const doc = await storage.createWebinarDocument(data);
      res.json(doc);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/documents/:docId", requireWebinarOwner, async (req, res) => {
    await storage.deleteWebinarDocument(req.params.id as string, req.params.docId as string);
    res.json({ success: true });
  });

  // ============ CSV Export ============
  app.get("/api/webinars/:id/registrations/export", requireWebinarOwner, async (req, res) => {
    try {
      const regs = await storage.getRegistrationsByWebinar(req.params.id as string);
      const webinar = await storage.getWebinar(req.params.id as string);
      const customFields = (webinar?.customFields as Array<{ id: string; label: string }>) || [];
      const headers = ["Name", "Email", "Phone", "Tags", "Registered At", "Attended", "Attended At", "Left At", "Watch Duration (s)", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Term", "UTM Content", "Landing URL", ...customFields.map(f => f.label)];
      const rows = regs.map((r: any) => [
        r.name, r.email, r.phone || "", (r.tags || []).join("; "),
        r.registeredAt || "", r.attended ? "Yes" : "No",
        r.attendedAt || "", r.leftAt || "", r.watchDuration || "",
        r.utmSource || "", r.utmMedium || "", r.utmCampaign || "",
        r.utmTerm || "", r.utmContent || "", r.landingUrl || "",
        ...customFields.map(f => (r.customFieldData || {})[f.id] || "")
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=registrations-${req.params.id}.csv`);
      res.send("\uFEFF" + csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
