---
title: "Onboarding Tracker"
prd: "PRD-001-onboarding-tracker"
date: 2025-04-30
author: "Claude Code"
status: Draft
---

# Plan: Onboarding Tracker

## Source

- **PRD**: [docs/prd/PRD-001-onboarding-tracker.md](../prd/PRD-001-onboarding-tracker.md)
- **Design Doc**: [docs/plans/2025-04-30-onboarding-tracker-design.md](../plans/2025-04-30-onboarding-tracker-design.md)
- **Date**: 2025-04-30
- **Author**: Claude Code

## Architecture Overview

Onboarding Tracker is a monorepo application (Turborepo + pnpm) split into two deployable units: a NestJS 11 REST API backend and a Next.js 15 frontend. The NestJS backend owns all business logic, data access, authentication, file uploads, email delivery, webhook dispatch, and scheduled jobs. The Next.js frontend is a pure consumer of the backend REST API — it handles no server-side business logic beyond SSR page rendering and cookie-based auth token management.

Data lives in a single PostgreSQL 17 database accessed exclusively through Drizzle ORM, which provides type-safe query building without the abstraction overhead of Prisma. File uploads go to S3-compatible storage (MinIO for local dev). Authentication is dual-mode: JWT for internal users, and cryptographic public tokens for client board access without login. An internal event bus (EventEmitter2) decouples core CRUD operations from notification, email, and webhook delivery, keeping the write path fast and the notification pipeline async.

This structure was chosen over a Next.js API-routes-only approach (like Kan uses with tRPC) because the NestJS modular architecture provides cleaner dependency injection, scheduled task support, and a more maintainable separation of concerns for a system with distinct cross-cutting concerns (auth modes, webhooks, cron jobs, file storage).

## Components

### C1: Monorepo Scaffolding & Shared Package

**Purpose**: Establish the workspace structure, shared types, Zod validation schemas, utility functions, and tooling that all other components depend on.

**Key Details**:
- Turborepo + pnpm workspace with `apps/api`, `apps/web`, `packages/shared`, and `tooling/`
- Shared package exports TypeScript types, Zod schemas, constants, and pure utilities (template resolver, slug generator)
- Docker Compose for local PostgreSQL 17 + MinIO
- ESLint, Prettier, and TypeScript base configs in `tooling/`
- All Zod schemas live in `packages/shared/src/schemas/` so backend and frontend validate with identical rules

**ADR Reference**: None — monorepo with shared package is standard practice for this stack

### C2: Database Schema (Drizzle ORM)

**Purpose**: Define all 16 tables in Drizzle schema files, generate the initial migration, and provide the database connection singleton.

**Key Details**:
- Schema files in `apps/api/src/database/schema/` — one file per logical entity (users, boards, lists, cards, etc.)
- Schema barrel export in `apps/api/src/database/schema/index.ts`
- Connection in `apps/api/src/database/connection.ts` using `postgres` driver
- Drizzle Kit config at `apps/api/drizzle.config.ts` for migrations and studio
- Seed script for initial admin user
- Composite PKs on junction tables (`card_assignees`, `card_labels`)
- Singleton `settings` table (always id=1)
- `public_token` on boards is UNIQUE with 32-char cryptographic randomness

**ADR Reference**: -> ADR-0001: Use Drizzle ORM over Prisma

### C3: Auth Module (NestJS)

**Purpose**: Handle internal user authentication (JWT) and public board access (token-based).

**Key Details**:
- `POST /auth/login` — email + password → JWT (24h expiry)
- `POST /auth/register` — admin-only, creates new member
- `GET/PATCH /auth/me` — current user profile and password change
- JwtAuthGuard for all internal endpoints
- PublicBoardGuard that validates `public_token` from URL param
- @CurrentUser() decorator for extracting user from JWT payload
- bcrypt (10 rounds) for password hashing
- Two roles: `admin` and `member` — enforced by role guards on admin endpoints
- Business rule: last admin cannot be demoted (FR-AUTH-006)

**Dependencies**: C2 (users table)

**ADR Reference**: -> ADR-0002: Dual-mode auth (JWT for internal, signed tokens for public)

### C4: Boards Module (NestJS)

**Purpose**: CRUD for boards, public access endpoint, board stats, and completion detection.

