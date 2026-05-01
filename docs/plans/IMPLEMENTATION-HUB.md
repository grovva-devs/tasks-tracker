# 🎯 Implementation Hub — Onboarding Tracker

> **Purpose:** Single source of truth for executing all implementation plans. Track progress, dependencies, and issues.

**Last updated:** 2025-05-01  
**Status:** 🟡 Ready to execute (after fixing review issues)

### 📌 Key Technology Decisions

| Choice | Decision | Rationale |
|--------|----------|-----------|
| **PostgreSQL** | **17** (latest stable, Sep 2024) | User preference for latest stable. Not 16 — too old. Always use the most recent stable release at execution time. |
| **Drizzle ORM** | Not Prisma | ADR-0001: lighter, SQL-like, no codegen, no binary engine |
| **Auth** | JWT + public token | ADR-0002: internal team uses JWT, clients use 32-char crypto token in URL |
| **Completion detection** | List title matching | ADR-0003: cards in lists named "Done"/"Complete"/"Concluído"/"Finalizado" are marked complete |
| **Template variables** | Substitution at creation time | ADR-0004: `{{key}}` resolved once when board is created, not dynamically |
| **Notifications** | Event bus (EventEmitter2) | ADR-0005: decouples CRUD from email/webhook/notif pipeline |

---

## 📂 Plan Files

| Phase | File | Focus | Tasks | Est. |
|-------|------|-------|-------|------|
| 1 | [`phase1-foundation.md`](./2025-04-30-onboarding-tracker-phase1-foundation.md) | Monorepo, Shared, DB Schema, Next.js scaffold | 5 | 4-6h |
| 2 | [`phase2-auth-crud.md`](./2025-04-30-onboarding-tracker-phase2-auth-crud.md) | Auth, Boards, Lists, Cards, Comments, Attachments, Labels | 4 | 5-8h |
| 3 | [`phase3-templates.md`](./2025-04-30-onboarding-tracker-phase3-templates.md) | Template Categories, CRUD, Variables, Instantiation | 4 | 4-6h |
| 4 | [`phase4-notifications.md`](./2025-04-30-onboarding-tracker-phase4-notifications.md) | Webhooks, Email, EventBus, Dashboard, Settings | 5 | 5-7h |
| 5 | [`phase5-frontend-auth-dashboard.md`](./2025-05-01-onboarding-tracker-phase5-frontend-auth-dashboard.md) | Login, Middleware, Dashboard, Board List | 3 | 3-5h |
| 6 | [`phase6-frontend-kanban.md`](./2025-05-01-onboarding-tracker-phase6-frontend-kanban.md) | Kanban Board, DnD, Card Detail, Public View | 3 | 5-8h |
| 7 | [`phase7-frontend-admin-e2e-ci.md`](./2025-05-01-onboarding-tracker-phase7-frontend-admin-e2e-ci.md) | Templates UI, Members, Settings, E2E, CI | 4 | 5-7h |

**Total: ~30-47 hours across 28 tasks**

---

## 🔗 Dependency Graph

```
Phase 1 (Foundation)
  ├─→ Phase 2 (Auth + CRUD)
  │     ├─→ Phase 3 (Templates)
  │     ├─→ Phase 4 (Notifications)
  │     └─→ Phase 5 (Frontend Auth)
  │           └─→ Phase 6 (Kanban)
  │                 └─→ Phase 7 (Admin + E2E)
  └─→ Phase 5 (needs shared package from Phase 1)
```

Phases 3 and 4 can run **in parallel** after Phase 2.  
Phases 5-7 are sequential (each depends on the previous).

---

## ⚠️ Pre-Execution Fixes (from Review)

These issues must be fixed **before** starting execution. Check them off as you apply the fixes:

### Critical Fixes (must fix)

- [ ] **C2**: Add composite primary keys to `cardAssignees` and `cardLabels` schema
- [ ] **C3**: Add `varchar` import to `webhooks.ts` schema
- [ ] **C4**: Add `varchar` import to `notifications.ts` schema  
- [ ] **C5**: Add `app.setGlobalPrefix("api")` to e2e test setup
- [ ] **C6**: Fix `BoardsService.findAll` to use `and()` instead of chained `.where()`
- [ ] **C8**: Add `and` import to `OverdueCronListener`

### Significant Fixes (should fix)

- [ ] **S4**: Replace all `jest.fn()` with `vi.fn()` in frontend test files (Phases 5-7)
- [ ] **S5**: Fix `apiClient` to support query params (add `params` option or URL construction)
- [ ] **S7-S8**: Add missing backend endpoints:
  - `GET /boards/:id/detail` → board + lists + cards
  - `GET /cards/:id/detail` → card + comments + attachments + labels + assignees
  - `GET /boards/public/:token` → must return lists + cards
