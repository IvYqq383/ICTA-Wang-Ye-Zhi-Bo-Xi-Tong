import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { sendWebinarRegistrationEmail } from "./gmail";
import { createEmailRemindersForRegistration, startEmailScheduler } from "./email-scheduler";
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

// WebSocket connections - now session-based for viewer isolation
// Key: sessionId (unique per viewer session)
const sessionConnections = new Map<string, WebSocket>();
// Key: webinarId, Value: Set of sessionIds (for tracking)
const webinarSessions = new Map<string, Set<string>>();
// Host connections per webinar (can see all sessions)
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
  // Allow iframe embedding for embed routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/embed/') || req.path === '/livecast-widget.js') {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }
    // CORS only for public-facing API routes used by embeds
    const publicCorsRoutes = ['/api/webinars', '/api/registrations'];
    const isPublicRoute = publicCorsRoutes.some(r => req.path.startsWith(r));
    if (isPublicRoute) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
    }
    next();
  });

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
            const { webinarId, sessionId, senderName, message: chatMessage, senderType } = message.data;
            
            // Save message with session ID (private to this viewer)
            const savedMessage = await storage.createChatMessage({
              webinarId,
              sessionId,
              senderName,
              message: chatMessage,
              senderType: senderType || "viewer",
              isPrivate: true // Viewer messages are private
            });
            
            // Send ONLY to this viewer's session (not other viewers)
            const viewerWs = sessionConnections.get(sessionId);
            if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
              viewerWs.send(JSON.stringify({
                type: "chat",
                data: savedMessage
              }));
            }
            
            // Also send to hosts so they can see all conversations
            broadcastToHosts(webinarId, {
              type: "chat",
              data: { ...savedMessage, sessionId }
            });
            break;
          }
          
          case "hostReply": {
            // Host replying to a specific viewer's session
            const { webinarId, sessionId, senderName, message: chatMessage } = message.data;
            
            const savedMessage = await storage.createChatMessage({
              webinarId,
              sessionId,
              senderName,
              message: chatMessage,
              senderType: "host",
              isPrivate: true
            });
            
            // Send to the specific viewer
            const viewerWs = sessionConnections.get(sessionId);
            if (viewerWs && viewerWs.readyState === WebSocket.OPEN) {
              viewerWs.send(JSON.stringify({
                type: "chat",
                data: savedMessage
              }));
            }
            
            // Also send to all hosts
            broadcastToHosts(webinarId, {
              type: "chat",
              data: { ...savedMessage, sessionId }
            });
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

  app.get("/api/webinars/stats/summary", requireAdmin, async (req, res) => {
    try {
      const allWebinars = await storage.getAllWebinars();
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

  app.patch("/api/webinars/:id", requireAdmin, async (req, res) => {
    try {
      const webinar = await storage.updateWebinar(req.params.id as string, req.body);
      if (!webinar) {
        return res.status(404).json({ message: "Webinar not found" });
      }
      res.json(webinar);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
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

  app.get("/api/webinars/:id/registrations", requireAdmin, async (req, res) => {
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

  // ============ Tips Routes ============
  app.get("/api/webinars/:id/tips", async (req, res) => {
    const tipsList = await storage.getTipsByWebinar(req.params.id);
    res.json(tipsList);
  });

  app.post("/api/webinars/:id/tips", requireAdmin, async (req, res) => {
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

  app.delete("/api/webinars/:id/tips/:tipId", requireAdmin, async (req, res) => {
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
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/webinars/:id/questions/:questionId", requireAdmin, async (req, res) => {
    try {
      const question = await storage.updateQuestion(req.params.questionId as string, req.body);
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/webinars/:id/questions/:questionId", requireAdmin, async (req, res) => {
    await storage.deleteQuestion(req.params.questionId as string);
    res.json({ success: true });
  });

  // ============ Feedback Survey Routes ============
  app.get("/api/webinars/:id/feedback-survey", async (req, res) => {
    const survey = await storage.getFeedbackSurveyByWebinar(req.params.id);
    res.json(survey || null);
  });

  app.post("/api/webinars/:id/feedback-survey", requireAdmin, async (req, res) => {
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

  app.patch("/api/webinars/:id/feedback-survey/:surveyId", requireAdmin, async (req, res) => {
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
  app.get("/api/webinars/:id/analytics", requireAdmin, async (req, res) => {
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
    const sessions = await storage.getUpcomingSessions(req.params.id);
    res.json(sessions);
  });

  app.post("/api/webinars/:id/sessions", requireAdmin, async (req, res) => {
    try {
      const data = insertWebinarSessionSchema.parse({
        ...req.body,
        webinarId: req.params.id
      });
      const session = await storage.createWebinarSession(data);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ============ Webinar Duplication ============
  app.post("/api/webinars/:id/duplicate", requireAdmin, async (req, res) => {
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
  app.get("/api/webinars/:id/available-sessions", async (req, res) => {
    try {
      const webinar = await storage.getWebinar(req.params.id as string);
      if (!webinar) return res.status(404).json({ message: "Webinar not found" });

      const scheduleMode = webinar.scheduleMode as any;
      const now = new Date();

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

      const allSessions = await storage.getWebinarSessions(webinar.id);
      const futureSessions = allSessions
        .filter(s => new Date(s.scheduledStart) > now && s.status === "scheduled")
        .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
        .slice(0, 20);

      if (futureSessions.length > 0) {
        return res.json({
          mode: "recurring",
          sessions: futureSessions,
        });
      }

      return res.json({
        mode: "fixed",
        sessions: [{ id: "main", scheduledStart: webinar.startTime, status: "scheduled" }],
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ============ Recurring Schedule Generation ============
  app.post("/api/webinars/:id/generate-sessions", requireAdmin, async (req, res) => {
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

          const session = await storage.createWebinarSession({
            webinarId: webinar.id,
            scheduledStart: sessionDate,
            status: "scheduled",
          });
          sessions.push(session);
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

  return httpServer;
}