**Key Details**:
- Board creation: auto-generate `slug` and `public_token`
- Board status lifecycle: `active` → `completed` → `archived`
- `GET /boards/public/:token` — public endpoint, returns only client-visible data (filtered comments, filtered attachments)
- `GET /boards/:id/stats` — completion percentage (BR-002: cards with completed_at / total cards)
- `PATCH /boards/:id/regenerate-token` — new public_token, old link invalidated
- Board auto-completes when all cards have `completed_at` set (BR-002)
- Dashboard-friendly: `GET /boards` supports filters (status, search) and returns summary data with completion bar

**Dependencies**: C2 (boards table), C3 (auth guards)

**ADR Reference**: None — straightforward CRUD with public token access

### C5: Lists Module (NestJS)

**Purpose**: CRUD for lists within boards, list reordering.

**Key Details**:
- Position-based ordering (integer field, not gap-based)
- `PATCH /boards/:boardId/lists/reorder` — bulk position update
- Cascade delete: removing a list deletes all its cards
- Optional color field on list (FR-LIST-003)
- List title is used for completion detection (BR-001): done/complete/concluído triggers card completion

**Dependencies**: C4 (boards exist)

**ADR Reference**: None

### C6: Cards Module (NestJS)

**Purpose**: CRUD for cards, move logic, and the critical completion-detection business rule.

**Key Details**:
- Card creation with optional description (markdown), due date
- `PATCH /cards/:id/move` — changes list_id and position, triggers completion logic
- **Completion detection (BR-001)**: When card moves to a list whose title contains "done"/"complete"/"concluíd", set `completed_at = now()`. When moved out, clear it.
- Board stats recalculation after every card move
- Event emission on card.move, card.completed via internal event bus
- Position management within a list (gap-based not required, explicit reorder endpoint)

**Dependencies**: C5 (lists exist), C4 (board stats)

**ADR Reference**: -> ADR-0003: Completion detection via list title matching

### C7: Comments Module (NestJS)

**Purpose**: Card comments with dual visibility (internal vs client).

**Key Details**:
- Each comment has `visibility`: `'internal'` or `'client'`
- Default for new comments: `'internal'` (BR-005)
- Public board endpoint filters to only `visibility = 'client'` — no indication that internal items exist
- Only comment author can edit; author or admin can delete
- Markdown content support

**Dependencies**: C6 (cards exist), C3 (auth for author check)

**ADR Reference**: None — straightforward visibility filtering

### C8: Attachments Module (NestJS)

**Purpose**: File upload/download with S3-compatible storage and dual visibility.

**Key Details**:
- Upload: multipart form → S3 put object + DB record
- Each attachment has `visibility`: `'internal'` or `'client'`
- Default for new attachments: `'client'` (BR-005)
- Download: signed URL or proxy through API
- Delete: remove from S3 + delete DB record
- Max file size: 10MB (FR-ATTACH-005)
- Allowed MIME types: images, PDFs, documents, spreadsheets (FR-ATTACH-006)
- StorageService abstract wrapper for S3 operations (allows swapping MinIO/Any S3)

**Dependencies**: C6 (cards exist), C2 (S3 config)

**ADR Reference**: None — S3-compatible is standard for file storage

### C9: Labels Module (NestJS)

**Purpose**: Board-scoped labels with many-to-many card assignment.

**Key Details**:
- Labels belong to a board (not global)
- Card ↔ Label junction table (`card_labels`)
- CRUD on labels, assign/unassign on cards
- Color is required (hex string)
- Deleting a label removes it from all cards (cascade on junction)

**Dependencies**: C4 (boards), C6 (cards)

**ADR Reference**: None

### C10: Templates Module (NestJS)

**Purpose**: Template CRUD, variable definition, and the critical template-to-board instantiation flow.

**Key Details**:
- Templates contain: lists → cards, variables, category assignment
- **Variable resolution (BR-003)**: `{{key}}` in list/card titles and descriptions replaced at board-creation time
- **Due date offset (BR-004)**: Template cards have `due_date_offset_days`; on application, `due_date = board.created_at + offset`
- `POST /boards/from-template/:templateId` — the "apply template" endpoint
- Template changes do NOT propagate to already-created boards (FR-TEMPL-008)
- Template duplication creates independent copy
- Category CRUD for organizing templates

