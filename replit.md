# HiddenFreeways

A retro Xfire-style invite-only gated community web app for urban explorers (urbex). Think old-school gaming community meets underground exploration culture.

## Architecture

**Monorepo (pnpm workspaces):**
- `artifacts/hidden-freeways` — React + Vite frontend (port 19571, preview path `/`)
- `artifacts/api-server` — Express 5 REST API (port 8080, path `/api`)
- `lib/db` — Drizzle ORM schema + PostgreSQL client
- `lib/api-spec` — OpenAPI 3.1 spec (2211 lines)
- `lib/api-client-react` — Generated React Query hooks (Orval)
- `lib/api-zod` — Generated Zod schemas (Orval)
- `scripts` — Seed and utility scripts

## Key Technologies

- **Frontend:** React 19, Vite 7, Tailwind v4, shadcn/radix UI, wouter routing, @tanstack/react-query, leaflet/react-leaflet maps, framer-motion
- **Backend:** Express 5, express-session + connect-pg-simple, bcryptjs auth, pino logging
- **Database:** PostgreSQL (Replit managed), Drizzle ORM, drizzle-kit migrations

## Features

- **Invite-only auth** — username/password login, invite code registration
- **Forum** — categories, threads, posts, upvote/downvote voting system
- **Real-time-style chat rooms** — public rooms + trust-gated rooms
- **Crews** — private group chats
- **Direct Messages** — private 1-on-1 messaging
- **Location sharing** — interactive Leaflet maps, trust-level gated, per US state
- **Announcements** — admin-broadcasted site-wide banners
- **Admin panel** — user management, invite generation, role/trust assignment
- **Activity feed** — recent activity across the site
- **Trust/role system** — trust levels 0-3, roles: member/moderator/admin

## Environment Variables

- `SESSION_SECRET` — Express session signing secret (set in Replit Secrets)
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — auto-set by Replit DB

## Default Admin Credentials

- **Username:** `admin`
- **Password:** `ChangeMe!2026`

Change immediately after first login via the admin panel.

## Seed Data

- 12 Midwest US states seeded
- 6 forum categories (General, Trip Reports, Scouting, History, Gear, Safety)
- 3 chat rooms (Lobby, Field Talk, Trusted Only)
- 1 sample location (Damen Silos, Chicago)
- 1 welcome thread + pinned post
- 1 sample announcement
- 1 sample invite code (printed during seed)

## Running Locally

Both workflows start automatically:
- `artifacts/api-server: API Server` — builds and starts the API
- `artifacts/hidden-freeways: web` — starts the Vite dev server

To re-seed: `pnpm --filter @workspace/scripts run seed`
To push schema changes: `pnpm --filter @workspace/db run push`

## API Routes (base: `/api`)

- `POST /auth/register` — register with invite code
- `POST /auth/login` / `POST /auth/logout` / `GET /auth/me`
- `GET/POST /categories` — forum categories
- `GET/POST /threads` — forum threads
- `GET/POST /threads/:id/posts` — thread replies
- `POST /votes/thread/:id` / `POST /votes/post/:id` — voting
- `GET /states` / `GET /states/:slug/locations` — location browsing
- `POST /locations` — submit a location (trusted users)
- `GET /chat/rooms` / `GET /chat/rooms/:slug/messages` / `POST /chat/rooms/:slug/messages` — chat
- `GET/POST /crews` — crew management
- `GET/POST /messages` — direct messages
- `GET /announcements` — site announcements
- `GET /feed` — activity feed
- `GET/POST/PATCH /admin/*` — admin operations (admin only)
- `GET /invites` / `POST /invites` — invite code management
