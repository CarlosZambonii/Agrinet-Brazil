# Fruitful Backend (Agrinet Platform)

This backend powers Agrinet services using Node.js, Express, and Server-Sent Events (SSE) for streaming chat updates.

## Overview

- Runtime: Node.js + Express
- Database: MariaDB / MySQL (local-first architecture)
- Streaming: SSE (`/events`, `/stream/:conversationId`)
- Auth: JWT middleware; API Key support for some endpoints
- Queues: BullMQ for SMS and background jobs
- Uploads: Files stored under `backend/uploads` served at `/uploads`

## Quickstart

```bash
cd backend
npm install
node server.js
```

Docker-based local dev:
```bash
docker compose up --build
```

The API typically runs on port 5000 (see docker-compose).

## Environment

Required (or set via `.env`):
- JWT_SECRET
- TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER (for SMS; optional TWILIO_STATUS_CALLBACK_URL)
- STRIPE_KEY (if deposits enabled)

## Redis Configuration

To run Redis, ensure it’s included in your `docker-compose.yml` file:

```yml
redis:
  image: redis:latest
  command: redis-server
  ports:
    - "6379:6379"
  networks:
    - backend
```

Set the following environment variables in `.env`:
- `REDIS_HOST=redis`
- `REDIS_PORT=6379`

These settings allow the backend services to connect to Redis for queue management and other tasks.

## Routing

Main mounts (see `server.js`):
- `/health` – health check
- `/uploads/*` – static uploads
- `/events` – SSE broadcast channel
- `/stream/:conversationId` – SSE per‑conversation stream

Domain routes (when not in minimal mode):
- `/api/marketplace` → marketplace
- `/users` → user management
- `/federation` → federation sync

## Chat & Streaming

Endpoints (used by the Chat UI):
- `GET /conversations` → list
- `POST /conversations` → create
- `PUT /conversations/:id` → rename
- `POST /conversations/:id/pin` → toggle pin
- `DELETE /conversations/:id` → delete
- `GET /messages/:conversationId` → list messages
- `POST /messages/:conversationId` → send message (optionally with file)
- `GET /stream/:conversationId` (SSE) → events:
  - `token`: `{ id, token }`
  - `message`: `{ message }`

Server emitters (global):
- `emitToken(conversationId, id, token)`
- `emitMessage(conversationId, message)`

## Transactions & Notifications

- `POST /api/marketplace/transactions`
- `POST /api/marketplace/transactions/release-escrow`
- `POST /api/marketplace/transactions/rate`
- `POST /api/marketplace/transactions/ping`

## Security & Auth

- CORS: restricted to `https://www.ntari.org`
- JWT: middleware enforces authorization on protected routes
- API Key for SSE: the Chat UI passes an API key as `x-api-key` query parameter for SSE requests; the server accepts `x-api-key` (and also `api_key` for backward compatibility) on `/events` and `[...]`

## Jobs & SMS

- `bull/smsQueue.js`: BullMQ worker that sends SMS via Twilio
- `routes/smsRoutes.js`: webhooks for incoming/status
- Background workers in Docker Compose:
  - `federation-sync`, `key-expiry-cleaner`

## Useful Paths

- Entry: `backend/server.js`
- Models: `backend/models/*`
- Routes: `backend/routes/*`
- Repositories: `backend/repositories/*`
- Utils: `backend/utils/*`
- Queues: `backend/bull/*`
- Uploads: `backend/uploads`

## Testing

See `backend/package.json` for current test commands.

---
Contributions welcome! Please keep `server.js` slim by adding routes and logic in domain folders.
