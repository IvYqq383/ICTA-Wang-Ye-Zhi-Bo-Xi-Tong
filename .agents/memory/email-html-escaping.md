---
name: Email HTML escaping
description: Untrusted viewer input rendered into notification email HTML must be escaped.
---

Any viewer-supplied string (asker name, question text, registrant fields, etc.) that gets interpolated into an HTML email body in `server/gmail.ts` must be HTML-escaped first.

**Why:** These endpoints are public (no auth on registration / question POST). Raw interpolation lets an attacker inject HTML/links into emails delivered to the host — a content-spoof/phishing vector. Caught in code review.

**How to apply:** Use the `escapeHtml` helper in `server/gmail.ts` (escapes & < > " ') for every dynamic field before templating. Plain-text fields in subject lines are lower risk but prefer escaping there too.
