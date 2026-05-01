# Implementation Plans — Review Report

**Reviewer:** AI Architect  
**Date:** 2025-05-01  
**Scope:** All 7 phase implementation plans (327KB total)

---

## 🔴 Critical Issues (Will Break During Execution)

### C1. Schema circular dependency: `boards.ts` → `lists.ts` → `cards.ts` → back to `lists.ts`

**Phase 1, Task 3**  
`boards.ts` imports `lists` from `./lists`, and `lists.ts` imports `cards` from `./cards`. But `cards.ts` also imports `lists` from `./lists` for the `list` relation. This creates a circular import in Drizzle schema files.

Drizzle handles this fine at runtime because relations are defined separately, but the **import order in `schema/index.ts`** matters. The current barrel export is safe, but during execution the implementer may hit `ReferenceError` if individual files are imported before their dependencies are loaded.

**Fix:** Ensure `schema/index.ts` imports in dependency order: users → boards → lists → cards → card-comments → card-attachments → card-assignees → labels → card-labels → templates → template-variables → template-lists → template-cards → webhooks → notifications → settings. Already correct in the plan, but worth adding a comment.

### C2. `cardAssignees` table has no primary key

**Phase 1, Task 3**  
`cardAssignees` table uses `(cardId, userId)` as an implicit composite key but neither field is marked `primaryKey()`. Drizzle requires an explicit PK or the `.onConflictDoNothing()` in assign/remove will fail silently. The same issue exists for `cardLabels`.

**Fix:** Add composite primary keys:
```typescript
// card-assignees.ts
export const cardAssignees = pgTable("card_assignees", {
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
}, (table) => ({
  pk: primaryKey(table.cardId, table.userId),
}));

// card-labels.ts
export const cardLabels = pgTable("card_labels", {
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  labelId: uuid("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (table) => ({
  pk: primaryKey(table.cardId, table.labelId),
}));
```

### C3. `webhooks.ts` — missing `varchar` import for `secret` column

**Phase 1, Task 3**  
The `webhooks.ts` schema file uses `varchar("secret", { length: 255 })` but only imports `pgTable, uuid, text, boolean, timestamp` — no `varchar`.

**Fix:** Add `varchar` to the import:
```typescript
import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
```

### C4. `notifications.ts` — unused imports and missing `varchar` import

**Phase 1, Task 3**  
Imports `cards`, `boards` for FK references but also imports from files that create circular dependencies. Missing `varchar` import. The `userId` and `boardId` references work fine, but `type` and `title` columns use `varchar` without importing it.

**Fix:** Add `varchar` to imports and remove unused imports if they cause issues.

### C5. E2E test for Phase 1 doesn't set `api` global prefix

**Phase 1, Task 3**  
The e2e test (`test/app.e2e-spec.ts`) creates the Nest app without calling `app.setGlobalPrefix("api")` like `main.ts` does. So `request(app.getHttpServer()).get("/api/health")` will fail — the route is `/health` without the prefix in test context.

**Fix:** Add prefix in test:
```typescript
app = moduleFixture.createNestApplication();
app.setGlobalPrefix("api"); // ADD THIS
await app.init();
```

### C6. Phase 2 `BoardsService.findAll` has broken chained `.where()`

**Phase 2, Task 2**  
The `findAll` method does:
```typescript
let query = db.select().from(boards);
if (filters?.status) query = query.where(eq(boards.status, filters.status)) as any;
if (filters?.search) query = query.where(ilike(boards.clientName, `%${filters.search}%`)) as any;
```
The second `.where()` **overwrites** the first one — Drizzle query builder doesn't accumulate `.where()` calls. When both filters are present, only the search filter applies.

**Fix:** Use `and()` to combine:
```typescript
const conditions = [];
if (filters?.status) conditions.push(eq(boards.status, filters.status));
if (filters?.search) conditions.push(ilike(boards.clientName, `%${filters.search}%`));

const query = conditions.length > 0
  ? db.select().from(boards).where(and(...conditions))
  : db.select().from(boards);
return query.orderBy(boards.createdAt);
```

### C7. Phase 2 `CardsService.moveCard` — `completedBy` not available

