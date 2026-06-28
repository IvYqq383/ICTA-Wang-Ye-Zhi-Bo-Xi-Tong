---
name: WebSocket host authorization
description: Rules for authorizing host/viewer actions over the /ws WebSocket in this multi-tenant app.
---

# WebSocket authorization invariants

**Rule:** Every authz-critical WS handler must derive the webinar id and session id from the *server-bound connection state*, never from the client-supplied `message.data`. Host privilege must be tied to a verified, session-owned webinar.

**Why:** This is a multi-tenant SaaS. The original `joinAsHost` granted host to any socket that sent a webinar id, and handlers (`hostReply`, `triggerPoll`, `like`, `vote`, `scheduledMessage`) trusted client-supplied `webinarId`/`sessionId`. That let any authenticated user push CTAs/tips/chat/polls or mutate likes/votes across other tenants' webinars (IDOR / broken access control). An architect review repeatedly FAILed until every handler was bound to server state.

**How to apply (the pattern that passed review):**
- The express-session middleware is extracted in `server/index.ts` and passed into `registerRoutes(httpServer, app, sessionMiddleware)`.
- The `wss.on("connection", (ws, req) => ...)` runs `sessionMiddleware(req, {}, cb)` to parse the session cookie off the upgrade request into `sessionUserId` (await a `sessionReady` promise before any host check).
- `joinAsHost`: await `sessionReady`, then require `storage.getWebinar(webinarId).userId === sessionUserId` before setting `isHost = true`.
- `join`: if `isHost` is already true, `break` — never let a viewer `join` retarget/downgrade a host socket's webinar context.
- All host-only handlers: gate on `isHost && currentWebinarId`, and use `currentWebinarId` (not client data) as the webinar id.
- Targeted sends (host→one session): require `webinarSessions.get(currentWebinarId)?.has(sessionId)`.
- Viewer actions (`like`, `vote`): require `currentWebinarId && currentSessionId`, use those (ignore client ids); for `vote` also verify `poll.webinarId === currentWebinarId`.
- `liveCta` (and any user-supplied URL): validate scheme server-side — only allow `https?://`, `/`, `mailto:`, `tel:` (block `javascript:`/`data:`).