**Dependencies**: C4 (creates boards), C5 (creates lists), C6 (creates cards), C1 (shared template resolver utility)

**ADR Reference**: -> ADR-0004: Template variable substitution at creation time vs live binding

### C11: Notifications Module (NestJS)

**Purpose**: In-app notifications for team, email delivery for clients, webhook dispatch.

**Key Details**:
- **In-app**: Notification records in DB per user, with read/unread status
- **Email**: React Email templates + Resend/SMTP for client milestone emails (BR-009)
- **Webhooks**: HMAC-signed payloads with retry (3 attempts, exponential backoff, BR-008)
- **Event bus**: Internal EventEmitter2 decouples CRUD operations from notification creation
- Events listened: `card.assigned`, `card.completed`, `board.completed`, `card.overdue`
- **Cron job** (@nestjs/schedule): daily overdue check at 9 AM
- WebhookSender with retry logic (1s → 2s → 4s backoff)
- EmailSender with provider abstraction (Resend SDK or nodemailer SMTP)

**Dependencies**: C3 (user references), C4 (board events), C6 (card events), C1 (shared types)

**ADR Reference**: -> ADR-0005: Internal event bus over direct service-to-service calls

### C12: Dashboard Module (NestJS)

**Purpose**: Aggregate metrics and recent activity across all boards.

**Key Details**:
- `GET /dashboard/stats` — total boards, by status counts, average completion %
- `GET /dashboard/recent-activity` — last 20 card/comment events across boards
- Query strategy: SQL aggregation functions (count, avg) on boards + cards tables
- No caching layer for V1 (refresh-based, NFR-002: <500ms)

**Dependencies**: C4 (boards), C6 (cards), C7 (comments)

**ADR Reference**: None

### C13: Settings Module (NestJS)

**Purpose**: Singleton configuration for company branding and email.

**Key Details**:
- Single row in `settings` table (always id=1)
- `GET /settings` — JWT required, full settings
- `PATCH /settings` — admin only
- `GET /settings/public` — no auth (logo URL, primary color, company name only — BR-003 of spec)
- Logo upload via same StorageService (S3 bucket)
- Primary color as hex string, default `#3B82F6`

**Dependencies**: C2 (settings table), C8 (storage service for logo)

**ADR Reference**: None — singleton settings is standard for single-org

### C14: Next.js Frontend — Auth & Layout

**Purpose**: Login flow, route protection, and dashboard layout shell.

**Key Details**:
- Login page: email + password form, stores JWT in httpOnly cookie via middleware
- Next.js middleware: redirects unauthenticated users to `/login`; passes through `/b/*` routes
- Zustand auth store synced with cookie for client-side user context
- Dashboard layout: sidebar (navigation), header (user menu, notification bell), main content area
- React Query for data fetching / caching across all pages
- API client wrapper in `apps/web/src/lib/api-client.ts`

**Dependencies**: C3 (auth API)

**ADR Reference**: None

### C15: Next.js Frontend — Dashboard & Board List

**Purpose**: Board list with stats, filtering, search, and "New Board" modal.

**Key Details**:
- Stats cards row: Total, Active, Completed, Avg Completion (from C12)
- Board cards: title, client name, status badge, completion % bar, assignee avatars, last updated
- Filters: search input + status tabs (All/Active/Completed/Archived)
- "New Board" modal: tab for "From Scratch" vs "From Template"
  - From Template: category tabs → template selection → variable form → submit
  - From Scratch: title + client name

**Dependencies**: C4 (boards API), C10 (templates API for modal), C12 (stats API), C14 (layout shell)

**ADR Reference**: None

### C16: Next.js Frontend — Kanban Board View (Internal)

**Purpose**: The core kanban board with drag-and-drop, card detail, and all CRUD operations.

**Key Details**:
- Uses `@hello-pangea/dnd` for drag-and-drop (lists and cards)
- BoardList component: column with header (title, card count, color, menu), card list, add-card form
- BoardCard component: title, label dots, assignee avatars, due date badge, attachment/comment icons
- CardDetailPanel: slide-in sidebar with sections for assignees, due date, labels, description (markdown), attachments (upload + visibility), comments (tab: All/Internal/Client, visibility selector)
- All CRUD operations call NestJS API endpoints
- Reorder via PATCH endpoints after drag events
- Read-only prop disables all edit affordances (used by C17)

