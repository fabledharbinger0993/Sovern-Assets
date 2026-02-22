# Sovern Assets

Unified Sovern codebase (imported from Replit and now maintained in this GitHub repository).

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Express + TypeScript
- Database: PostgreSQL with Drizzle ORM
- AI: OpenAI via Replit AI Integrations environment variables

## Project Structure

- `client/` React app
- `server/` Express API and runtime
- `shared/` shared schema and API contracts
- `script/` build pipeline scripts
- `attached_assets/` imported assets/reference files

## Required Environment Variables

- `DATABASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`

## Run Locally

1. Install dependencies:

	`npm install`

2. Push schema to database:

	`npm run db:push`

3. Start dev server:

	`npm run dev`

## Build / Start

- Build: `npm run build`
- Start: `npm run start`
