# Sovern - Cooperative Self-Referencing Cognitive Agent

## Overview

Sovern is a web-based AI chat application that implements a "cooperative self-referencing cognitive agent." It features a recursive cognitive loop: users converse with the AI, which triggers internal "Congress debates" (logic layer), extracts insights (memory layer), and evolves its reasoning over time. The app has four main views: Chat, Congress (Logic), Insights (Memory), and Settings (Telemetry).

The project is a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for persistence and OpenAI for AI responses. It was originally conceived as a Swift/iOS app (reference docs in `attached_assets/`) but is implemented here as a web application.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)

- **Location**: `client/src/`
- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight router) with 4 main routes: `/` (Chat), `/logic` (Congress), `/memory` (Insights), `/settings` (Telemetry)
- **State Management**: TanStack React Query for server state; no client-side global store
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, Tailwind CSS for styling
- **Animations**: Framer Motion for page transitions and UI animations
- **Charts**: Recharts for statistics visualization in Settings
- **Theme**: Dark mode only — enforced via CSS variables in `client/src/index.css`. Uses custom fonts (Outfit for display, Plus Jakarta Sans for body)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (Express + Node.js)

- **Location**: `server/`
- **Framework**: Express 5 running on Node.js with TypeScript (via tsx)
- **Entry point**: `server/index.ts` creates HTTP server, registers routes, sets up Vite dev middleware or static serving
- **API Routes**: Defined in `server/routes.ts`, following the contract in `shared/routes.ts`
- **Key endpoints**:
  - `GET /api/chat/messages` — List all chat messages
  - `POST /api/chat/messages` — Send user message, triggers AI response generation
  - `GET /api/chat/search` — Search messages
  - `GET /api/chat/stats` — Get message statistics
  - `GET /api/logic` — List logic (Congress debate) entries
  - `GET /api/logic/:id` — Get single logic entry
  - `GET /api/memory` — List memory (insight) entries
  - `GET /api/memory/:id` — Get single memory entry
- **AI Integration**: OpenAI SDK configured with Replit AI Integrations environment variables (`AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`)
- **Database seeding**: On startup, if no messages exist, seeds initial logic entry, memory entry, and welcome message

### Shared Layer

- **Location**: `shared/`
- **Schema** (`shared/schema.ts`): Drizzle ORM table definitions for PostgreSQL:
  - `chat_messages` — role, content, timestamp, linked logic/memory IDs, token count, typing state
  - `logic_entries` — topic, paradigm weight, debate transcript, resolution
  - `memory_entries` — core insight, supporting evidence (JSONB array), tags (JSONB array), confidence score
  - `conversations` and `messages` tables (in `shared/models/chat.ts`) — used by Replit integration modules
- **Routes** (`shared/routes.ts`): API contract definitions with Zod schemas for request/response validation. Includes a `buildUrl` helper for parameterized paths
- **Validation**: Zod schemas generated from Drizzle tables via `drizzle-zod`

### Database

- **Type**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-kit` for migrations
- **Connection**: `server/db.ts` creates a `pg.Pool` and wraps it with Drizzle
- **Schema push**: `npm run db:push` applies schema changes directly
- **Migration output**: `./migrations/` directory

### Storage Pattern

- **Interface**: `IStorage` in `server/storage.ts` defines all data access methods
- **Implementation**: `DatabaseStorage` class uses Drizzle queries against PostgreSQL
- **Exported as**: `storage` singleton used by route handlers

### Build System

- **Dev**: `tsx server/index.ts` with Vite dev server middleware (HMR via `server/vite.ts`)
- **Production build**: Custom `script/build.ts` that runs Vite build for client and esbuild for server, outputting to `dist/`
- **Server bundle**: esbuild bundles server code as CommonJS (`dist/index.cjs`), externalizing most dependencies except an allowlist of commonly used packages

### Replit Integrations (Pre-built Modules)

Located in `server/replit_integrations/` and `client/replit_integrations/`:
- **Audio**: Voice recording, playback, and streaming (WebM/Opus, PCM16, AudioWorklet)
- **Chat**: Generic conversation CRUD using the `conversations`/`messages` tables
- **Image**: Image generation via OpenAI's gpt-image-1 model
- **Batch**: Batch processing utility with rate limiting and retries

These are scaffolded integration modules — not all are actively wired into the main app routes.

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **OpenAI API** (via Replit AI Integrations): Powers AI responses in chat. Uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Key NPM Packages
- **Frontend**: React, Wouter, TanStack React Query, Framer Motion, Recharts, shadcn/ui (Radix UI + Tailwind CSS), date-fns, cmdk
- **Backend**: Express 5, Drizzle ORM, OpenAI SDK, connect-pg-simple, Zod
- **Build**: Vite, esbuild, tsx, drizzle-kit
- **Replit-specific**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key for AI responses |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL (Replit proxy) |