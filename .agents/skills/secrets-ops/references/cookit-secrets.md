# Cookit Secret Inventory

## Private backend values
- `GOOGLE_API_KEY`
  local file: `backend/.env.local`
  runtime: backend only
  never expose to frontend or `VITE_*`
- `GOOGLE_CX`
  local file: `backend/.env.local`
  runtime: backend only
- `DATABASE_URL`
  local file: `backend/.env` or `backend/.env.local`
  runtime: backend and Prisma only
  note: local SQLite path is low sensitivity; hosted DB credentials are secret and must move to `backend/.env.local` or deployment secrets

## Public frontend values
- `VITE_API_BASE_URL`
  local file: `frontend/.env.local`
  runtime: browser
  note: public value, not a secret

## Non-secret defaults
- `PORT`
  file: `backend/.env` or `.env.example`

## Current code touchpoints
- `backend/src/config/env.ts`
- `backend/src/index.ts`
- `backend/src/services/GoogleSearchService.ts`
- `backend/prisma.config.ts`
- `backend/prisma/schema.prisma`
- `frontend/src/api.ts`

## Audit checklist for new integrations
- If the value authenticates against a third party, keep it out of frontend code.
- If the browser must know a value, treat it as public and prefix with `VITE_`.
- If server code needs a new env var, add it to `backend/src/config/env.ts` and to a sanitized example file.
- If deployment is introduced, mirror backend secrets into the platform secret manager instead of repo files.