**Dependencies**: C4-C9 (all board CRUD APIs), C14 (auth context)

**ADR Reference**: None

### C17: Next.js Frontend — Public Board View (Client)

**Purpose**: Branded, read-only kanban view accessible via public URL.

**Key Details**:
- Route: `/b/[token]` — server component fetches `GET /boards/public/:token` + `GET /settings/public`
- Applies primary color as CSS variable, renders company logo in header
- Reuses KanbanBoard component with `readOnly=true` — no drag, no add buttons, no edit affordances
- Shows only client-visible comments and attachments
- Board completion percentage in header
- Clean 404 page for invalid tokens

**Dependencies**: C4 (public endpoint), C13 (public branding), C16 (kanban component), C14 (layout)

**ADR Reference**: None

### C18: Next.js Frontend — Templates, Members, Settings

**Purpose**: Admin-facing pages for template management, team management, and system configuration.

**Key Details**:
- Templates list: category tabs, template cards with "Use" button, "New" button for admins
- Template editor: name, category, variables table, kanban-style list/card editor with `{{variable}}` highlighting, due date offset field
- Members page: table with role badges, invite modal, role change, remove
- Settings page: tabs (Branding / Webhooks / Notifications)
  - Branding: logo upload, color picker, company name, email sender
  - Webhooks: list + add/edit modal with event multi-select + test button
  - Notifications: toggle switches per type

**Dependencies**: C10 (templates API), C3 (users API), C11 (webhooks API), C13 (settings API), C14 (layout)

**ADR Reference**: None

## Implementation Order

| Phase | Component | Dependencies | Estimated Scope | Milestone |
|-------|-----------|-------------|-----------------|-----------|
| 1 | C1: Monorepo Scaffolding & Shared | None | M | Workspace builds and shared package tested |
| 1 | C2: Database Schema | C1 | M | All migrations applied, seed admin user |
| 2 | C3: Auth Module | C2 | M | Login works, JWT issued, guards tested |
| 2 | C4: Boards Module | C2, C3 | M | Board CRUD + public endpoint working |
| 2 | C5: Lists Module | C4 | S | List CRUD + reorder working |
| 2 | C6: Cards Module | C5 | M | Card CRUD + move + completion detection |
| 3 | C7: Comments Module | C6, C3 | S | Comments with visibility filtering |
| 3 | C8: Attachments Module | C6, C2 | M | File upload + S3 + visibility |
| 3 | C9: Labels Module | C4, C6 | S | Label CRUD + card assignment |
| 3 | C10: Templates Module | C4, C5, C6, C1 | L | Template CRUD + variable resolution + apply |
| 4 | C11: Notifications Module | C3, C4, C6, C1 | L | In-app + email + webhooks + cron |
| 4 | C12: Dashboard Module | C4, C6, C7 | S | Stats + recent activity endpoints |
| 4 | C13: Settings Module | C2, C8 | S | Branding singleton + public endpoint |
| 5 | C14: Frontend Auth & Layout | C3 | M | Login + layout shell + route protection |
| 5 | C15: Frontend Dashboard | C4, C10, C12, C14 | M | Board list + stats + create modal |
| 6 | C16: Frontend Kanban Board | C4-C9, C14 | L | Full kanban + drag-and-drop + card detail |
| 6 | C17: Frontend Public Board View | C4, C13, C16, C14 | M | Branded read-only kanban |
| 7 | C18: Frontend Templates/Members/Settings | C10, C3, C11, C13, C14 | L | All admin pages functional |
| 7 | E2E Testing + Production Setup | C1-C18 | M | Full flow E2E, Dockerfiles, CI |

