---
name: WebSocket chat server-bound identity
description: Security rule for the webinar chat WS handler
---

The chat WebSocket handler binds `currentWebinarId` / `currentSessionId` / `isHost` to the connection at join time. The `chat` message handler must use those server-bound values, NOT the `webinarId`/`sessionId` fields in the client message payload.

**Why:** trusting client-supplied ids lets a viewer spoof another webinar/session — polluting other rooms' chat and (since viewer questions trigger a Claude reply) driving up AI cost on arbitrary webinars. A code review flagged this as a serious access-control issue.

**How to apply:** in `case "chat"`, derive `webinarId = currentWebinarId` and (for viewers) `sessionId = currentSessionId`; bail if not joined. `hostReply` legitimately targets a specific viewer's sessionId chosen by a verified host, so that branch may keep using the payload's sessionId but is gated by `isHost`.