**Phase 2, Task 3**  
`moveCard` sets `completedAt = new Date()` but doesn't have access to `userId` (the user performing the move). The Phase 4 event listener `CardEventsListener.handleCardCompleted` expects `completedBy` in the payload but `moveCard` never receives it.

**Fix:** Add `userId` parameter to `moveCard`:
```typescript
async moveCard(id: string, listId: string, position: number, userId: string) {
```
And pass it from the controller via `@CurrentUser()`.

### C8. Phase 4 `OverdueCronListener` — missing `and` import

**Phase 4, Task 3**  
Uses `and(lt(cards.dueDate, today), isNull(cards.completedAt))` but the import only shows `{ eq, lt, isNull }` — `and` is missing.

**Fix:** Add `and` to imports:
```typescript
import { eq, lt, isNull, and } from "drizzle-orm";
```

### C9. Phase 4 Webhook sender uses `fetch` globally — may not exist in older Node

The production Dockerfile uses `node:24-alpine` which has global `fetch`, but the test mock `global.fetch = jest.fn()` assumes Vitest can mock it. In Vitest with `@vitest/coverage-v8`, global fetch mocking works, but the plan doesn't set up this mock in a setup file.

**Fix:** Add a note that Node 18+ has global fetch, and for testing, the inline `global.fetch = jest.fn()` pattern works in the spec file.

---

## 🟡 Significant Issues (Will Cause Bugs or Confusion)

### S1. API client `method` parameter not passed to fetch

**Phase 1, Task 4**  
`apiClient` in `apps/web/src/lib/api-client.ts` accepts `FetchOptions extends Omit<RequestInit, "body">` which includes `method`, but `fetchOptions` spreads into the fetch call. However, for `GET` requests (default), `method` isn't set, which is fine. But when called with `{ method: "POST" }`, the `body` is extracted but `method` would need to be in `fetchOptions`. This actually works because `FetchOptions` extends `RequestInit` minus `body`. 

Actually, re-reading: `method` is part of `RequestInit` and gets passed through `...fetchOptions`. This works correctly. **Withdrawn.**

### S2. `create-next-app` in Phase 1 will prompt interactively

**Phase 1, Task 4**  
The command `npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias --turbopack` will still prompt for package name and other options. The `--yes` flag or exact flags are needed.

**Fix:** Add `--yes` or `--skip-install` to avoid interactive prompts. Also, the `--no-import-alias` flag may not exist in latest Next.js — use `--import-alias "@/*"` or just accept the default.

### S3. Shadcn `toast` component requires `sonner` package

**Phase 1, Task 4** adds the `toast` Shadcn component, but Phase 5+ uses `toast` from `sonner` directly (`import { toast } from "sonner"`). These are different. The `shadcn toast` uses `@radix-ui/react-toast` while `sonner` is a separate package.

**Fix:** Either:
1. Use Shadcn toast component consistently, or
2. Install `sonner` separately and use it directly (which is what Phase 5/7 does)

The plans should specify: `pnpm add sonner` in Phase 5.

### S4. Phase 5 `LoginForm` test uses `vi.fn()` from Vitest but imports use `jest.fn()`

**Phase 5, Task 1**  
The test file does `vi.mock(...)` (Vitest) and `jest.fn()` (Jest). In Vitest, `vi.fn()` is correct; `jest.fn()` won't work.

**Fix:** Replace all `jest.fn()` with `vi.fn()` in the test file. Same issue across other Phase 5-7 test files.

### S5. Phase 5 `BoardList` passes `search` as query parameter incorrectly

**Phase 5, Task 3**  
The `apiClient` call is:
```typescript
apiClient<Board[]>("/boards", { token: token!, ...(search ? { search } : {}) })
```
But `apiClient` treats extra properties as `fetchOptions` (RequestInit), not as query params. The `search` field is not a valid `RequestInit` property and will be silently ignored. The API call will never include the search filter.

**Fix:** Query parameters must be in the URL:
```typescript
apiClient<Board[]>(`/boards${search ? `?search=${encodeURIComponent(search)}` : ""}`, { token: token! })
```
Or add a `params` option to `apiClient`.

