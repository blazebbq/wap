# WAP — Multi-Tenant SaaS Booking Platform

A production-ready multi-tenant SaaS codebase built with:

- **Next.js 15** (App Router) + **TypeScript**
- **Prisma ORM** + **PostgreSQL**
- **Auth.js v5** (Email magic-link) + Prisma adapter
- **Zod** for schema validation
- **Tailwind CSS** — clean, responsive UI
- **dnd-kit** — drag-and-drop block editor
- **Stripe** — subscription billing + webhook processing

---

## Features

| Area | Description |
|------|-------------|
| 🏪 Multi-tenant routing | Subdomain → businessId resolution via middleware |
| 📄 Block-based page builder | Hero, Services, Rich Text, Contact blocks with drag-and-drop reorder |
| 📅 Booking engine | Services, availability rules, slot generation, conflict detection |
| 👤 Customer portal | Magic-link auth, view/cancel/reschedule bookings |
| 🔧 Business admin | Site editor, bookings calendar, services CRUD, settings |
| 🛡 Platform admin | Create/suspend businesses, audit log, impersonation with strict logging |
| 💳 Stripe billing | Subscription management, idempotent webhook processing |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local Postgres)

### 1. Clone & install

```bash
git clone https://github.com/blazebbq/wap.git
cd wap
pnpm install
```

### 2. Start Postgres

```bash
docker-compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your values (Stripe keys, SMTP, etc.)
```

Minimum required for local dev:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wap_dev"
AUTH_SECRET="any-random-32-char-string"
AUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 4. Database setup

```bash
# Run migrations
pnpm db:migrate

# Seed with demo data
pnpm db:seed
```

The seed creates:
- Platform admin: `admin@yourbrand.co.uk`
- Demo business: `demo.yourbrand.co.uk`
- 2 services: Haircut & Colour + Style
- A published home page with Hero, Services, Contact blocks
- Availability rules (Mon-Fri 9am-6pm)

### 5. Start development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tenant subdomain routing (local dev)

The middleware rewrites `{subdomain}.yourbrand.co.uk → /_tenant/{businessId}/...`

For local development, use the direct internal paths:

| Path | Description |
|------|-------------|
| `/_tenant/{businessId}` | Tenant public homepage |
| `/_tenant/{businessId}/book` | Booking flow |
| `/_tenant/{businessId}/account` | Customer account |
| `/_tenant/{businessId}/admin` | Business admin dashboard |
| `/_tenant/{businessId}/admin/site` | Block page editor |
| `/_tenant/{businessId}/admin/bookings` | Bookings list |
| `/_tenant/{businessId}/admin/services` | Services management |
| `/_tenant/{businessId}/admin/settings` | Business settings |
| `/platform/login` | Platform admin login |
| `/platform/dashboard` | Platform admin dashboard |

---

## API Routes

### Public (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/public/services` | List active services |
| `GET` | `/api/public/availability?serviceId=&date=YYYY-MM-DD` | Available time slots |
| `POST` | `/api/public/bookings` | Create a booking (idempotency key supported) |

All public routes require the `x-business-id` header (set automatically by middleware in production).

### Customer routes (auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/customer/bookings` | List upcoming/past bookings |
| `PATCH` | `/api/customer/bookings/:id` | Cancel or reschedule a booking |

### Admin routes (business admin auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/admin/services` | List/create services |
| `GET/PATCH/DELETE` | `/api/admin/services/:id` | Get/update/deactivate service |
| `GET/POST` | `/api/admin/pages` | List/create pages |
| `GET/PATCH/DELETE` | `/api/admin/pages/:id` | Get/update/delete page |
| `POST` | `/api/admin/pages/:id/publish` | Publish latest page version |
| `GET` | `/api/admin/bookings` | List bookings (with filters) |

### Platform admin routes

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST` | `/api/platform/businesses` | List/create businesses |
| `GET/PATCH` | `/api/platform/businesses/:id` | Get/update business |
| `POST` | `/api/platform/impersonate` | Issue impersonation token (fully audited) |

### Webhook

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/stripe/webhook` | Stripe webhook (signature verified, idempotent) |

---

## Architecture

### Multi-tenant middleware

```
Request → middleware.ts
  ├── Parse Host header
  ├── Extract subdomain
  ├── Call /api/internal/resolve-tenant (cached lookup)
  └── Rewrite → /_tenant/{businessId}/...
```

The in-memory cache can be swapped for Redis by updating `lib/tenant.ts`.

### Block system

Blocks are stored as JSON in `PageVersion.blocksJson`. The `lib/blocks.ts` file defines:
- `BlockType` enum
- Zod schemas for each block type
- `parseBlocks()` helper with strict validation

Rich text blocks use `isomorphic-dompurify` to sanitise HTML — no arbitrary code execution.

### Auth

Auth.js v5 with Email (magic-link) provider. Sessions stored in the database via Prisma adapter.

For **business admins**, the `BusinessMembership` table tracks roles (`owner|admin|staff`).
For **platform admins**, `PlatformUser.isPlatformAdmin = true`.

### Stripe webhooks

Idempotency is enforced via the `WebhookEvent` table — events are stored and only processed once. The webhook handler:
1. Verifies the `Stripe-Signature` header
2. Checks `WebhookEvent` for duplicate
3. Upserts the event record
4. Processes subscription changes
5. Marks the event as `processedAt`

---

## Database schema

See `prisma/schema.prisma` for the full schema. Key models:

- `PlatformUser` — global user accounts (Auth.js adapter)
- `Business` — tenants
- `BusinessMembership` — roles per business
- `Customer` — per-tenant customers
- `Service` / `Staff` — service catalogue
- `AvailabilityRule` / `AvailabilityException` — schedule management
- `Booking` / `BookingItem` — appointments
- `Page` / `PageVersion` — versioned page content
- `Subscription` — Stripe subscription tracking
- `WebhookEvent` — idempotent webhook log
- `AuditLog` — platform-level audit trail

---

## Development commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm typecheck    # TypeScript type checking
pnpm lint         # ESLint
pnpm test         # Jest tests
pnpm db:generate  # Regenerate Prisma client
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed database
pnpm db:studio    # Prisma Studio UI
```

---

## Deployment

1. Set all environment variables (see `.env.example`)
2. Run `pnpm db:migrate` in production
3. Configure Stripe webhooks to point to `/api/stripe/webhook`
4. Set `PLATFORM_HOST` and `BASE_DOMAIN` to your actual domain
5. Configure wildcard DNS: `*.yourbrand.co.uk → your-server`

---

## Security notes

- Magic-link tokens are single-use and time-limited (Auth.js default)
- Impersonation tokens are JWTs signed with `IMPERSONATION_SECRET`, expire in 15 minutes, and every use is written to `AuditLog`
- Stripe webhooks use signature verification (`stripe.webhooks.constructEvent`)
- Session cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` in production
- HTML content in Rich Text blocks is sanitised with DOMPurify
- RBAC is enforced at the API layer for every route