- [ ] **S9**: Fix `template-seed.ts` to use ESM imports instead of `require()`
- [ ] **S10**: Lazy-initialize `EmailSender` transport on first use
- [ ] **M5**: Fix `DashboardService.getOverview` to compute real completion %

### Minor Fixes (nice to have)

- [ ] **M1**: Fix slug test string quote mismatch
- [ ] **M6**: Use `ON CONFLICT DO NOTHING` pattern in `SettingsService.getOrCreate`
- [ ] **M8**: Add missing `useState`/`useEffect` imports in `BrandingTab`
- [ ] **M9**: Add `pnpm add sonner` step to Phase 5 or 7
- [ ] **M10**: Add `output: "standalone"` to `next.config.ts`

---

## ✅ Execution Checklist

> **Before Phase 1:** Complete the [PRE-SETUP-CHECKLIST](./PRE-SETUP-CHECKLIST.md)  
> **Frontend styling:** Follow the [STYLE-GUIDE](./STYLE-GUIDE.md) in Phase 5-7

### Phase 1: Foundation ☐

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Monorepo root scaffolding (pnpm + turbo + docker) | ☐ |
| 1.2 | Shared package (types, schemas, utils — 24 tests) | ☐ |
| 1.3 | NestJS backend + DB schema (16 tables, health check, seed) | ☐ |
| 1.4 | Next.js frontend (tailwind, shadcn, api-client, auth store) | ☐ |
| 1.5 | E2E verification (all 3 apps install, build, test) | ☐ |

**Gate:** All 24 shared tests pass ✅ | API health check returns 200 ✅ | Web builds ✅

### Phase 2: Auth + CRUD ☐

| Task | Description | Status |
|------|-------------|--------|
| 2.1 | Auth module (JWT + guards + roles) — 4 tests | ☐ |
| 2.2 | Boards CRUD + public access + stats | ☐ |
| 2.3 | Lists + Cards with completion detection | ☐ |
| 2.4 | Comments + Attachments + Labels | ☐ |

**Gate:** Login works ✅ | Board CRUD works ✅ | Card moved to "Done" marks `completedAt` ✅ | Public board token access works ✅

### Phase 3: Templates ☐

| Task | Description | Status |
|------|-------------|--------|
| 3.1 | Template categories CRUD + reorder — 7 tests | ☐ |
| 3.2 | Templates CRUD + variables + nested lists/cards | ☐ |
| 3.3 | Template seed data + E2E verification | ☐ |
| 3.4 | Variable validation (required vars check) | ☐ |

**Gate:** Template created ✅ | Template applied → board with resolved {{vars}} ✅ | Duplicate template ✅ | Missing required var throws error ✅

### Phase 4: Notifications, Dashboard, Settings, Webhooks ☐

| Task | Description | Status |
|------|-------------|--------|
| 4.1 | WebhookSender (HMAC + retry + batch) — 10 tests | ☐ |
| 4.2 | EmailSender (3 templates) — 5 tests | ☐ |
| 4.3 | Notifications service + event listeners + module wiring — 6 tests | ☐ |
| 4.4 | Dashboard stats (SQL aggregation) — 2 tests | ☐ |
| 4.5 | Settings singleton + Webhooks CRUD — 6 tests | ☐ |

**Gate:** Card moved to "Done" → event emitted → notification created ✅ | Dashboard stats return numbers ✅ | Webhook HMAC signature verified ✅ | Settings public endpoint returns logo + color only ✅

### Phase 5: Frontend Auth + Dashboard ☐

| Task | Description | Status |
|------|-------------|--------|
| 5.1 | Login page + auth middleware — 4 tests | ☐ |
| 5.2 | Dashboard layout (sidebar + header + notifications) — 3 tests | ☐ |
| 5.3 | Board list page (stats + search + new board modal) — 2 tests | ☐ |

**Gate:** Login redirects to /boards ✅ | Unauthenticated user redirected to /login ✅ | Board list shows ✅ | New board modal creates board ✅

### Phase 6: Frontend Kanban + Public View ☐

| Task | Description | Status |
|------|-------------|--------|
| 6.1 | Kanban board (DnD + add card/list forms) — 5 tests | ☐ |
| 6.2 | Card detail panel (comments + attachments + labels) — 6 tests | ☐ |
| 6.3 | Board detail page + public client view — 3 tests | ☐ |

**Gate:** Drag card between lists ✅ | Card detail opens ✅ | "Done" card shows strikethrough ✅ | Public `/b/{token}` shows client-only content ✅ | Branding (logo + color) on public view ✅

### Phase 7: Admin Pages + E2E + CI ☐

