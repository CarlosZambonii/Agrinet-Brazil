# Agrinet — Complete Technical Documentation

> **Audience:** Backend/Full-Stack Engineers  
> **Last Updated:** 2026-04-25  
> **Stack:** Node.js + Express · Next.js 14 · MariaDB · Redis · Stripe · Cloudflare R2 · Socket.IO · Docker

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend Deep Dive](#3-backend-deep-dive)
   - [Entry Point & Server Bootstrap](#31-entry-point--server-bootstrap)
   - [Middleware Stack](#32-middleware-stack)
   - [API Routes Reference](#33-api-routes-reference)
   - [Services Layer](#34-services-layer)
   - [Repository Layer](#35-repository-layer)
4. [Database Schema & ERD](#4-database-schema--erd)
5. [Authentication & Authorization Flow](#5-authentication--authorization-flow)
6. [Transaction & Payment Flow](#6-transaction--payment-flow)
7. [Real-Time Messaging Flow](#7-real-time-messaging-flow)
8. [Fraud Detection System](#8-fraud-detection-system)
9. [Federation Sync System](#9-federation-sync-system)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Frontend ↔ Backend Integration Map](#11-frontend--backend-integration-map)
12. [Infrastructure & Deployment](#12-infrastructure--deployment)
13. [Observability & Metrics](#13-observability--metrics)
14. [Environment Variables Reference](#14-environment-variables-reference)
15. [Security Model](#15-security-model)
16. [Known Gaps & Future Work](#16-known-gaps--future-work)

---

## 1. System Overview

**Agrinet** is a decentralized agricultural marketplace designed for Brazil. It connects rural producers, buyers, and service providers through a platform that handles:

- Product listing and discovery (grains, fruits, livestock, machinery)
- Real-time buyer-seller messaging (Socket.IO + SSE)
- Escrow-based payments via Stripe (PIX-ready)
- Wallet system with full financial audit trail
- Fraud detection using velocity scoring and Redis counters
- Federated node synchronization for decentralized deployment
- Admin dashboard for moderation, fraud review, and financial oversight

**Core Philosophy:** Every financial operation is logged immutably. Escrow is locked until explicitly released. Fraud scoring runs on every transaction. The system is designed to be deployable as multiple federated nodes that sync with each other.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                  │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │              Next.js 14 Frontend  (Port 3000)                    │  │
│   │   Landing · Marketplace · Chat · Profile · Admin Dashboard       │  │
│   │   Tailwind CSS · Shadcn/ui · Framer Motion · Socket.IO client    │  │
│   └──────────────────┬───────────────────────────────────────────────┘  │
│                      │ HTTPS / REST / WebSocket                         │
└──────────────────────┼──────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────────────┐
│                        API LAYER  (Port 5000)                           │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │            Node.js + Express  +  Socket.IO Server               │   │
│   │                                                                  │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │   │
│   │  │  Routes  │ │Services  │ │   Jobs   │ │   Federation     │   │   │
│   │  │  /auth   │ │ txn svc  │ │ payment  │ │  sync worker     │   │   │
│   │  │  /listing│ │ fraud svc│ │ expiry   │ │  export/import   │   │   │
│   │  │  /txn    │ │ admin aud│ │ metrics  │ │  node registry   │   │   │
│   │  │  /wallet │ │ stripe   │ │ BullMQ   │ │                  │   │   │
│   │  │  /msg    │ └──────────┘ └──────────┘ └──────────────────┘   │   │
│   │  │  /pay    │                                                    │   │
│   │  │  /admin  │  Middleware: JWT auth · rate limit · sanitize      │   │
│   │  └──────────┘  · multer upload · error handler                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└──────────┬────────────────────┬─────────────────────┬───────────────────┘
           │                    │                     │
┌──────────▼──────┐   ┌─────────▼────────┐  ┌────────▼──────────────────┐
│   MariaDB 11    │   │    Redis 7        │  │    External Services      │
│  (Port 3306)    │   │   (Port 6379)     │  │                           │
│                 │   │                   │  │  ┌──────────────────────┐ │
│  Main database  │   │  • Session cache  │  │  │  Stripe Payments API │ │
│  All tables     │   │  • Rate limit     │  │  │  (PaymentIntent +    │ │
│  Transactions   │   │    counters       │  │  │   Webhook handler)   │ │
│  Wallets        │   │  • Fraud velocity │  │  └──────────────────────┘ │
│  Messages       │   │    counters       │  │                           │
│  Audit logs     │   │  • BullMQ queues  │  │  ┌──────────────────────┐ │
│                 │   │  • AOF persistence│  │  │  Cloudflare R2       │ │
│                 │   │                   │  │  │  (Image/file storage)│ │
└─────────────────┘   └───────────────────┘  │  └──────────────────────┘ │
                                             └───────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      OBSERVABILITY (optional profile)                   │
│                                                                         │
│   Prometheus (9090) ← scrapes /metrics endpoint every 15s              │
│   Grafana (3001)    ← dashboards + alerting                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Deep Dive

### 3.1 Entry Point & Server Bootstrap

**File:** `backend/server.js`

```
server.js boot sequence:
┌─────────────────────────────────────────────────────────────┐
│ 1. Import dependencies (express, http, socket.io, cors...)  │
│ 2. Register Stripe webhook route FIRST (requires raw body)  │
│ 3. Apply global middleware:                                  │
│    - cors (allow ntari.org, localhost:3000, localhost:3001)  │
│    - express.json()                                          │
│    - express.urlencoded()                                    │
│ 4. Mount all API routers (/auth, /listings, /transactions…)  │
│ 5. Attach Socket.IO to the HTTP server                       │
│ 6. Register Socket.IO event handlers                         │
│ 7. Register SSE endpoint (GET /stream/:conversationId)       │
│ 8. Start background jobs:                                    │
│    - Payment expiry check (every 60s)                        │
│    - Prometheus gauge refresh (every 15s)                    │
│ 9. Start HTTP server on PORT (default: 5000)                 │
└─────────────────────────────────────────────────────────────┘
```

**Key decision:** Stripe webhook is registered before `express.json()` because Stripe signature validation requires the raw request body. Any route mounted after `express.json()` will have the body parsed and the raw buffer lost.

---

### 3.2 Middleware Stack

Each incoming request flows through the following pipeline:

```
Incoming Request
       │
       ▼
┌──────────────────────────────────────────────────┐
│  1. CORS                                         │
│     Origins: ntari.org, localhost:3000/3001      │
│     + ALLOWED_ORIGINS env var (comma-separated)  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  2. Rate Limiter (express-rate-limit)            │
│     ┌─────────────────────────────────────────┐ │
│     │ authLimiter:       20 req / 15 min / IP │ │
│     │ strictWriteLimiter:30 req / 10 min / IP │ │
│     │ userRateLimiter:  100 req / 10 min/user │ │
│     │ federationLimiter: 60 req / 1  min / IP │ │
│     └─────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  3. authenticateToken (on protected routes)      │
│     a. Extract Bearer token from Authorization   │
│     b. jwt.verify(token, JWT_SECRET)             │
│     c. Load user from DB                         │
│     d. Check is_blocked + auto-unblock if expired│
│     e. Set req.user = { id, email, role, ... }   │
│     - Falls back to X-API-Key header validation  │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  4. requireAdmin (admin routes only)             │
│     Check req.user.role === 'admin'              │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  5. sanitizeFields (write routes)                │
│     Strip HTML tags from text fields             │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  6. Route Handler                                │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  7. errorHandler (global, end of middleware)     │
│     Formats error responses as JSON              │
└──────────────────────────────────────────────────┘
```

**Middleware files:**

| File | Export | Purpose |
|------|--------|---------|
| `middleware/authMiddleware.js` | `authenticateToken`, `optionalAuth`, `authMiddleware` | JWT + API key validation |
| `middleware/requireAuth.js` | `requireAuth` | Strict Bearer-only auth |
| `middleware/requireAdmin.js` | `requireAdmin` | Role-based admin gate |
| `middleware/sanitizeInput.js` | `sanitizeFields` | XSS prevention |
| `middleware/uploadMiddleware.js` | `upload` (multer) | File upload (memory storage, 5MB max) |
| `middleware/rateLimiters.js` | Multiple limiters | Per-IP and per-user rate limiting |
| `middleware/errorHandler.js` | `errorHandler` | Centralized error responses |

---

### 3.3 API Routes Reference

All routes are prefixed with the path shown. `Auth` column: `—` = public, `JWT` = Bearer token required, `JWT+Admin` = admin role required, `API_KEY` = internal API key required.

#### Auth Routes (`/auth`)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|-------------|----------|-------|
| `POST` | `/auth/register` | — | `{ email, password }` | `{ token }` | Password ≥ 8 chars. Creates user + wallet. Returns JWT (7d). |
| `POST` | `/auth/login` | — | `{ email, password }` | `{ token }` | Returns JWT on success. |

---

#### Listing Routes (`/listings`)

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| `GET` | `/listings` | Optional | Query: `status, category, state, city, minPrice, maxPrice, search, sort, limit, offset` | `{ listings: [...], total }` | Public. Only `moderation_status = approved` shown. Sort: `recent \| price_asc \| price_desc` |
| `GET` | `/listings/:id` | Optional | — | `{ ...listing }` | Full listing detail |
| `POST` | `/listings` | JWT | `{ title, category, description, price, unit, quantity_available, city, state }` | `{ id, user_id, ... }` | Creates active+approved listing. |
| `PUT` | `/listings/:id` | JWT | `{ title, description, price, quantity_available, city, state, status, unit }` | `{ ...updated }` | Owner or admin only. |
| `DELETE` | `/listings/:id` | JWT | — | `{ success: true }` | Soft delete: sets `status = 'deleted'`. |
| `POST` | `/listings/upload-image` | JWT | `multipart/form-data` with `file` | `{ url }` | Uploads to Cloudflare R2. Returns public URL. |

**Enums:**
- `category`: `graos | frutas | gado | maquinas | outros`
- `unit`: `kg | saca | tonelada | cabeça | unidade`
- `status`: `active | paused | sold | deleted`
- `moderation_status`: `approved | pending`

---

#### Transaction Routes (`/transactions`)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|-------------|----------|-------|
| `GET` | `/transactions` | JWT | — | `[...transactions]` | All txns where `buyer_id = me` OR `seller_id = me` |
| `POST` | `/transactions/from-listing` | JWT | `{ listingId, quantity }` | `{ transactionId, totalAmount }` | Creates transaction, locks escrow, runs fraud scoring. |
| `POST` | `/transactions/:id/pay` | JWT | — | `{ clientSecret, paymentIntentId, amount }` | Creates Stripe PaymentIntent with 15-min expiry. |
| `POST` | `/transactions/:id/release` | JWT | — | `{ message }` | Seller releases escrow → credits seller wallet. |
| `POST` | `/transactions/:id/dispute` | JWT | `{ reason }` | `{ id, ...dispute }` | Opens dispute, sets status → `disputed`. |

---

#### Wallet Routes (`/wallet`)

| Method | Path | Auth | Response | Notes |
|--------|------|------|----------|-------|
| `GET` | `/wallet` | JWT | `{ balance: number }` | User's balance in R$ (Decimal 12,2) |
| `GET` | `/wallet/history` | JWT | `{ history: [...] }` | Last 50 wallet entries, DESC |

**History entry shape:**
```json
{
  "id": 42,
  "type": "purchase | sale | deposit | refund",
  "amount": "-150.00",
  "note": "Transaction #abc...",
  "tx_id": "uuid-or-null",
  "payment_id": "pi_xxx-or-null",
  "created_at": "2026-04-14T12:00:00Z"
}
```

---

#### Message Routes (`/messages`)

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| `POST` | `/messages` | JWT | `{ conversation_id, message, file? }` | `{ id, conversation_id, sender_id, message, attachment_url, attachment_type }` | Validates user is in conversation. Max 2000 chars. |
| `GET` | `/messages` | JWT | Query: `conversation_id, cursor?` | `{ messages: [...], nextCursor }` | 50 per page, cursor-based pagination, DESC. Marks as `delivered`. |
| `POST` | `/messages/:conversationId/read` | JWT | — | — | Marks all messages in conversation as `read` for this user. |

---

#### Conversation Routes (`/conversations`)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|-------------|----------|-------|
| `POST` | `/conversations` | JWT | `{ listing_id }` | `{ id, listing_id, buyer_id, seller_id, ... }` | Idempotent. Returns existing if conversation already exists for this buyer+listing. |
| `GET` | `/conversations` | JWT | — | `[...conversations]` | All conversations where user is buyer or seller. |
| `GET` | `/conversations/:id` | JWT | — | `{ ...conversation }` | Single conversation detail. |
| `PUT` | `/conversations/:id` | JWT | `{ name? }` | `{ ...updated }` | Rename conversation. |
| `DELETE` | `/conversations/:id` | JWT | — | `{ success }` | Hard delete. |
| `POST` | `/conversations/:id/pin` | JWT | — | `{ ...updated }` | Toggle pin status. |

---

#### Payment Routes (`/payments`)

| Method | Path | Auth | Request Body | Response | Notes |
|--------|------|------|-------------|----------|-------|
| `POST` | `/payments/pix/create` | JWT | `{ amount }` | `{ clientSecret, paymentIntentId, amount }` | Creates Stripe PaymentIntent. Expires in 15 min. |
| `POST` | `/payments/webhook` | Stripe Sig | Stripe event payload (raw) | `{ received: true }` | Signature validated via `STRIPE_WEBHOOK_SECRET`. Handles `payment_intent.succeeded`. |

---

#### Notification Routes (`/notifications`)

| Method | Path | Auth | Response | Notes |
|--------|------|------|----------|-------|
| `GET` | `/notifications` | JWT | `[{ id, type, message, is_read, created_at }]` | User notifications, DESC. |
| `POST` | `/notifications` | JWT | `{ user_id, type, message, entity_id? }` | `{ id }` | Create notification. |
| `PATCH` | `/notifications/:id/read` | JWT | — | `{ message: 'ok' }` | Mark as read. |

---

#### Admin Routes (`/admin`)

| Method | Path | Auth | Response | Notes |
|--------|------|------|----------|-------|
| `GET` | `/admin/metrics` | JWT+Admin | Prometheus text | Raw prom-client metrics |
| `POST` | `/admin/reindex` | JWT+Admin | `{ message }` | Stub reindex |
| `POST` | `/admin/cache-clear` | JWT+Admin | `{ message }` | Flushes entire Redis DB |
| `GET` | `/admin/stats` | JWT+Admin | `{ users_total, active_users, listings_active, disputes_open }` | Dashboard KPIs |
| `GET` | `/admin/activity` | JWT+Admin | `{ transactions_today, volume_today }` | Today's stats |
| `GET` | `/admin/payments` | JWT+Admin | `[...payments]` | Last 100 payments |
| `GET` | `/admin/refunds` | JWT+Admin | `[...refunds]` | Last 100 refunds |
| `GET` | `/admin/wallets` | JWT+Admin | `[...wallets]` | Top 100 wallets by balance |

---

#### Federation Routes (`/federation`)

| Method | Path | Auth | Request | Response | Notes |
|--------|------|------|---------|----------|-------|
| `GET` | `/federation/export` | API_KEY | Query: `since?` (ISO date) | `{ users, transactions, exportedAt }` | Exports data since last sync for peer nodes. |
| `POST` | `/federation/import` | API_KEY | `{ listings, transactions, users }` | `{ message }` | Upserts data from peer. `INSERT ... ON DUPLICATE KEY UPDATE`. |
| `POST` | `/federation/sync-now` | API_KEY | — | `{ ok }` | Triggers immediate sync from all registered peer nodes. |

---

#### System Routes

| Method | Path | Auth | Response |
|--------|------|------|----------|
| `GET` | `/health` | — | `{ status: 'ok', service: 'agrinet-api', time: ISO }` |
| `GET` | `/healthz` | — | DB connectivity check |
| `GET` | `/metrics` | — | Prometheus exposition format |
| `GET` | `/stream/:conversationId` | JWT | SSE stream for real-time message events |

---

### 3.4 Services Layer

Services contain core business logic. They are called by route handlers and never talk to the HTTP layer directly.

#### `services/transactionService.js`

```
createFromListing(buyerId, listingId, quantity)
  │
  ├─ Fetch listing, validate status = active
  ├─ Calculate amount = price × quantity
  ├─ BEGIN transaction
  │   ├─ INSERT INTO transactions (status=pending, escrow_locked=true)
  │   ├─ UPDATE listings SET quantity_available = quantity_available - quantity
  │   └─ COMMIT
  ├─ calculateFraudScore(buyerId, sellerId, amount)
  │   └─ If score ≥ 60 → SET flagged_for_review = true
  └─ Return { transactionId, totalAmount }

createPaymentForTransaction(userId, transactionId)
  │
  ├─ Fetch transaction, validate buyer = userId
  ├─ stripeService.createPixPayment(amount)
  ├─ INSERT INTO payments (status=pending, expires_at = NOW()+15min)
  ├─ UPDATE transactions SET status = awaiting_payment
  └─ Return { clientSecret, paymentIntentId, amount }

releaseEscrow(userId, transactionId)
  │
  ├─ Fetch transaction, validate seller = userId
  ├─ Validate escrow_locked = true AND status = paid
  ├─ BEGIN transaction
  │   ├─ walletRepository.credit(sellerId, amount, 'sale', txId)
  │   ├─ UPDATE transactions SET escrow_locked=false, escrow_released_at=NOW()
  │   └─ COMMIT
  ├─ Emit metric: escrowReleaseSuccess.inc()
  └─ Return { message: 'Escrow released' }

openDispute(userId, transactionId, reason)
  │
  ├─ Fetch transaction, validate userId is buyer or seller
  ├─ BEGIN transaction
  │   ├─ INSERT INTO disputes (transaction_id, opened_by, reason, status=open)
  │   ├─ UPDATE transactions SET status = disputed
  │   └─ COMMIT
  └─ Return dispute object
```

#### `services/fraudService.js`

```
calculateFraudScore(userId, sellerId?, amount?)
  │
  ├─ Mode 1 (user only): calculateUserFraudScore(userId)
  │   ├─ +velocity check (Redis): rapid recent transactions → +30
  │   ├─ +disputes in last 30d → +20 per dispute
  │   ├─ +refunds in last 30d → +15 per refund
  │   └─ +account age < 7d → +20
  │
  └─ Mode 2 (transaction): calculateTransactionFraudScore(userId, sellerId, amount)
      ├─ amount > 5000 → +40
      ├─ checkVelocityRedis(userId, 600): ≥5 in 10min → +30
      ├─ repeated pairs in DB: ≥3 buyer+seller combos in 30min → +30
      └─ account age < 7d → +20

checkVelocityRedis(userId, windowSeconds)
  │
  ├─ INCR agrinet:velocity:{userId}
  ├─ EXPIRE key to windowSeconds (on first call)
  └─ Return current count
```

#### `services/adminAuditService.js`

```
logAdminAction(adminId, action, targetType, targetId, meta?)
  └─ INSERT INTO admin_actions (admin_id, action, target_type, target_id, meta)
```

#### `services/stripeService.js`

```
createPixPayment(amount)
  └─ stripe.paymentIntents.create({
       amount: amount * 100,  // cents
       currency: 'brl',
       payment_method_types: ['pix'],
     })
```

---

### 3.5 Repository Layer

Repositories wrap raw SQL queries. They accept an optional `connection` parameter for transaction nesting.

#### `repositories/walletRepository.js`

```
findByUserId(userId)
  └─ SELECT * FROM wallets WHERE user_id = ?

debit(userId, amount, note, refId?, connection?)
  ├─ SELECT balance ... FOR UPDATE (within transaction)
  ├─ Validate balance >= amount → throw if not
  ├─ UPDATE wallets SET balance = balance - amount
  ├─ INSERT INTO wallet_history (type=purchase, amount=-X, ...)
  └─ INSERT INTO financial_audit_log (event_type=wallet_debit, ...)

credit(userId, amount, note, txId?, paymentId?, type?, connection?)
  ├─ UPDATE wallets SET balance = balance + amount
  ├─ INSERT INTO wallet_history (type=sale/deposit, amount=+X, ...)
  ├─ INSERT INTO financial_audit_log (event_type=wallet_credit, ...)
  └─ walletCreditTotal.inc() — Prometheus counter

refund(userId, amount, note, paymentId, connection?)
  └─ Calls debit() with negative amount and type=refund
```

---

## 4. Database Schema & ERD

### Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            DATABASE ERD                                  │
└──────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐          ┌───────────────────────────┐
│      users        │          │         listings           │
├───────────────────┤          ├───────────────────────────┤
│ id (UUID) PK      │◄────┐    │ id (UUID) PK              │
│ email (unique)    │     │    │ user_id (FK → users)      │──────┐
│ password_hash     │     │    │ title                     │      │
│ role              │     │    │ category (enum)           │      │
│ reputation_score  │     │    │ description               │      │
│ fraud_score       │     │    │ price (dec 12,2)          │      │
│ trust_level       │     │    │ unit (enum)               │      │
│ is_blocked        │     │    │ quantity_available        │      │
│ blocked_until     │     │    │ city, state               │      │
│ block_level       │     │    │ latitude, longitude       │      │
│ created_at        │     │    │ status (enum)             │      │
│ updated_at        │     │    │ moderation_status         │      │
└───────────────────┘     │    │ origin_node               │      │
         │                │    │ created_at                │      │
         │                │    └───────────────────────────┘      │
         │ 1:1            │             │ 1:many                   │
         ▼                │             ▼                           │
┌───────────────────┐     │    ┌───────────────────────────┐       │
│      wallets      │     │    │     listing_images        │       │
├───────────────────┤     │    ├───────────────────────────┤       │
│ user_id (PK, FK)  │     │    │ id (UUID) PK              │       │
│ balance (dec 12,2)│     │    │ listing_id (FK)           │       │
│ created_at        │     │    │ image_url                 │       │
│ updated_at        │     │    │ position                  │       │
└───────────────────┘     │    │ created_at                │       │
         │ 1:many         │    └───────────────────────────┘       │
         ▼                │                                         │
┌───────────────────┐     │    ┌───────────────────────────┐       │
│  wallet_history   │     │    │     listing_stats         │       │
├───────────────────┤     │    ├───────────────────────────┤       │
│ id (auto-inc) PK  │     │    │ listing_id (PK, FK)       │◄──────┘
│ user_id (FK)      │     │    │ views                     │
│ type (enum)       │     │    │ clicks                    │
│ amount (dec 12,2) │     │    │ messages_started          │
│ note              │     │    │ updated_at                │
│ tx_id (FK, null)  │     │    └───────────────────────────┘
│ payment_id (null) │     │
│ created_at        │     │    ┌───────────────────────────┐
└───────────────────┘     │    │      conversations        │
                           │    ├───────────────────────────┤
┌───────────────────┐      └────┤ id (UUID) PK              │
│    transactions   │           │ listing_id (FK)           │
├───────────────────┤           │ buyer_id (FK → users)     │
│ id (UUID) PK      │◄──────────┤ seller_id (FK → users)    │
│ buyer_id (FK)     │           │ name                      │
│ seller_id (FK)    │           │ pinned                    │
│ listing_id (FK)   │           │ created_at                │
│ listing_title     │           └───────────────────────────┘
│ quantity          │                        │ 1:many
│ unit_price        │                        ▼
│ amount (dec 12,2) │           ┌───────────────────────────┐
│ status (enum)     │           │        messages           │
│ escrow_locked     │           ├───────────────────────────┤
│ escrow_released_at│           │ id (UUID) PK              │
│ fraud_score       │           │ conversation_id (FK)      │
│ flagged_for_review│           │ sender_id (FK → users)    │
│ dialog_notes      │           │ message (text)            │
│ dialog_confirmed  │           │ delivery_status (enum)    │
│ last_ping         │           │ attachment_url            │
│ ping_count        │           │ attachment_type           │
│ buyer_rated       │           │ created_at                │
│ seller_rated      │           └───────────────────────────┘
│ rating_given      │
│ created_at        │           ┌───────────────────────────┐
│ updated_at        │           │       payments            │
└───────────────────┘           ├───────────────────────────┤
         │ 1:1                  │ id (UUID) PK              │
         ▼                      │ user_id (FK → users)      │
┌───────────────────┐           │ amount (dec 10,2)         │
│     disputes      │           │ provider (stripe)         │
├───────────────────┤           │ status (enum)             │
│ id (UUID) PK      │           │ external_id (Stripe PI)   │
│ transaction_id FK │           │ idempotency_key           │
│ opened_by (FK)    │           │ refunded_amount           │
│ reason            │           │ expires_at                │
│ status (enum)     │           │ created_at                │
│ resolution        │           │ updated_at                │
│ created_at        │           └───────────────────────────┘
│ updated_at        │
└───────────────────┘           ┌───────────────────────────┐
                                 │   financial_audit_log     │
┌───────────────────┐           ├───────────────────────────┤
│   notifications   │           │ id (UUID) PK              │
├───────────────────┤           │ event_type                │
│ id (UUID) PK      │           │ user_id (FK)              │
│ user_id (FK)      │           │ transaction_id            │
│ type              │           │ payment_id                │
│ entity_id         │           │ wallet_user_id            │
│ message           │           │ amount (dec 18,2)         │
│ is_read           │           │ currency (BRL)            │
│ created_at        │           │ metadata (JSON)           │
└───────────────────┘           │ created_at                │
                                 └───────────────────────────┘

┌───────────────────┐           ┌───────────────────────────┐
│   fraud_queue     │           │       fraud_logs          │
├───────────────────┤           ├───────────────────────────┤
│ id (UUID) PK      │           │ id (auto-inc) PK          │
│ user_id (FK)      │           │ user_id (FK → users)      │
│ reason            │           │ reason                    │
│ status (enum)     │           │ created_at                │
│ created_at        │           └───────────────────────────┘
│ reviewed_at       │
└───────────────────┘           ┌───────────────────────────┐
                                 │     admin_actions         │
┌───────────────────┐           ├───────────────────────────┤
│   node_registry   │           │ id (UUID) PK              │
├───────────────────┤           │ admin_id (FK → users)     │
│ id (auto-inc) PK  │           │ action                    │
│ node_url (unique) │           │ target_type               │
│ active            │           │ target_id                 │
│ last_sync_at      │           │ meta (JSON)               │
│ created_at        │           │ created_at                │
│ updated_at        │           └───────────────────────────┘
└───────────────────┘
```

### Key Constraints & Triggers

```sql
-- wallet_history deduplication
UNIQUE (tx_id, type)       -- prevents double-recording purchases/sales
UNIQUE (payment_id, type)  -- prevents double-recording deposits/refunds

-- DB trigger: validates required fields before inserting wallet_history
BEFORE INSERT ON wallet_history:
  IF type IN ('purchase', 'sale') AND tx_id IS NULL → SIGNAL SQLSTATE '45000'
  IF type IN ('deposit', 'refund') AND payment_id IS NULL → SIGNAL SQLSTATE '45000'
```

---

## 5. Authentication & Authorization Flow

### Registration

```
Client                           Backend                      Database
  │                                │                              │
  │─ POST /auth/register ─────────►│                              │
  │  { email, password }           │                              │
  │                                │─ Validate: pw ≥ 8 chars     │
  │                                │─ Hash pw (bcrypt, 10 rounds) │
  │                                │─ Generate UUID               │
  │                                │─ INSERT users ──────────────►│
  │                                │─ INSERT wallets (balance=0) ►│
  │                                │◄────────────────────────────-│
  │                                │─ jwt.sign({id, email, role}) │
  │◄─ { token } ──────────────────-│  expires: 7d                 │
  │                                │                              │
  │  localStorage.setItem          │                              │
  │  ('agri_token', token)         │                              │
```

### Login

```
Client                           Backend                      Database
  │                                │                              │
  │─ POST /auth/login ────────────►│                              │
  │  { email, password }           │                              │
  │                                │─ SELECT user by email ──────►│
  │                                │◄── user row ─────────────────│
  │                                │─ bcrypt.compare(pw, hash)    │
  │                                │─ jwt.sign({id, email, role}) │
  │◄─ { token } ──────────────────-│                              │
```

### Authenticated Request Flow

```
Client                         authMiddleware                   Database / Redis
  │                                  │                              │
  │─ GET /wallet ────────────────────►│                             │
  │  Authorization: Bearer <JWT>      │                             │
  │                                  │─ Extract token              │
  │                                  │─ jwt.verify(token, secret)  │
  │                                  │  ✓ Decode { id, email, role }
  │                                  │─ SELECT user by id ─────────►│
  │                                  │◄── user row ─────────────────│
  │                                  │─ Check is_blocked            │
  │                                  │  If blocked_until < NOW() →  │
  │                                  │    UPDATE SET is_blocked=false
  │                                  │  If still blocked → 403      │
  │                                  │─ req.user = { id, email, role, ... }
  │                                  │                              │
  │                              Route handler executes            │
  │◄── 200 { balance: 450.00 } ───────│                             │
```

### Authorization Matrix

| Resource | Unauthenticated | Authenticated User | Admin |
|----------|-----------------|-------------------|-------|
| GET /listings | ✓ Read | ✓ Read | ✓ All |
| POST /listings | ✗ | ✓ Create own | ✓ Create any |
| PUT/DELETE /listings/:id | ✗ | ✓ Own only | ✓ Any |
| GET /transactions | ✗ | ✓ Own only | ✓ All |
| POST /transactions/* | ✗ | ✓ Participant | ✓ All |
| GET /wallet | ✗ | ✓ Own only | ✓ Any |
| GET /admin/* | ✗ | ✗ | ✓ |
| GET /metrics | ✗ | ✗ | ✓ |
| POST /federation/* | ✗ | ✗ | API_KEY only |

---

## 6. Transaction & Payment Flow

### Full Purchase Lifecycle

```
Buyer (Frontend)               Backend API                Stripe          Seller (Frontend)
      │                             │                        │                   │
      │                                                                           │
  ─────── PHASE 1: Initiate Transaction ─────────────────────────────────────────
      │                             │                        │                   │
      │─ POST /transactions/        │                        │                   │
      │   from-listing ────────────►│                        │                   │
      │  { listingId, qty: 2 }      │                        │                   │
      │                             │─ Fetch listing         │                   │
      │                             │─ BEGIN TX              │                   │
      │                             │─ INSERT transaction    │                   │
      │                             │  (status=pending,      │                   │
      │                             │   escrow_locked=true)  │                   │
      │                             │─ UPDATE listing qty    │                   │
      │                             │─ COMMIT                │                   │
      │                             │─ fraudService.calc()   │                   │
      │                             │  Score: 25 → OK        │                   │
      │◄─ { transactionId, total } ─│                        │                   │
      │                             │                        │                   │
  ─────── PHASE 2: Payment ─────────────────────────────────────────────────────
      │                             │                        │                   │
      │─ POST /transactions/        │                        │                   │
      │   :id/pay ─────────────────►│                        │                   │
      │                             │─ Fetch transaction     │                   │
      │                             │─ stripe.paymentIntents │                   │
      │                             │   .create(amount, BRL) ►│                  │
      │                             │◄─ { clientSecret, id } ─│                  │
      │                             │─ INSERT payments       │                   │
      │                             │  (status=pending,      │                   │
      │                             │   expires_at+15min)    │                   │
      │                             │─ UPDATE transaction    │                   │
      │                             │  status=awaiting_payment                   │
      │◄─ { clientSecret, pi_id } ──│                        │                   │
      │                             │                        │                   │
      │─ stripe.confirmPayment()    │                        │                   │
      │  (Stripe SDK, client-side) ─────────────────────────►│                  │
      │◄── Payment confirmed ─────────────────────────────────                   │
      │                             │                        │                   │
      │                             │◄── Webhook: payment    │                   │
      │                             │    intent.succeeded ───│                   │
      │                             │─ Validate sig          │                   │
      │                             │─ Validate currency=BRL │                   │
      │                             │─ Validate amount match │                   │
      │                             │─ UPDATE payment        │                   │
      │                             │  status=succeeded      │                   │
      │                             │─ walletRepo.credit()   │                   │
      │                             │  (escrow hold)         │                   │
      │                             │─ UPDATE transaction    │                   │
      │                             │  status=paid           │                   │
      │                             │─ INSERT audit_log      │                   │
      │                             │                        │                   │
  ─────── PHASE 3: Delivery + Escrow Release ────────────────────────────────────
      │                             │                        │                   │
      │  (Goods/services delivered) │                        │                   │
      │                             │                        │─ POST /transactions/
      │                             │                        │   :id/release ────►│
      │                             │◄─────────────────────────────────────────  │
      │                             │─ Validate seller       │                   │
      │                             │─ Validate escrow_locked│                   │
      │                             │  = true, status = paid │                   │
      │                             │─ BEGIN TX              │                   │
      │                             │─ walletRepo.credit     │                   │
      │                             │  (sellerId, amount,    │                   │
      │                             │   type=sale)           │                   │
      │                             │─ UPDATE transaction    │                   │
      │                             │  escrow_locked=false   │                   │
      │                             │  status=completed      │                   │
      │                             │─ COMMIT                │                   │
      │                             │─ escrowReleaseSuccess  │                   │
      │                             │  .inc() [Prometheus]   │                   │
      │                             │                        │                   │
  ─────── DISPUTE PATH (alternative) ────────────────────────────────────────────
      │                             │                        │                   │
      │─ POST /transactions/        │                        │                   │
      │   :id/dispute ─────────────►│                        │                   │
      │  { reason: "..." }          │─ INSERT disputes       │                   │
      │                             │─ UPDATE transaction    │                   │
      │                             │  status=disputed       │                   │
      │◄─ { dispute object } ───────│  escrow stays locked   │                   │
      │                             │                        │                   │
      │                         Admin resolves:                                  │
      │                         → refund buyer OR                                │
      │                         → release to seller                              │
```

### Payment State Machine

```
                    ┌──────────┐
                    │ pending  │
                    └────┬─────┘
                         │ Payment created
                         ▼
                ┌─────────────────┐
                │ awaiting_payment│
                └────┬───────┬────┘
         Stripe      │       │ expires_at < NOW()
         webhook     ▼       ▼
         success ┌──────┐ ┌────────┐
                 │ paid │ │ failed │
                 └──┬───┘ └────────┘
                    │
           Seller   │    Buyer
           releases │    disputes
                    ▼
             ┌───────────┐     ┌──────────┐
             │ completed │     │ disputed │
             └───────────┘     └────┬─────┘
                                    │ Admin resolves
                               ┌────┴────┐
                               ▼         ▼
                          ┌────────┐ ┌──────────┐
                          │refunded│ │completed │
                          └────────┘ └──────────┘
```

---

## 7. Real-Time Messaging Flow

The system uses two complementary transports: Socket.IO (primary) and Server-Sent Events (fallback).

### Socket.IO Architecture

```
                    ┌─────────────────────────────────────────┐
                    │            Socket.IO Server              │
                    │                                          │
                    │  Rooms: one per conversation_id          │
                    │                                          │
                    │  Online Users Map:                       │
                    │  { socketId → userId }                   │
                    │  { userId → socketId }                   │
                    └───────────────┬─────────────────────────┘
                                    │
              ┌─────────────────────┼───────────────────────────┐
              │                     │                           │
       ┌──────▼──────┐      ┌───────▼──────┐           ┌───────▼──────┐
       │   Buyer     │      │   Seller     │           │  Other Users │
       │  Socket     │      │  Socket      │           │              │
       └─────────────┘      └──────────────┘           └──────────────┘
```

### Socket Event Sequence (Sending a Message)

```
Buyer Client                Socket.IO Server               Seller Client
     │                            │                              │
     │─ connect ─────────────────►│                             │
     │─ emit('user_online',       │                             │
     │   { userId: 'abc' }) ─────►│                             │
     │                            │─ broadcast 'user_online'   ─►│
     │                            │  to all others              │
     │                            │                              │
     │─ emit('join_conversation', │                              │
     │   { conversationId: 'xyz'})►│                            │
     │                            │─ socket.join('room-xyz')    │
     │                            │                              │
     │                            │◄─ join_conversation ────────-│
     │                            │   { conversationId: 'xyz' } │
     │                            │─ socket.join('room-xyz')    │
     │                            │                              │
     │─ emit('send_message', {    │                              │
     │   conversation_id: 'xyz',  │                              │
     │   message: 'Hello!',       │                              │
     │   sender_id: 'abc'        │                              │
     │ }) ───────────────────────►│                              │
     │                            │─ Validate: buyer/seller in  │
     │                            │  conversation               │
     │                            │─ INSERT INTO messages       │
     │                            │─ emit('receive_message',   ─►│
     │                            │  { id, conversation_id,     │
     │                            │    sender_id, message,      │
     │                            │    created_at })             │
     │◄─ receive_message ─────────│  (also echoed to sender)    │
     │                            │                              │
     │─ emit('typing', {          │                              │
     │   conversation_id: 'xyz',  │                              │
     │   user_id: 'abc'          │                              │
     │ }) ───────────────────────►│                              │
     │                            │─ broadcast('user_typing',  ─►│
     │                            │   { conversation_id,         │
     │                            │     user_id }) to room       │
     │                            │                              │
     │─ disconnect ──────────────►│                              │
     │                            │─ broadcast 'user_offline'  ─►│
     │                            │  { user_id }                 │
```

### SSE Fallback

```
Client                              Backend
  │                                    │
  │─ GET /stream/:conversationId ─────►│
  │  Authorization: Bearer <token>     │
  │                                    │─ Validate token
  │                                    │─ Validate user in conversation
  │◄─ HTTP 200 (text/event-stream) ────│
  │   Content-Type: text/event-stream  │
  │   Cache-Control: no-cache          │
  │   Connection: keep-alive           │
  │                                    │
  │  [persistent connection]           │
  │                                    │
  │◄─ data: { type:'message', ... }───-│  (on new message)
  │◄─ data: { type:'typing', ... }────-│  (on typing event)
  │◄─ : keepalive ─────────────────────│  (every 30s)
```

---

## 8. Fraud Detection System

### Scoring Algorithm

```
Input: buyerId, sellerId, amount
                │
                ▼
┌───────────────────────────────────────────────────┐
│             FRAUD SCORE CALCULATOR                │
│                                                   │
│  score = 0                                        │
│                                                   │
│  ① Amount check                                   │
│     amount > 5000 BRL?                            │
│     YES → score += 40                            │
│                                                   │
│  ② Velocity check (Redis)                         │
│     INCR agrinet:velocity:{buyerId}               │
│     EXPIRE 600s (10 min)                          │
│     count ≥ 5 transactions in 10 min?             │
│     YES → score += 30                            │
│     Fallback: SELECT COUNT(*) FROM transactions  │
│     WHERE buyer_id = ? AND created_at > NOW()-10m│
│                                                   │
│  ③ Repeated pair check (DB)                       │
│     SELECT COUNT(*) FROM transactions             │
│     WHERE buyer_id = ? AND seller_id = ?          │
│     AND created_at > NOW() - 30 min               │
│     count ≥ 3?                                    │
│     YES → score += 30                            │
│                                                   │
│  ④ Account age check (DB)                         │
│     SELECT created_at FROM users WHERE id = ?     │
│     account_age < 7 days?                         │
│     YES → score += 20                            │
│                                                   │
│  TOTAL score = sum of above                      │
└───────────────────────────────────────────────────┘
                │
                ▼
         ┌──────────────┐
         │  score < 60  │──── Normal transaction proceeds
         └──────┬───────┘
                │ score ≥ 60
                ▼
   UPDATE transactions SET flagged_for_review = 1
   INSERT fraud_queue (userId, reason, status=pending)
   agrinet_fraud_flag_total.inc()
                │
                ▼
       Admin review queue
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
  Approve     Block     Ignore
     │          │
     │          ▼
     │    UPDATE users
     │    SET is_blocked = 1
     │        blocked_until = ?
     │        block_level = soft|hard
     │    agrinet_user_block_total.inc()
     ▼
Transaction cleared
```

### Trust Level Assignment

```
fraud_score   trust_level    Description
──────────    ───────────    ─────────────────────────────────────────
    < 10      trusted        Established, safe user
   10–39      verified       Standard user, normal monitoring
   40–69      new            Default for new accounts
    ≥ 70      restricted     Under investigation, limited access
```

### Block Levels

```
block_level    is_blocked    blocked_until    Behavior
───────────    ──────────    ─────────────    ─────────────────────────────
none           false         null             Normal access
soft           true          Future datetime  Auto-unblocks when time passes
hard           true          null             Permanent, manual admin action
```

---

## 9. Federation Sync System

Agrinet is designed to run as multiple independent nodes that replicate data between each other — useful for regional deployments or disaster recovery.

### Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│       Node A         │         │       Node B         │
│  (São Paulo)         │         │  (Rio de Janeiro)    │
│                      │         │                      │
│  ┌────────────────┐  │         │  ┌────────────────┐  │
│  │ node_registry  │  │         │  │ node_registry  │  │
│  │ [Node B URL]   │  │         │  │ [Node A URL]   │  │
│  └────────────────┘  │         │  └────────────────┘  │
│                      │  HTTP   │                      │
│  federationSyncJob ──┼────────►│  POST /federation/   │
│  (every 60s)         │         │    import            │
│                      │◄────────┼── GET /federation/   │
│  POST /federation/   │         │    export            │
│    import            │         │                      │
└──────────────────────┘         └──────────────────────┘
```

### Sync Job Flow

```
federationSyncJob (runs every 60 seconds)
         │
         ▼
SELECT * FROM node_registry WHERE active = 1
         │
         ▼
For each peer node:
         │
         ├─ GET {peerUrl}/federation/export
         │  Headers: X-API-Key: {FEDERATION_SECRET}
         │  Query:   ?since={node.last_sync_at}
         │
         │  Response:
         │  {
         │    users: [...],
         │    transactions: [...],
         │    exportedAt: "2026-04-14T..."
         │  }
         │
         ├─ For each user: INSERT ... ON DUPLICATE KEY UPDATE
         ├─ For each transaction: INSERT ... ON DUPLICATE KEY UPDATE
         │
         ├─ UPDATE node_registry SET last_sync_at = exportedAt
         ├─ agrinet_federation_sync_success_total.inc()
         │
         └─ On error:
            agrinet_federation_sync_fail_total.inc()
            log error, continue to next node
```

---

## 10. Frontend Architecture

### Directory Structure

```
frontend/
├── app/                         # Next.js 14 App Router
│   ├── layout.js                # Root layout (ClientLayout wrapper)
│   ├── page.js                  # Landing page (/)
│   ├── marketplace/
│   │   └── page.js              # Product marketplace (/marketplace)
│   ├── chat/
│   │   ├── page.js              # Conversation list (/chat)
│   │   └── [id]/page.js        # Conversation detail (/chat/:id)
│   ├── perfil/
│   │   └── page.js              # User profile (/perfil)
│   └── admin/
│       └── page.js              # Admin dashboard (/admin)
│
├── components/
│   ├── listings/
│   │   ├── ListingCard.js       # Product card component
│   │   ├── ListingDetail.js     # Full product modal
│   │   └── NewListingModal.js   # 3-step creation wizard
│   ├── auth/
│   │   └── AuthModal.js         # Login/Register dialog
│   ├── ui/                      # Shadcn/ui components
│   │   ├── avatar.jsx
│   │   ├── badge.jsx
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── dialog.jsx
│   │   ├── dropdown-menu.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   ├── progress.jsx
│   │   ├── select.jsx
│   │   └── textarea.jsx
│   ├── Header.js                # Top navigation
│   ├── Footer.js                # Footer
│   ├── ClientLayout.js          # Client-side hydration wrapper
│   ├── Modal.js                 # Generic modal wrapper
│   ├── Toast.js                 # Toast notification system
│   ├── AnimatedStat.js          # Animated counter (Framer Motion)
│   ├── PageTransition.js        # Page transition animation
│   └── ScrollReveal.js          # Intersection observer reveals
│
├── lib/
│   ├── api.js                   # Fetch wrapper + auth headers
│   ├── auth.js                  # localStorage token management
│   └── format.js                # Currency, date, category formatters
│
├── public/                      # Static assets
├── next.config.js
├── tailwind.config.js
└── package.json
```

### State Management

No global state manager (Redux/Zustand). State is co-located in pages using `useState` + `useEffect`. Auth state lives in `localStorage` and is accessed via `lib/auth.js` helpers.

```javascript
// lib/auth.js — token lifecycle
getToken()     → localStorage.getItem('agri_token')
getUser()      → JSON.parse(localStorage.getItem('agri_user'))
saveAuth(t, u) → localStorage.setItem both keys
clearAuth()    → localStorage.removeItem both keys
isAdmin(user)  → user?.role === 'admin'
decodeToken(t) → JSON.parse(atob(t.split('.')[1]))  // no verification
```

### API Client

```javascript
// lib/api.js
async function api(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' }

  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const apiKey = process.env.NEXT_PUBLIC_API_KEY
  if (apiKey) headers['X-API-Key'] = apiKey

  const res = await fetch(`${NEXT_PUBLIC_API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

### Page Flow Diagrams

#### Landing Page (`/`)

```
User visits /
      │
      ▼
page.js renders:
  ├─ Hero section (animated tagline)
  ├─ GET /listings?limit=6 ──► 6 listing cards (demo if offline)
  ├─ Category pills (static)
  ├─ Feature steps (Choose → Negotiate → Pay → Confirm)
  ├─ Stats (R$2.4M traded, 1240+ producers) [hardcoded]
  └─ CTA buttons → /marketplace, /perfil
```

#### Marketplace (`/marketplace`)

```
User visits /marketplace
      │
      ▼
Load: GET /listings?status=active&limit=40
      │
      ▼
Render grid of ListingCard components
      │
  ┌───┴────────────────────────────────┐
  │  User applies filter               │
  │  (category / state / price / sort) │
  └──────────────┬─────────────────────┘
                 │
                 ▼
         Re-fetch with new query params
                 │
                 ▼
         Updated grid

  ┌───┴──────────────────────────────────┐
  │  User clicks listing card            │
  └──────────────┬───────────────────────┘
                 │
                 ▼
         ListingDetail modal opens
         GET /listings/:id (optional)
                 │
         ┌───────┴──────────────────────────┐
         │  Not logged in?                  │
         │  → AuthModal opens               │
         └───────────────────────────────────┘
                 │
         User is logged in
                 │
                 ▼
         POST /conversations { listing_id }
                 │
                 ▼
         Redirect to /chat/:conversationId

  ┌───┴──────────────────────────────────┐
  │  User clicks "Create Listing"        │
  └──────────────┬───────────────────────┘
                 │
         Not logged in → AuthModal
                 │
         Logged in → NewListingModal opens
         Step 1: Fill info
         Step 2: Upload images (POST /listings/upload-image)
         Step 3: Review
         Submit: POST /listings
         Close modal, refresh list
```

#### Chat (`/chat` + `/chat/:id`)

```
User visits /chat
      │
      ▼
GET /conversations
      │
      ▼
Render conversation list
  (last message preview, unread count, timestamp)
      │
      ▼
User clicks conversation
      │
      ▼
Navigate to /chat/:conversationId
      │
      ├─ GET /messages?conversation_id=:id
      │  (first 50 messages, DESC)
      │
      ├─ socket.emit('join_conversation', { conversationId })
      │
      ├─ socket.on('receive_message') → append to list
      │
      └─ POST /messages/:convId/read → mark as read

Send message:
      │
      ├─ socket.emit('send_message', { conversation_id, message, sender_id })
      │  (primary, real-time)
      │
      └─ POST /messages { conversation_id, message }
         (REST fallback / file attachment)
```

#### Profile (`/perfil`)

```
User visits /perfil
      │
      ├─ (requires login — redirect if not authenticated)
      │
      ├─ GET /wallet          → balance display
      ├─ GET /wallet/history  → transaction history list
      ├─ GET /transactions    → all buyer/seller transactions
      └─ GET /listings (user filter) → my listings

Tab: Wallet
  ├─ Balance card
  ├─ Deposit button → POST /payments/pix/create → Stripe checkout
  └─ History table (type, amount, date)

Tab: Transactions
  ├─ Transaction rows with status badges
  ├─ [Pay] button → POST /transactions/:id/pay → Stripe
  ├─ [Release] button → POST /transactions/:id/release
  └─ [Dispute] button → POST /transactions/:id/dispute

Tab: My Listings
  ├─ ListingCard grid (own listings)
  ├─ Edit button → PUT /listings/:id
  ├─ Pause/Unpause → PUT /listings/:id (status toggle)
  └─ Delete → DELETE /listings/:id
```

---

## 11. Frontend ↔ Backend Integration Map

```
Page / Component                API Call                           Notes
────────────────────────────    ──────────────────────────────     ──────────────────────────
Landing page.js                 GET /listings?limit=6              Shows 6 featured listings
Marketplace page.js             GET /listings (with filters)       Main product feed
                                POST /listings                     Create listing
                                POST /listings/upload-image        R2 upload
                                POST /conversations                Start chat
ListingCard.js                  (no API, display only)
ListingDetail.js                GET /listings/:id                  Full detail fetch
NewListingModal.js              POST /listings/upload-image (x5)   Per image
                                POST /listings                     Final create
AuthModal.js                    POST /auth/login                   JWT returned
                                POST /auth/register                JWT returned
Chat page.js                    GET /conversations                 Sidebar list
Chat [id] page.js               GET /messages?conversation_id=     Initial load
                                POST /messages                     Send (+ file)
                                POST /messages/:id/read            Mark read
                                WS: join_conversation              Socket room
                                WS: send_message                   Real-time send
                                WS: receive_message                Real-time receive
                                SSE /stream/:conversationId        Fallback transport
Profile page.js                 GET /wallet                        Balance
                                GET /wallet/history                History
                                GET /transactions                  All user txns
                                POST /transactions/:id/pay         Stripe PI
                                POST /transactions/:id/release     Escrow release
                                POST /transactions/:id/dispute     Open dispute
                                GET /listings (own filter)         My listings
                                POST /payments/pix/create          Deposit
Admin page.js                   GET /admin/stats                   KPI cards
                                GET /admin/activity                Today's stats
                                GET /admin/payments                Payment table
                                GET /admin/refunds                 Refund table
                                GET /admin/wallets                 Wallet table
Header.js                       (uses localStorage auth state)
Toast.js                        (local state, no API)
AnimatedStat.js                 (no API, display only)
```

---

## 12. Infrastructure & Deployment

**Live URL:** https://agrinet.duckdns.org (VPS: 37.60.226.101)

### Service Topology

```
docker-compose.yml
│
├── nginx (nginx:alpine) ← reverse proxy + SSL termination
│   ├── Port: 80:80, 443:443
│   ├── Config: infra/docker/nginx/nginx.conf
│   ├── Volume: /etc/letsencrypt (SSL certs, host bind mount)
│   └── Volume: /var/www/certbot (ACME challenge)
│
├── certbot (certbot/certbot)
│   ├── Renews: every 12h via `certbot renew --webroot`
│   └── Volume: /etc/letsencrypt, /var/www/certbot (host bind mounts)
│
├── mariadb:11 (agrinet_mariadb)
│   ├── Port: internal only
│   ├── Volume: mariadb_data
│   ├── Init: schema.sql (run on first start)
│   └── Health: mysqladmin ping
│
├── redis:7 (agrinet_redis)
│   ├── Port: internal only
│   ├── Volume: redis_data
│   ├── Config: appendonly yes (AOF persistence)
│   └── Health: redis-cli ping
│
├── api (caza6367/agrinet-api:latest) ← depends on mariadb+redis healthy
│   ├── Port: internal only (nginx proxies /api/* → api:5000)
│   ├── Env: loads from ../../.env
│   └── Command: node server.js
│
├── frontend (caza6367/agrinet-frontend:latest) ← depends on api
│   ├── Port: internal only (nginx proxies /* → frontend:3000)
│   └── NEXT_PUBLIC_* vars baked at image build time
│
├── federation-sync (caza6367/agrinet-federation-sync:latest)
│   └── Command: federation sync worker (60s loop)
│
├── job-worker (same image as api)
│   └── Command: node workers/jobWorker.js (BullMQ processor)
│
├── backup (mariadb:11)
│   ├── Runs: backup.sh (daily, 86400s interval)
│   └── Volume: infra/backups/
│
├── prometheus (prom/prometheus) [profile: monitoring]
│   ├── Port: 9090:9090
│   └── Config: monitoring/prometheus.yml
│
└── grafana (grafana/grafana) [profile: monitoring]
    ├── Port: 3001:3000
    ├── Volume: grafana_data
    └── Dashboards: monitoring/grafana/
```

### nginx Routing

```
:80  → /.well-known/acme-challenge/ → /var/www/certbot (certbot webroot)
     → everything else              → 301 redirect to HTTPS

:443 → /api/*      → http://api:5000/   (strips /api prefix via trailing slash)
     → /socket.io/ → http://api:5000    (WebSocket: Upgrade + Connection headers)
     → /*          → http://frontend:3000
```

Key: `proxy_pass http://api/;` — the trailing slash strips the `/api` prefix before forwarding to the Express router, which only has routes like `/auth/*`, `/listings/*`, etc.

### Startup Dependency Chain

```
mariadb ──┐
          ├── (both healthy) ──► api ──► nginx ──► internet
redis ────┘                 │
                            ├──────────────────────► federation-sync
                            └──────────────────────► job-worker

(certbot runs independently; monitoring via --profile monitoring)
```

### CI/CD Pipeline (GitHub Actions)

Two chained workflows:

```
push to main (changes in backend/ | frontend/ | infra/ | .github/workflows/)
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│  build-and-push.yml                                      │
│                                                          │
│  1. Checkout code                                        │
│  2. Login to Docker Hub                                  │
│  3. Build + push 3 images:                               │
│     - caza6367/agrinet-api:latest                        │
│     - caza6367/agrinet-frontend:latest                   │
│       (NEXT_PUBLIC_API_URL + API_KEY baked at build)     │
│       (CACHE_BUST=$run_id forces fresh layer)            │
│     - caza6367/agrinet-federation-sync:latest            │
│  4. Each image tagged: latest, version, short SHA        │
└──────────────────────────────┬───────────────────────────┘
                               │ workflow_run: completed
                               ▼
┌──────────────────────────────────────────────────────────┐
│  deploy.yml                                              │
│                                                          │
│  1. SSH into VPS (appleboy/ssh-action)                   │
│  2. git pull origin main                                 │
│  3. Write .env file from GitHub Secrets (heredoc,        │
│     single-quoted to prevent shell expansion)            │
│  4. docker compose down --remove-orphans                 │
│  5. docker compose pull                                  │
│  6. docker compose up -d                                 │
│  7. docker image prune -f                                │
└──────────────────────────────────────────────────────────┘
```

**Required GitHub Secrets:**

| Secret | Used By |
|--------|---------|
| `DOCKERHUB_USERNAME` | Docker Hub login |
| `DOCKERHUB_TOKEN` | Docker Hub login |
| `NEXT_PUBLIC_API_URL` | Frontend build arg (baked into Next.js bundle) |
| `NEXT_PUBLIC_API_KEY` | Frontend build arg (baked into Next.js bundle) |
| `JWT_SECRET` | Backend .env on VPS |
| `API_KEY` | Backend .env on VPS |
| `DB_PASSWORD` | Backend .env on VPS |
| `STRIPE_SECRET_KEY` | Backend .env on VPS |
| `STRIPE_WEBHOOK_SECRET` | Backend .env on VPS |
| `STRIPE_PUBLISHABLE_KEY` | Backend .env on VPS |
| `R2_ACCOUNT_ID` | Backend .env on VPS |
| `R2_ACCESS_KEY_ID` | Backend .env on VPS |
| `R2_SECRET_ACCESS_KEY` | Backend .env on VPS |
| `R2_PUBLIC_URL` | Backend .env on VPS |
| `ALLOWED_ORIGINS` | Backend .env on VPS |
| `VPS_HOST` | SSH deploy target |
| `VPS_USER` | SSH deploy user |
| `VPS_SSH_KEY` | SSH private key |

**Important — NEXT_PUBLIC_* vars:** Next.js bakes `NEXT_PUBLIC_*` values at build time into the JavaScript bundle. They must be passed as Docker build args (`ARG` → `ENV` in Dockerfile), not as runtime environment variables. Changing them requires rebuilding the image.

### First-Time SSL Setup (run once on VPS)

```bash
# Issue certificate before starting the stack
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d agrinet.duckdns.org \
  --non-interactive --agree-tos -m seu@email.com

# Then start the full stack
cd /root/agrinet
docker compose -f infra/docker/docker-compose.yml up -d
```

Certbot auto-renews every 12h via the `certbot` service in docker-compose. Certs are stored on the host at `/etc/letsencrypt` (bind mounted into both nginx and certbot containers).

### Deployment on a New Server

```bash
# 1. Clone repo
git clone https://github.com/CarlosZambonii/Agrinet-Brazil.git
cd Agrinet-Brazil

# 2. Fill env
cp backend/.env.example .env
vim .env  # JWT_SECRET, API_KEY, STRIPE_*, R2_*, ALLOWED_ORIGINS...

# 3. Issue SSL cert (see above)

# 4. Start stack
docker compose -f infra/docker/docker-compose.yml up -d

# 5. Verify
docker compose -f infra/docker/docker-compose.yml ps
curl https://agrinet.duckdns.org/api/healthz

# 6. Start monitoring (optional)
docker compose -f infra/docker/docker-compose.yml --profile monitoring up -d
```

---

## 13. Observability & Metrics

### Prometheus Metrics

**Endpoint:** `GET /metrics` (Prometheus text format)

| Metric Name | Type | Description |
|-------------|------|-------------|
| `agrinet_transactions_created_total` | Counter | Total transactions created |
| `agrinet_escrow_release_success_total` | Counter | Successful escrow releases |
| `agrinet_escrow_release_conflict_total` | Counter | Concurrent release conflicts |
| `agrinet_rating_total` | Counter | Ratings submitted |
| `agrinet_rating_conflict_total` | Counter | Duplicate rating attempts |
| `agrinet_wallet_debit_fail_total` | Counter | Failed wallet debits (insufficient) |
| `agrinet_wallet_credit_total` | Counter | Wallet credits processed |
| `agrinet_fraud_flag_total` | Counter | Transactions flagged for review |
| `agrinet_fraud_block_total` | Counter | Users auto-blocked for fraud |
| `stripe_payment_succeeded_total` | Counter | Stripe payment_intent.succeeded events |
| `stripe_payment_failed_total` | Counter | Failed Stripe payments |
| `stripe_refund_total` | Counter | Stripe refunds processed |
| `stripe_webhook_duplicate_total` | Counter | Duplicate webhook events received |
| `stripe_amount_mismatch_total` | Counter | Stripe amount/DB amount discrepancies |
| `velocity_trigger_total` | Counter | Velocity check triggers |
| `user_block_total` | Counter | User blocks issued |
| `agrinet_federation_sync_success_total` | Counter | Successful federation syncs |
| `agrinet_federation_sync_fail_total` | Counter | Failed federation syncs |
| `agrinet_federation_import_success_total` | Counter | Successful federation imports |
| `agrinet_federation_import_fail_total` | Counter | Failed federation imports |
| `messagesSentTotal` | Counter | Total messages sent |
| `conversationsCreatedTotal` | Counter | Total conversations created |
| `paymentsTotal` | Gauge | Current active payments |
| `disputesOpenTotal` | Gauge | Currently open disputes |
| `activeListingsTotal` | Gauge | Currently active listings |
| `activeUsersTotal` | Gauge | Total registered users |

### Prometheus Scrape Config

```yaml
# monitoring/prometheus.yml
scrape_configs:
  - job_name: 'agrinet-api'
    scrape_interval: 15s
    static_configs:
      - targets: ['api:5000']
    metrics_path: '/metrics'
```

### Grafana

Dashboards and alert rules are stored in `monitoring/grafana/`. Access at `http://localhost:3001` (admin/admin default).

**Key Alerts** (`monitoring/alerts.yml`):
- High fraud flag rate
- Stripe payment failure spike
- Escrow release conflicts
- Federation sync failures
- Wallet debit failures

---

## 14. Environment Variables Reference

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment name |
| `DB_HOST` | Yes | — | MariaDB hostname (e.g. `mariadb`) |
| `DB_PORT` | No | `3306` | MariaDB port |
| `DB_USER` | Yes | — | Database username |
| `DB_PASSWORD` | Yes | — | Database password |
| `DB_NAME` | Yes | — | Database name |
| `REDIS_HOST` | Yes | — | Redis hostname (e.g. `redis`) |
| `REDIS_PORT` | No | `6379` | Redis port |
| `API_KEY` | Yes | — | Shared secret for backend-to-backend calls |
| `JWT_SECRET` | Yes | — | Secret for signing JWTs |
| `STRIPE_KEY` | Yes | — | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Yes | — | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | — | Stripe webhook signing secret |
| `R2_ACCOUNT_ID` | Yes | — | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Yes | — | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Yes | — | R2 secret key |
| `R2_BUCKET` | No | `agrinet-uploads` | R2 bucket name |
| `R2_PUBLIC_URL` | Yes | — | Public base URL for uploaded files |
| `FEDERATION_SECRET` | No | — | Shared secret for federation auth |
| `NODE_URL` | No | `http://localhost:5000` | This node's public URL |
| `NODE_ID` | No | `backend-node-01` | Unique identifier for this node |
| `ALLOWED_ORIGINS` | No | — | Additional CORS origins (comma-separated) |

### Frontend (`.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:5000` | Backend API base URL |
| `NEXT_PUBLIC_API_KEY` | No | — | Appended as `X-API-Key` header to all requests |

---

## 15. Security Model

### Defense in Depth

```
Layer 1 — Network
  └─ CORS: whitelist of known origins only

Layer 2 — Rate Limiting
  └─ Per-IP + per-user counters via express-rate-limit
     Auth endpoints: 20/15min
     Write endpoints: 30/10min
     User actions: 100/10min

Layer 3 — Authentication
  └─ JWT HS256, 7-day expiry
     API key for service-to-service calls
     Block check on every authenticated request

Layer 4 — Authorization
  └─ Role-based: user | admin
     Resource-level: owner-only for mutations
     Trust levels gate high-risk operations

Layer 5 — Input Validation
  └─ HTML tag stripping on all text fields (XSS)
     File type whitelist for uploads
     File size limit (5MB)
     Message length limit (2000 chars)
     Category/status/unit enum enforcement

Layer 6 — Financial Integrity
  └─ DB transactions with FOR UPDATE locks
     Wallet dedup constraints (unique tx+type, payment+type)
     DB trigger validates wallet_history entries
     Stripe webhook signature verification
     Idempotency keys for payments
     Stripe amount mismatch detection

Layer 7 — Fraud Detection
  └─ Velocity checks (Redis counters)
     Amount thresholds
     Account age scoring
     Repeated buyer-seller pair detection
     Auto-flag + admin review queue

Layer 8 — Audit Trail
  └─ financial_audit_log: every wallet operation
     admin_actions: every admin action
     wallet_history: immutable credit/debit log
```

### What Is NOT Currently Implemented

- Email verification (no OTP/magic link)
- 2FA / TOTP
- Session invalidation / logout endpoint (client clears localStorage)
- Password reset flow
- HTTPS termination (should be handled by reverse proxy / load balancer in production)
- CSRF protection (relies on CORS + JWT in Authorization header, not cookies)

---

## 16. Known Gaps & Future Work

| Area | Gap | Notes |
|------|-----|-------|
| Listing Images | `listing_images` table exists in schema but listing fetch doesn't JOIN it | Images served via R2 URL stored in main listings table |
| Rating Endpoints | Schema tracks `buyer_rated`/`seller_rated` flags but no `POST /ratings` endpoint visible | Business logic stub in service |
| Withdraw Funds | Wallet has `can_withdraw_at` concept but no withdrawal endpoint exists | Payout to bank account (Stripe Connect?) |
| Payment Expiry Refund | Job marks payments as `failed` but doesn't refund the buyer's wallet automatically | Requires manual admin action |
| Logout Endpoint | No `POST /auth/logout` — client just clears localStorage | Server-side token invalidation would require a blocklist (Redis) |
| SMS Controller | `SMSController.js` exists but is not mounted in routes | Possibly for future OTP or delivery notifications |
| Orders / Cart | Route stubs exist but controllers are minimal | Planned multi-item cart feature |
| Broadcast Routes | `/broadcasts` mounted in marketplace routes, not fully documented | Push-based listing alerts |
| Conversation Archival | No retention policy or archiving for old messages | Could grow large at scale |
| Admin User Management | Admin dashboard UI references user management but endpoint not documented | May be calling a general DB query |
