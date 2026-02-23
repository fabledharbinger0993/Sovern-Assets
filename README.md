# Sovern Assets

Unified Sovern codebase (imported from Replit and now maintained in this GitHub repository).

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Express + TypeScript
- Database: PostgreSQL with Drizzle ORM
- AI: Ollama (default) or OpenAI (provider switch via env)

## Project Structure

- `client/` React app
- `server/` Express API and runtime
- `shared/` shared schema and API contracts
- `script/` build pipeline scripts
- `attached_assets/` imported assets/reference files

## Required Environment Variables

- `DATABASE_URL`
- `AI_PROVIDER` (`ollama` or `openai`, default `ollama`)

### Ollama (default)

- `OLLAMA_BASE_URL` (example: `http://127.0.0.1:11434/v1` or your remote Ollama endpoint)
- `OLLAMA_MODEL` (example: `llama3.1:8b`, `mistral`, `phi`)
- `OLLAMA_API_KEY` (optional; default placeholder is used)

### OpenAI (optional fallback)

- `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY`
- `OPENAI_BASE_URL` or `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `OPENAI_MODEL` or `AI_INTEGRATIONS_OPENAI_MODEL`

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

## Cloud Deployment

### Fly.io (recommended for this Express server)

1. Install Fly CLI and authenticate.
2. Create app (one time): `fly launch --no-deploy`
3. Set secrets:
	- `fly secrets set DATABASE_URL=...`
	- `fly secrets set AI_PROVIDER=ollama`
	- `fly secrets set OLLAMA_BASE_URL=https://<your-ollama-endpoint>/v1`
	- `fly secrets set OLLAMA_MODEL=llama3.1:8b`
	- Optional: `fly secrets set CLOUD_PROVIDER=fly`
4. Deploy: `fly deploy`

### Cloudflare option

This project is an Express server, so Cloudflare is best used as edge/proxy in front of your deployed backend.

- Deploy backend on Fly.io (or any container host).
- Put Cloudflare in front of it (DNS + proxy).
- Optional runtime hint: set `CLOUD_PROVIDER=cloudflare` for proxy-aware behavior.

Note: Cloudflare Workers are not a drop-in runtime for this full Express + Node server.