| Task | Description | Status |
|------|-------------|--------|
| 7.1 | Template editor with variable highlighting + preview — 5 tests | ☐ |
| 7.2 | Members + Settings pages (branding + webhooks) | ☐ |
| 7.3 | E2E full flow (9-step test) | ☐ |
| 7.4 | Dockerfiles + CI workflow | ☐ |

**Gate:** Template editor shows {{var}} highlighting ✅ | Member role toggle works ✅ | Webhook test sends payload ✅ | E2E test passes end-to-end ✅ | CI runs green ✅

---

## 🛡️ SQL Safety Checklist

> **Source:** [`docs/research/2026-04-27-vibe-coding-sql-errors-research.md`](../research/2026-04-27-vibe-coding-sql-errors-research.md)
> 
> Research shows **45% of AI-generated code contains security vulnerabilities** and **28% more SQL injection risk** than human code. The 7 most critical SQL errors in vibe-coded projects are: SQL injection by string concatenation, schema hallucination, cross-database syntax confusion, N+1 queries, missing FK indexes, disabled RLS, and silent logic errors.
> 
> **This project uses Drizzle ORM with parameterized queries**, which eliminates the #1 risk (SQL injection). But we still check for:

### Pre-Execution SQL Safety Audit

- [ ] **No raw SQL concatenation** — All queries use Drizzle query builder (never `$queryRawUnsafe` or string interpolation)
- [ ] **FK indexes exist** — PostgreSQL does NOT auto-create indexes on FK columns. Verify all 16 tables have indexes on FK columns
- [ ] **No N+1 queries** — Board detail endpoint must use joins/includes, not per-card queries
- [ ] **No `SELECT *`** — All queries specify needed columns via Drizzle select projections
- [ ] **Soft deletes consistent** — If `deleted_at` is added later, all queries must include `WHERE deleted_at IS NULL`
- [ ] **Division uses decimal** — Completion percentage uses `1.0 * completed / total`, not integer division
- [ ] **Webhook signatures verified** — All webhook endpoints verify HMAC signature (Phase 4 implements this)
- [ ] **Authorization checks on ID-based endpoints** — Every `/boards/:id` route validates the user has access
- [ ] **No secrets in client bundle** — Environment variables prefixed `NEXT_PUBLIC_` must not contain secrets
- [ ] **Schema matches reality** — Every column/table referenced in code exists in the actual schema (run `drizzle-kit push` or migrations to sync)

### Index Coverage for FK Columns

Run this query after schema creation to find missing FK indexes:

```sql
SELECT tc.table_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes pi
  ON pi.tablename = tc.table_name
  AND pi.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND pi.indexname IS NULL;
```

If any rows are returned, those FK columns need indexes. Add them in a Drizzle migration.

### References

