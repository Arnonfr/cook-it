---
name: secrets-ops
description: Audit and manage secrets for the Cookit project. Use when adding API keys, tokens, database credentials, third-party integrations, deployment config, or when deciding whether a value belongs in backend private env, frontend public env, code, or a hosted secret manager.
---

# Secrets Ops

Use this skill for any config or integration that may involve secrets.

## Workflow
1. Audit usages with `rg` for `process.env`, `import.meta.env`, `dotenv`, `TOKEN`, `KEY`, `SECRET`, `PASSWORD`, `DATABASE_URL`, provider names, and new SDK config.
2. Classify each value:
   - Backend-only secret: server runtime only. Store in `backend/.env.local` for local development.
   - Frontend public config: only values safe to expose in the browser. Store in `frontend/.env.local` with `VITE_` prefix.
   - Non-secret default: safe local default such as `PORT`. Keep in `.env.example` and optionally local `.env`.
   - Production secret: never commit to repo; map to the deployment platform secret manager.
3. Refuse to place secrets in React code, `VITE_*` vars, committed JSON, or examples.
4. Centralize backend env reads in `backend/src/config/env.ts`. New backend env keys should be added there instead of reading `process.env` across files.
5. Keep example files sanitized and update ignore rules for any new secret file pattern.

## Cookit Rules
- Real API keys, database passwords, tokens, OAuth secrets, SMTP creds, private URLs with credentials:
  store only in `backend/.env.local` locally.
- `frontend/.env.local` may contain only public browser config. `VITE_*` is public by definition.
- `PORT` is not a secret.
- `DATABASE_URL` is secret if it contains credentials; if it is a local SQLite path, it is not sensitive but still belongs in backend env, never frontend.
- If a new external provider is added, update the inventory in `references/cookit-secrets.md`.

## Current Cookit Inventory
Read `references/cookit-secrets.md` before changing secret placement. It contains the project-specific map of what belongs where.

## Deliverables
- Put local private values in `backend/.env.local`.
- Keep placeholders only in `*.example`.
- Update `backend/src/config/env.ts` if new backend vars are introduced.
- Report any secret exposure risk explicitly.
