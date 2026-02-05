import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { sendWebinarRegistrationEmail } from "./gmail";
import {
  insertWebinarSchema,
  insertRegistrationSchema,
  insertFakeUserSchema,
  insertScheduledMessageSchema,
  insertCtaButtonSchema,
  insertPollSchema,
} from "@shared/schema";

// Session type extension
declare module "express-session" {
  interface SessionData {
    isAdmin?: boolean;
  }
}

// Admin credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "aa3210";

// WebSocket connections per webinar
const webinarConnections = new Map<string, Set<WebSocket>>();
const hostConnections = new Map<string, Set<WebSocket>>();

// Middleware for admin routes
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session?.isAdmin) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // WebSocket Server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    let currentWebinarId: string | null = null;
    let isHost = false;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "join": {
            const { webinarId, nickname } = message.data;
            currentWebinarId = webinarId;
            
            if (!webinarConnections.has(webinarId)) {
              webinarConnections.set(webinarId, new Set());
            }
            webinarConnections.get(webinarId)!.add(ws);
            
            // Send history
            const messages = await storage.getChatMessagesByWebinar(webinarId);
            const likeData = await storage.getLikes(webinarId);
            ws.send(JSON.stringify({
              type: "history",
              data: {
                messages,
                likeCount: likeData?.count || 0
              }
            }));
            
            // Broadcast viewer count
            broadcastToWebinar(webinarId, {
              type: "viewerCount",
              data: { count: webinarConnections.get(webinarId)!.size }
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
            
            // Send history
            const messages = await storage.getChatMessagesByWebinar(webinarId);
            const likeData = await storage.getLikes(webinarId);
            ws.send(JSON.stringify({
              type: "history",
              data: {
                messages,
                likeCount: likeData?.count || 0
              }
            }));
            
            // Send viewer count
            const viewerCount = webinarConnections.get(webinarId)?.size || 0;
            ws.send(JSON.stringify({
              type: "viewerCount",
              data: { count: viewerCount }
            }));
            break;
          }
          
          case "chat": {
            const { webinarId, senderName, message: chatMessage, senderType } = message.data;
            
            const savedMessage = await storage.createChatMessage({
              webinarId,
              senderName,
              message: chatMessage,
              senderType: senderType || "viewer"
            });
            
            // Broadcast to all viewers and hosts
            broadcastToWebinar(webinarId, {
              type: "chat",
              data: savedMessage
            });
            broadcastToHosts(webinarId, {
              type: "chat",
              data: savedMessage
            });
            break;
          }
          
          case "like": {
            const { webinarId } = message.data;
            const newCount = await storage.incrementLikes(webinarId);
            
            broadcastToWebinar(webinarId, {
              type: "like",
              data: { count: newCount }
            });
            broadcastToHosts(webinarId, {
              type: "like",
              data: { count: newCount }
            });
            break;
          }
          
          case "vote": {
            const { pollId, optionIndex } = message.data;
            const participantId = Math.random().toString(36).substring(7);
            
            await storage.createPollVote({
              pollId,
              participantId,
              optionIndex
            });
            
            // Calculate and broadcast results
            const votes = await storage.getPollVotes(pollId);
            const results: Record<number, number> = {};
            votes.forEach(v => {
              results[v.optionIndex] = (results[v.optionIndex] || 0) + 1;
            });
            
            // Send results to voter
            ws.send(JSON.stringify({
              type: "pollResults",
              data: { results }
            }));
            break;
          }
          
          case "triggerPoll": {
            const { webinarId, pollId } = message.data;
            const poll = await storage.getPoll(pollId);
            
            if (poll) {
              broadcastToWebinar(webinarId, {
                type: "poll",
                data: poll
              });
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
        } else {
          webinarConnections.get(currentWebinarId)?.delete(ws);
          broadcastToWebinar(currentWebinarId, {
            type: "viewerCount",
            data: { count: webinarConnections.get(currentWebinarId)?.size || 0 }
          });
          broadcastToHosts(currentWebinarId, {
            type: "viewerCount",
            data: { count: webinarConnections.get(currentWebinarId)?.size || 0 }
          });
        }
      }
    });
  });

  function broadcastToWebinar(webinarId: string, message: any) {
    const connections = webinarConnections.get(webinarId);
    if (connections) {
      const data = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    }
  }

  function broadcastToHosts(webinarId: string, message: any) {
    const connections = hostConnections.get(webinarId);
    if (connections) {
      const data = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
    }
  }

  // ============ Admin Auth Routes ============
  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      req.session.isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "帳號或密碼錯誤" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // ============ Webinar Routes ============
  app.get("/api/webinars", async (req, res) => {
    const webinars = await storage.getAllWebinars();
    res.json(webinars);
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
      const data = insertWebinarSchema.parse(req.body);
      const webinar = await storage.createWebinar(data);
      res.json(webinar);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id", requireAdmin, async (req, res) => {
    await storage.deleteWebinar(req.params.id as string);
    res.json({ success: true });
  });

  // ============ Registration Routes ============
  app.post("/api/registrations", async (req, res) => {
    try {
      const data = insertRegistrationSchema.parse(req.body);
      
      // Check if already registered
      const existing = await storage.getRegistrationByEmail(data.webinarId, data.email);
      if (existing) {
        return res.status(400).json({ message: "此 Email 已報名" });
      }
      
      const registration = await storage.createRegistration(data);
      
      // Get webinar info for email
      const webinar = await storage.getWebinar(data.webinarId);
      if (webinar) {
        const webinarUrl = `${req.protocol}://${req.get("host")}/webinar/${data.webinarId}`;
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
          // Continue even if email fails
        }
      }
      
      res.json(registration);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/webinars/:id/registrations", requireAdmin, async (req, res) => {
    const registrations = await storage.getRegistrationsByWebinar(req.params.id as string);
    res.json(registrations);
  });

  // ============ Fake Users Routes ============
  app.get("/api/webinars/:id/fake-users", async (req, res) => {
    const fakeUsers = await storage.getFakeUsersByWebinar(req.params.id);
    res.json(fakeUsers);
  });

  app.post("/api/webinars/:id/fake-users", requireAdmin, async (req, res) => {
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

  app.delete("/api/webinars/:id/fake-users/:userId", requireAdmin, async (req, res) => {
    await storage.deleteFakeUser(req.params.userId as string);
    res.json({ success: true });
  });

  // ============ Scheduled Messages Routes ============
  app.get("/api/webinars/:id/scheduled-messages", async (req, res) => {
    const messages = await storage.getScheduledMessagesByWebinar(req.params.id);
    res.json(messages);
  });

  app.post("/api/webinars/:id/scheduled-messages", requireAdmin, async (req, res) => {
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

  app.delete("/api/webinars/:id/scheduled-messages/:msgId", requireAdmin, async (req, res) => {
    await storage.deleteScheduledMessage(req.params.msgId as string);
    res.json({ success: true });
  });

  // ============ CTA Buttons Routes ============
  app.get("/api/webinars/:id/ctas", async (req, res) => {
    const ctas = await storage.getCtaButtonsByWebinar(req.params.id);
    res.json(ctas);
  });

  app.post("/api/webinars/:id/ctas", requireAdmin, async (req, res) => {
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

  app.delete("/api/webinars/:id/ctas/:ctaId", requireAdmin, async (req, res) => {
    await storage.deleteCtaButton(req.params.ctaId as string);
    res.json({ success: true });
  });

  // ============ Polls Routes ============
  app.get("/api/webinars/:id/polls", async (req, res) => {
    const polls = await storage.getPollsByWebinar(req.params.id);
    res.json(polls);
  });

  app.post("/api/webinars/:id/polls", requireAdmin, async (req, res) => {
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

  app.delete("/api/webinars/:id/polls/:pollId", requireAdmin, async (req, res) => {
    await storage.deletePoll(req.params.pollId as string);
    res.json({ success: true });
  });

  return httpServer;
}