- Full research: [`docs/research/2026-04-27-vibe-coding-sql-errors-research.md`](../research/2026-04-27-vibe-coding-sql-errors-research.md)
- SQL prevention guide: [`docs/research/2026-04-27-agent-sql-prevention-guide.md`](../research/2026-04-27-agent-sql-prevention-guide.md)
- OWASP Top 10: [A03:2021 – Injection](https://owasp.org/Top10/A03_2021-Injection/)

---

## 🚀 Quick Start Commands

```bash
# 1. Start infrastructure (PostgreSQL 17 + MinIO)
docker compose up -d

# 2. Run all shared package tests
cd packages/shared && pnpm test

# 3. Run all API unit tests
cd apps/api && pnpm test

# 4. Run all API e2e tests (needs DB running)
cd apps/api && pnpm test:e2e

# 5. Run all frontend tests
cd apps/web && pnpm test

# 6. Start API dev server
cd apps/api && pnpm dev

# 7. Start Web dev server
cd apps/web && pnpm dev

# 8. Generate migration after schema changes
cd apps/api && pnpm db:generate && pnpm db:migrate

# 9. Seed database
cd apps/api && pnpm db:seed
cd apps/api && pnpm db:seed:templates

# 10. Lint all packages
pnpm lint
```

---

## 📐 Architecture Quick Reference

```
┌─────────────────────────────────────────────────────┐
│  apps/web (Next.js 15 + Shadcn/ui)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ /login       │  │ /boards      │  │ /b/{token}  │ │
│  │ /boards/[id] │  │ /templates/* │  │ Public View  │ │
│  │ /members     │  │ /settings    │  │ (read-only) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                 │                  │        │
│  apiClient ──→ http://localhost:3001/api ──────┘        │
└─────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────┐
│  apps/api (NestJS 11)   │                          │
│  ┌───────────────────────┼────────────────────────┐│
│  │ AuthModule ──→ JWT + Public Board Guard         ││
│  │ BoardsModule ──→ CRUD + stats                   ││
│  │ ListsModule ──→ CRUD + reorder                  ││
│  │ CardsModule ──→ CRUD + move + completion        ││
│  │ TemplatesModule ──→ CRUD + apply + duplicate    ││
│  │ NotificationsModule ──→ events + email + webhooks││
│  │ DashboardModule ──→ aggregation queries          ││
│  │ SettingsModule ──→ singleton branding config     ││
│  │ WebhooksModule ──→ CRUD + HMAC delivery          ││
│  └───────────────────┬─────────────────────────────┘│
│                      │                               │
│  EventBus (EventEmitter2) ←── CRUD services ───┘   │
│      │                                               │
│      ├─→ NotificationsService (in-app DB)           │
│      ├─→ EmailSender (nodemailer)                    │
│      └─→ WebhookSender (HMAC + retry)                │
└──────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────┐
│  PostgreSQL 17 (latest) │  MinIO (S3)               │
│  16 tables              │  File attachments          │
└─────────────────────────────────────────────────────┘
```

---

## 🔑 Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL 17 connection string | `postgres://postgres:postgres@localhost:5432/onboarding_tracker` |
| `JWT_SECRET` | HMAC secret for JWT tokens | Change in production! |
| `S3_ENDPOINT` | S3/MinIO endpoint | `http://localhost:9000` |
| `S3_ACCESS_KEY_ID` | S3 access key | `minioadmin` |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | `minioadmin` |
| `S3_BUCKET` | S3 bucket name | `onboarding-tracker` |
| `S3_REGION` | S3 region | `us-east-1` |
| `SMTP_HOST` | SMTP host for emails | `smtp.resend.com` |
| `SMTP_PORT` | SMTP port | `465` |
| `SMTP_USER` | SMTP username | `resend` |
| `SMTP_PASSWORD` | SMTP password | (secret) |
| `EMAIL_FROM` | From email address | `onboarding@yourcompany.com` |
| `NEXT_PUBLIC_API_URL` | API URL for frontend | `http://localhost:3001` |
| `API_PORT` | NestJS port | `3001` |

---

## 📝 Test Counts by Phase

| Phase | Unit Tests | E2E Tests | Component Tests |
|-------|-----------|-----------|-----------------|
| 1 | 24 (shared) | 1 (health) | 0 |
| 2 | 4 (auth) + various mocks | 0 | 0 |
| 3 | 7 (cats) + 7+ (templates) | 1 (template apply) | 0 |
| 4 | 10 (webhook) + 5 (email) + 6 (notif) + 2 (dashboard) + 6 (settings+webhooks) | 0 | 0 |
| 5 | 0 | 0 | 4 (login) + 3 (sidebar) + 2 (board) |
| 6 | 0 | 0 | 5 (kanban) + 6 (card detail) + 3 (public) |
| 7 | 0 | 1 (full flow, 9 steps) | 5 (template editor) |
| **Total** | **~77** | **3** | **28** |

---

## 🔄 Git Commit Strategy

Each task ends with a commit. Follow this pattern:

```
feat: add [scope] with [what was added]
fix: resolve [issue] in [scope]
chore: [maintenance task]
test: add [scope] tests
refactor: [what was refactored]
```

Commits should be **granular per task**, not per phase. This gives ~28 commits across the project.

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| `pnpm install` fails with peer deps | Run `pnpm install --no-frozen-lockfile` first time |
| Drizzle migration fails | Ensure PostgreSQL is running: `docker compose up -d postgres` |
| `db:generate` finds no changes | You may need to touch a schema file or check import paths |
| E2E tests timeout | Increase `--testTimeout=30000` in vitest config |
| `create-next-app` prompts interactively | Add `--yes` flag or use `--skip-install` then manual install |
| Shadcn components missing | Run `pnpm dlx shadcn@latest add [component]` |
| NestJS module not found | Check that the module is added to `AppModule.imports[]` |
| Frontend can't reach API | Check `NEXT_PUBLIC_API_URL` env var and CORS config |
| Public board returns empty lists | Backend needs `GET /boards/public/:token` with lists+cards join |
| Auth middleware blocks public routes | Ensure `/b/` is in `PUBLIC_PATHS` array |
| `moduleResolution: "bundler"` issue | Some NestJS packages may need `moduleResolution: "node"` |

---

## 📅 Estimated Timeline

| Week | Phase | Focus |
|------|-------|-------|
| 1 | Phase 1 | Monorepo, shared, DB schema, both apps scaffolded |
| 1-2 | Phase 2 | Auth, CRUD for all entities |
| 2 | Phase 3 | Templates + variable substitution |
| 2-3 | Phase 4 | Notifications pipeline, dashboard, settings |
| 3 | Phase 5 | Frontend login + dashboard |
| 3-4 | Phase 6 | Kanban board + public view |
| 4 | Phase 7 | Admin pages + E2E + CI |

**Total: ~4 weeks for one developer, ~2 weeks for a pair.**