### S6. Phase 5 `LoginForm` — `window.location.href = "/boards"` is not idiomatic Next.js

**Phase 5, Task 1**  
After login, the form uses `window.location.href = "/boards"` which causes a full page reload. Better to use `router.push("/boards")` from `next/navigation`.

**Fix:** Use `useRouter()`:
```typescript
const router = useRouter();
// After successful login:
router.push("/boards");
```

### S7. Phase 5 `useBoardData` and `usePublicBoardData` types don't include `lists`

**Phase 6, Task 1**  
`useBoardData` returns `BoardDetail` which has `lists: ListData[]`, but the board GET endpoint as defined in Phase 2 returns just the board row (no lists). There's no backend endpoint that returns board + lists in a single response.

**Fix:** Either:
1. Create a `GET /boards/:id/detail` endpoint that joins lists + cards, or
2. Use separate queries (one for board, one for lists)

This is a **significant missing backend endpoint**.

### S8. Phase 6 — No card detail endpoint that returns comments + attachments

**Phase 6, Task 3**  
The board detail page fetches card details via `apiClient<CardDetail>(`/cards/${cardId}`, { token: token! })`, but no such endpoint returning a card with comments + attachments was defined in Phase 2.

**Fix:** Add `GET /cards/:id/detail` endpoint to Phase 2 that returns the card with its comments, attachments, labels, and assignees. This is a **missing backend endpoint**.

### S9. Phase 3 `template-seed.ts` uses `require("./schema")` dynamically

**Phase 3, Task 3**  
```typescript
createdBy: (await db.select().from(require("./schema").users).limit(1))[0]?.id ?? "seed",
```
This uses CommonJS `require()` inside an async function to get the first user's ID. But with ESM/TypeScript, this may not work. Also `require` with a relative path from a different file location will break.

**Fix:** Use the schema import that already exists:
```typescript
import { users } from "./schema";
// Then:
const [firstUser] = await db.select().from(users).limit(1);
const createdBy = firstUser?.id ?? "00000000-0000-0000-0000-000000000000";
```

### S10. Phase 4 `EmailSender` constructor runs at module load even if SMTP is unconfigured

**Phase 4, Task 2**  
`EmailSender` creates the nodemailer transport in the constructor. If `SMTP_HOST` is not set (common in dev), it will fail to instantiate the entire `NotificationsModule`.

**Fix:** Lazy-initialize the transport on first use:
```typescript
private transporter: nodemailer.Transporter | null = null;

private getTransport(): nodemailer.Transporter {
  if (!this.transporter) {
    this.transporter = nodemailer.createTransport({...});
  }
  return this.transporter;
}
```

---

## 🟢 Minor Issues (Cosmetic / Improvements)

### M1. Phase 1 slug test has a syntax error (missing closing quote)

**Phase 1, Task 2**  
```typescript
expect(generateSlug("Cliente Especial')).toBe("cliente-especial");
```
Should be:
```typescript
expect(generateSlug("Cliente Especial")).toBe("cliente-especial");
```

Mixed single/double quotes — `"Cliente Especial'` — the string starts with `"` but ends with `'`.

### M2. Phase 1 `avatarUrl` in `users` table — no default/length specified

`varchar("avatar_url")` — missing `{ length: ... }`. While not a Drizzle requirement, being inconsistent with other `varchar` columns that specify length.

### M3. Phase 2 `PublicBoardGuard` makes a DB call per request on public routes

This is a performance concern but not a bug. Consider caching the board lookup.

### M4. Phase 3 `applyTemplate` doesn't check if template exists before loop

If `template.lists` is empty, the board is created with zero lists. This is technically valid but might be unexpected.

### M5. Phase 4 `DashboardService.getOverview` uses `avg(position)` for completion %

This is wrong — `position` is the board ordering, not a completion percentage. The SQL should join with per-board stats (count completed cards / total cards).

### M6. Phase 4 `SettingsService.getOrCreate` race condition

If two requests hit `getOrCreate()` simultaneously when the row doesn't exist, both will attempt INSERT. The first succeeds, the second fails with a unique constraint violation (id=1). Should use `ON CONFLICT DO NOTHING` + reselect pattern.