**Parallelization notes:**
- Phases 1-2 are sequential foundation. No parallelism possible.
- Phase 3: C7, C8, C9 can be built in parallel after C6 is done. C10 depends on C4+C5+C6+C1, so it can start mid-phase.
- Phase 4: C11, C12, C13 can be built in parallel since they depend on different completed modules.
- Phase 5: C14 should complete before C15 starts. C14 and C15 can overlap with backend Phases 3-4.
- Phase 6: C16 and C17 can partially overlap (C17 reuses C16's component).
- Phase 7: C18 pages are independent of each other and can be parallelized.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Drizzle ORM + NestJS integration is less mature than Prisma | Medium | Medium | Drizzle works with any driver; NestJS just uses it as a data layer. No NestJS-specific integration needed. Fallback: if Drizzle proves problematic in Phase 2, switch to Prisma early — schema is simple enough that migration is low-cost before data exists. |
| Template variable resolution edge cases (nested `{{}}`, special chars, XSS) | Medium | Medium | Use strict regex `\{\{(\w+)\}\}` — only word chars in keys. HTML-escape resolved values. Test with adversarial inputs (C1 shared utility). |
| Completion detection via list title matching is fragile (BR-001) | Medium | Low | Document the exact substring matches clearly. Provide a "Mark as completion list" flag on lists as a V2 enhancement. V1 substring matching is good enough with documented keywords. |
| File upload + S3 MinIO local dev friction | Low | Medium | Provide Docker Compose with pre-configured MinIO. Use StorageService abstraction so local dev uses MinIO and prod can use any S3. Include bucket auto-creation in seed script. |
| Drag-and-drop library (@hello-pangea/dnd) performance with many cards | Low | Low | Board scope is onboarding (typically 10-40 cards), not thousands. Virtualization not needed for V1. Can add react-window later if needed. |
| Webhook retry causes duplicate side effects | Medium | Medium | Include `idempotency_key` (UUID) in every webhook payload. Document that receivers should deduplicate by this key. Don't implement delivery log in V1 — accept at-most-once vs at-least-once trade-off. |
| Email delivery failures in production | Medium | Low | Email is fire-and-forget with SMTP. Failed sends logged but don't block operations. Provide "test email" button in settings. Resend fallback if SMTP unreliable. |
| Card move + stats recalculation creates write contention on concurrent moves | Low | Medium | Single-org, ~10 concurrent users. Compute stats on read (not materialized) for V1. If needed, add DB-level lock or materialized view later. |

## Open Questions

1. **Email provider**: Resend vs configured SMTP? The spec allows both. Decision needed before C11 implementation. Resend is simpler for transactional email but adds a vendor dependency.
2. **Rate limiting implementation**: The spec calls for 100 req/min on public endpoints (NFR-010). Should this be done at NestJS level (in-app), Nginx level, or both? Recommendation: NestJS `@nestjs/throttler` for V1, Nginx in production.
3. **Board slug uniqueness scope**: Slugs must be unique across all boards. If two boards have similar titles, auto-append a short random suffix? Recommendation: yes, append 4-char suffix on collision.
4. **Template kanban editor UX**: Should template list/card editing reuse the exact same kanban component as board editing, or a simplified list UI? Recommendation: reuse kanban component with read-only cards (only title/description editable, no assignees/attachments).
5. **Card position gap strategy**: Integer positions with bulk reorder on every drag, or fractional positions (like Figma)? Recommendation: integer positions with batch reorder endpoint. Simple and sufficient for board sizes ≤100 cards.

## ADR Index

| ADR | Title | Status | 4-Point Test |
|-----|-------|--------|-------------|
| [ADR-0001](../adr/ADR-0001-drizzle-over-prisma.md) | Use Drizzle ORM over Prisma | Proposed | ✅ Multiple approaches, lasting consequences, future constraints |
| [ADR-0002](../adr/ADR-0002-dual-mode-auth.md) | Dual-mode auth: JWT for internal, signed tokens for public | Proposed | ✅ Multiple approaches, lasting consequences, disagreement potential |
| [ADR-0003](../adr/ADR-0003-completion-detection.md) | Completion detection via list title substring matching | Proposed | ✅ Multiple approaches, lasting consequences, disagreement potential |
| [ADR-0004](../adr/ADR-0004-template-variable-substitution.md) | Template variable substitution at creation time (not live binding) | Proposed | ✅ Multiple approaches, lasting consequences, future constraints |
| [ADR-0005](../adr/ADR-0005-event-bus-for-notifications.md) | Internal event bus over direct service calls for notification pipeline | Proposed | ✅ Multiple approaches, lasting consequences, future constraints |