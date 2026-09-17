# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ContaAssist is a Colombian accounting-data preparation platform: it ingests documents (PDF/XML/Excel/CSV/images), normalizes and validates them, and transforms them into the import format of a destination accounting system (WordOffice, Siigo, Excel/CSV). It does **not** replace an accounting system — its output is "data ready to import."

Full design docs live in `docs/` — read them before making architectural changes, don't duplicate their content in code comments:
- `docs/architecture.md` — pipeline architecture, folder layout, risks
- `docs/database.md` — full data model (PostgreSQL), including tables not yet implemented
- `docs/api.md` — full planned REST surface
- `docs/modules.md`, `docs/data-flow.md` — how ingest → validate → review → map → transform → export fit together, and document/carga state machines
- `docs/validation-engine.md`, `docs/transformation-engine.md`, `docs/export-engine.md` — design of those engines and the adapter interface
- `docs/security.md` — auth/authorization/multi-tenant security model
- `docs/roadmap.md` — **phase-by-phase status; check this first to know what's actually built vs. planned**

## Development is phased — don't build ahead of the current phase

`docs/roadmap.md` defines 18 phases (auth → empresas/usuarios → dashboard → centro de carga → documentos → validation engine → ... → adapters). Each phase must leave a working, tested base for the next — don't jump ahead and scaffold a later phase's tables/endpoints/UI early.

Concretely: when a module's backing data doesn't exist yet (e.g. `documentos`, `cargas` — not implemented as of the Dashboard phase), the frontend shows an explicit "not yet available, see Fase N" placeholder (see `frontend/src/lib/navegacion.js` + `PlaceholderPage.jsx`) rather than fabricated zeros or mock data that could be mistaken for real state.

**Adapters for WordOffice/Siigo must never be built from assumptions.** Each needs official documentation, an official import template, and a real sample file before implementation starts (see `docs/transformation-engine.md`). If that's missing, the adapter stays a documented gap — don't guess at field layouts.

## Commands

### Backend (`backend/`)
```
npm run dev              # nodemon-style watch (node --watch src/server.js), port from .env (default 4000)
npm start                # run once, no watch
npm test                 # node --test — runs backend/test/*.test.js
node --test test/jwt.test.js   # run a single test file
npm run prisma:generate  # regenerate Prisma client after schema.prisma changes
npm run prisma:migrate   # prisma migrate dev (interactive — see note below)
npm run prisma:seed      # roles catalog + optional demo admin/empresa (needs SEED_* env vars)
```
Requires `backend/.env` (copy from `.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `CORS_ORIGIN` (must match the frontend dev origin, `http://localhost:5173`).

**`prisma migrate dev` needs an interactive TTY** and will refuse to run in a non-interactive shell for any migration with a destructive warning. In that case, generate the SQL non-interactively instead and apply it explicitly:
```
npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "<a genuinely empty database>" --script > prisma/migrations/<timestamp>_<name>/migration.sql
npx prisma migrate deploy
```
**Never pass the real/dev database URL as `--shadow-database-url`** — Prisma treats it as disposable and will wipe it to compute the diff. Use a separate empty database (or `postgresql:///template1`-style scratch DB) for this.

### Frontend (`frontend/`)
```
npm run dev      # Vite dev server, http://localhost:5173
npm run build    # production build (also the fastest correctness smoke test)
npm run lint     # oxlint
```
Optional `frontend/.env` with `VITE_API_URL` (defaults to `http://localhost:4000` if unset).

### Local database
The project uses **PostgreSQL, not SQL Server** — despite `docs/database.md`'s early sections referencing SQL Server, the engine was switched early in development (see the migration note at the top of that file and in `docs/roadmap.md`) because this is developed on macOS without Docker. Install and start it via Homebrew, not a container:
```
brew install postgresql@16 && brew services start postgresql@16
```

## Architecture

Monorepo: `frontend/` (React + Vite + Tailwind v4), `backend/` (Express + Prisma), `docs/`, no shared root package.json — each app manages its own dependencies.

### Backend module layout (`backend/src/`)
Mirrors the pipeline in `docs/architecture.md`: `modules/{empresas,usuarios,terceros,documentos,cargas,exportaciones,reportes}` for CRUD-ish business modules, plus standalone engine directories (`document-processing/`, `validation-engine/`, `transformation-engine/`, `export-engine/`, `adapters/{wordoffice,siigo,excel,csv}`, `authentication/`, `audit/`, `ai/`, `shared/`). Directories still containing only `.gitkeep` are intentionally empty — that module's phase hasn't been implemented yet.

Within an implemented module, the pattern is `*.service.js` (Prisma queries + business rules, throws a module-specific `Error` subclass with a `.status`) → `*.controller.js` (input validation + HTTP status mapping, no business logic) → `*.routes.js` (wires middleware + controller). Follow this even for small modules — don't put Prisma calls in controllers or routes.

### Multi-tenancy and auth
Every business table carries `empresa_id`; a user's roles-per-empresa live in `usuario_empresa_rol` (unique per `(usuario, empresa)` — **not** including role, so a user has exactly one role per empresa). Roles: `ADMINISTRADOR`, `AUXILIAR_CONTABLE`, `CONTADOR`, `CONSULTA`.

Auth is JWT access (short-lived) + refresh (longer-lived, separate secret), with the user's `{empresaId, rolCodigo}[]` embedded in the access token payload (see `backend/src/authentication/jwt.js`) so authorization doesn't require a DB round-trip per request. This means **role/empresa membership changes don't take effect until the client refreshes its token** — the frontend's `refrescarPerfil()` (`AuthContext.jsx`) exists specifically to force that after an action that changes them (e.g. after `POST /api/empresas`).

Two different authorization middlewares in `authentication/auth.middleware.js`, used depending on where the empresa id lives in the request:
- `requireEmpresa` — reads the `X-Empresa-Id` header (used by resource routes like `/api/documentos`, `/api/cargas`, etc. once they exist)
- `requireEmpresaParam(paramName)` — reads a route param (used by `/api/empresas/:id/...`)

Both validate the id against the caller's JWT-embedded empresas before setting `req.empresaId`/`req.rolCodigo` — never trust an empresa id from the client without this. `requireRol(...roles)` must run after one of the above.

A business rule enforced in `empresas.service.js` worth knowing about: an empresa can never be left with zero active `ADMINISTRADOR`s — role/activo changes that would violate this are rejected (409).

### Frontend
`AuthContext` (`src/context/AuthContext.jsx`) + `src/lib/api.js` are the only things that touch tokens/localStorage. `api.js` does a one-shot silent refresh-and-retry on a 401 before giving up. All API calls for `/api/empresas/*` deliberately omit the `X-Empresa-Id` header (`sinEmpresa: true`) since that module resolves the empresa from the URL, not the header — keep that distinction when adding calls for a module that uses the header pattern instead.

The sidebar (`src/lib/navegacion.js` → `MODULOS`) is the single source of truth for the app's module list from `docs/architecture.md` §10; a module without `implementado: true` renders `PlaceholderPage` automatically via `App.jsx`'s route generation — add real routes there when a module's phase lands instead of hand-adding a `<Route>`.

## Conventions carried over from the project brief

- Business identifiers are UUIDs (`gen_random_uuid()`), small catalogs (`roles`, `impuestos`, etc.) use `SERIAL` ints.
- Spanish for all domain/business names (models, fields, routes, UI copy) — English is fine for generic infra code, but don't translate domain vocabulary (`empresa`, `tercero`, `documento`, `cuenta_contable`, etc.).
- Only commit when explicitly asked; commits end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
