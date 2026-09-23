# Agent rules

This repository publishes Thomas Chung's public voice system.

## Product contract

- Treat voice as a versioned transformation system, not a persona prompt.
- Preserve truth, uncertainty, privacy, and authorization ahead of style.
- Public content must be synthetic or already public and explicitly reviewed.
- Publish broad drafting preferences, but never private habits, recurring phrases, relationship-specific behavior, sensitive operating patterns, authentication cues, or identifiable third-party material.
- The system drafts for review. It never grants authority to speak, approve, commit, send, sign, or act for Thomas.

## Development

- Write a failing test before production behavior.
- Never weaken a gate to make it pass.
- Run `npm test` and `npm run build` before claiming completion.
- Inspect the built site in a browser at desktop and mobile widths.
- Keep machine resources usable without client JavaScript.