### M7. Phase 6 `useBoardMutations` — mutation type inference may fail

`apiClient` is generic `<T>`, but `useMutation`'s `mutationFn` return type needs to match. Explicitly typing `mutationFn: (data: ...) => apiClient<ResponseType>(...)` would help.

### M8. Phase 7 `BrandingTab` — missing imports

Uses `useState` and `useEffect` but the import statement wasn't added:
```typescript
import { useState, useEffect } from "react";
```

The plan mentions "Add `import { useState, useEffect } from "react";` to the top" in a note, but it should be in the code block.

### M9. Phase 7 `WebhooksTab` — `toast` imported from `sonner` but never installed

`import { toast } from "sonner"` is used but `sonner` is never added to `apps/web/package.json`.

**Fix:** Add `pnpm add sonner` step.

### M10. Phase 7 Dockerfile for web uses `standalone` output mode

```dockerfile
COPY --from=builder /app/apps/web/.next/standalone ./
```
But `next.config.js` needs `output: "standalone"` which wasn't configured. The Next.js scaffold via `create-next-app` doesn't include this by default.

**Fix:** Add configuration step:
```typescript
// apps/web/next.config.ts
const nextConfig = {
  output: "standalone",
  // ...
};
```

---

## 📊 Missing Pieces Summary

| # | What's Missing | Impact | Where to Add |
|---|----------------|--------|-------------|
| 1 | `GET /boards/:id/detail` with lists + cards | Frontend board page won't work | Phase 2 |
| 2 | `GET /cards/:id/detail` with comments + attachments | Card detail panel won't work | Phase 2 |
| 3 | `sonner` package install | Toasts won't work in Phase 5-7 | Phase 5 |
| 4 | `next.config.ts` `output: "standalone"` | Web Docker build won't work | Phase 7 |
| 5 | Public board endpoint that returns lists + cards | Public view shows empty board | Phase 2 |
| 6 | `PATCH /boards/:id/regenerate-token` wasn't implemented | Frontend button fails | Phase 2 |
| 7 | `GET /labels?boardId=:id` endpoint | Labels in card detail won't load | Phase 2 |

---

## 📋 Phase-by-Phase Verdict

| Phase | Critical | Significant | Minor | Verdict |
|-------|----------|-------------|-------|---------|
| 1 Foundation | 3 (C2, C3, C4) | 1 (S2) | 3 (M1-M3) | ⚠️ Fix C2-C4 before executing |
| 2 Auth + CRUD | 2 (C5, C6) | 2 (S7, S8) | 1 (M4) | ⚠️ Fix C6 + add missing endpoints |
| 3 Templates | 0 | 1 (S9) | 1 (M5) | ✅ Minor fixups only |
| 4 Notifications | 2 (C8, C9) | 1 (S10) | 2 (M5-M6) | ⚠️ Fix missing imports |
| 5 Frontend Auth | 0 | 3 (S4, S5, S6) | 0 | ⚠️ Fix test syntax + api client |
| 6 Frontend Kanban | 0 | 1 (S7 - same) | 1 (M7) | ✅ Depends on missing endpoints |
| 7 Admin + E2E | 0 | 0 | 3 (M8-M10) | ✅ Minor fixups |

---

## 🔧 Recommended Fix Priority

**Before execution starts:**
1. Fix C2 (composite PKs for cardAssignees + cardLabels)
2. Fix C3 + C4 (missing `varchar` imports in schema)
3. Fix C5 (e2e test missing global prefix)
4. Add missing backend endpoints (S7, S8)
5. Fix C6 (accumulating `.where()` calls)

**During execution:**
6. Fix C8 (missing `and` import)
7. Fix S4 (jest.fn → vi.fn in all frontend tests)
8. Fix S5 (query params in API client)
9. Add `sonner` install step
10. Add `next.config.ts` standalone output

The plans are **structurally sound** — the TDD flow, file organization, and dependency order are correct. The issues found are implementation details that would surface quickly during execution. The most impactful gap is **3 missing backend endpoints** that the frontend depends on.