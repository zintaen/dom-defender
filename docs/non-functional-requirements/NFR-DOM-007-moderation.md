---
id: NFR-DOM-007
title: "Moderation and sanitization for user-submitted text"
category: Safety
status: proposed
verify: T
owner: Stephen Cheng
created: 2026-06-24
closes: []
related: [TASK-DD-COMM-001, TASK-DD-COMM-004, NFR-DOM-003]
source:
  - TASK-DD-COMM-001 (display name), TASK-DD-COMM-004 (comments) introduce user text
  - app/replay/[id] (where comments render)
---

## Target

All user-submitted text (display name, comments, and any future free text) MUST pass a
moderation gate before storage and MUST be sanitized before render:

- length cap + a profanity/denylist filter + per-user rate limit (reuse the NFR-DOM-003
  limiter primitive);
- output sanitization so no user text can inject markup or script (XSS) into any page;
- a report path that flags content for review and a takedown action.

## Why

The community features add the first surfaces where one player's text is shown to others. That
is exactly where abuse and stored XSS enter. Building the gate once, before the features that
need it, keeps COMM-001 and COMM-004 from each inventing their own half-measure.

## Acceptance and verification

1. A denylisted or over-length submission is rejected; a flood from one user is rate limited.
2. Markup or script in a comment renders inert (no XSS) - verified by a sanitizer test with
   hostile inputs.
3. Reporting flags an item; a takedown removes it from public view.

```
# verify
npm test -- moderation sanitize
```

## Notes

This NFR blocks TASK-DD-COMM-004 and gates the display-name field in TASK-DD-COMM-001. Keep the
denylist data-driven so it can be tuned without a deploy. A hosted moderation API can slot in
later behind the same interface; the denylist is enough for launch.
