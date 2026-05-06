```yaml
---
title: "Fase 2 — Experiência Cliente e Confiança: Auto-Complete, Emails, Activity Log, Soft Delete, Webhook Retry"
prd: PRD-003
status: Draft
author: "Claude Code"
date: 2026-05-06
---

# Plan: Fase 2 — Experiência Cliente e Confiança

## Source

- **PRD**: `docs/prd/PRD-003-fase2-experiencia-cliente.md`
- **Context**: PRD-002 (Fase 1) presumes implementation of core functionality. Fase 2 builds confidence-layer (soft delete, retry, audit) and client-facing layer (emails, auto-complete) on top of that foundation.
- **Date**: 2026-05-06
- **Author**: Claude Code

## Architecture Overview

This phase transforms the system from a "collaborative kanban" into a **production-ready onboarding platform** with observable state changes, reliable integrations, and professional client communication.

The architectural pillars are three:

1. **Reversibility** — Soft delete across all entities. Every destructive operation becomes recoverable by setting `deletedAt`/`deletedBy` instead of hard `DELETE`. This is the foundational change; every query must be audited to filter `deletedAt IS NULL`. A missing `WHERE deletedAt IS NULL` is a data leak and becomes a critical bug.

2. **Observability** — The `board_activities` table, already present in the schema, becomes a first-class citizen. Every significant action on a board populates it via an `ActivityService` called within the existing services. The dashboard stops using `updatedAt` on boards as a proxy for activity.

3. **Client Communication** — React Email templates replace raw HTML strings (rendered server-side with `@react-email/render`). Emails are triggered via the existing EventEmitter2 pipeline. Configurable email settings (SMTP/Resend) move from env vars to the admin Settings UI.

**Webhook reliability** is also hardened: the existing `sendWithRetry()` method (previously unused) is wired into `deliverToActiveWebhooks()`, and a `webhook_deliveries` table provides audit trail for each attempt.

**Dependency on Fase 1:** The `board_members`, labels, and assignees introduced in Fase 1 mean that activity log entries must reference these new relationships correctly (e.g., "Alice assigned Bob to card #5"). The activity log service must be aware that `card.assignees` junction exists.

## Components

### C1: Soft Delete Foundation

**Purpose**: Replace every hard `DELETE` across all services with `UPDATE deletedAt = NOW() + deletedBy = userId`. Filter all queries to hide soft-deleted rows by default.

**Key Details**:
- Entities affected: `boards`, `lists`, `cards`, `comments`, `labels`, `templates`, `template_categories`.
- The service method `remove()` must receive `deletedBy: userId` (from `@CurrentUser()` decorator).
- `db.transaction()` wrapping cascading soft deletes: if board soft-deleted, its lists and cards should also be soft-deleted within the same transaction.
- **Critical**: Every `findAll()`, `findOne()`, `findDetail()`, and join query must add `WHERE deletedAt IS NULL`.
- Admin-only endpoint `GET /boards/deleted` with `RolesGuard` for audit trail listing.

**ADR Reference**: -> ADR candidate (D2 do PRD-003) — manual filtering per query vs Drizzle views.

### C2: Activity Log (Board Activities)

**Purpose**: Make the `board_activities` schema useful. Populate it on every meaningful action and expose a team-facing feed endpoint.

**Key Details**:
- New module `ActivitiesModule` with `ActivitiesService` (create, list) and `ActivitiesController` (`GET /boards/:boardId/activities`).
- `ActivitiesService.create()` is **synchronously called** from existing services (not via event bus), because activity log must not depend on the async bus and should not fail silently.
- Actions logged: `board.created`, `board.archived`, `board.deleted`, `list.created`, `list.moved`, `card.created`, `card.moved`, `card.completed`, `card.assigned`, `card.due_soon`, `comment.added`, `comment.edited`, `attachment.uploaded`, `member.added`, `member.removed`.
- Each entry stores: `boardId`, optional `cardId`, `userId`, `action` string, `description` text, `createdAt`.
- Dashboard endpoint `GET /dashboard/recent-activity` is refactored to query `board_activities` instead of `boards ORDER BY updatedAt`.

**Dependencies**: C1 (soft delete ensures deleted cards don't generate orphan activity entries)

### C3: Auto-Complete Board & Due Soon Cron

**Purpose**: Business-rule automation — boards complete themselves when 100% of cards are done, and the system proactively warns assignees before deadlines.

**Key Details**:
- Auto-complete: After `CardsService.moveCard()`, count `cards WHERE boardId = X AND completedAt IS NULL`. If count == 0, call `BoardsService.update(boardId, { status: 'completed' })` and emit `BOARD_COMPLETED` event.
- If a card is moved OUT of a completion list (un-completed), reverse: `status = 'active'`.
- Due Soon Cron: New `@Cron(CronExpression.EVERY_DAY_AT_7AM)` class `DueSoonCronListener` (separate from existing `OverdueCronListener`).
- Due Soon logic: `SELECT * FROM cards WHERE due_date = CURRENT_DATE + INTERVAL '3 days' AND completed_at IS NULL`. For each, emit `CARD_DUE_SOON` event. The existing listener handles notification creation and optional email.
- **Deduplication**: Store a `dueSoonNotifiedAt` timestamp on `cards` (or use separate `card_notifications` table). Only notify if `dueSoonNotifiedAt IS NULL` to prevent duplicate notifications on cron reruns.

**Dependencies**: C1 (soft delete filters out deleted cards from completion count)

**ADR Reference**: -> ADR-0003 (completed) already defines completion detection; this FR extends it with board-level status toggle.

### C4: Email Infrastructure (React Email Templates)

**Purpose**: Replace raw HTML strings with professional, branded React Email templates.

**Key Details**:
- New directory: `apps/api/src/modules/notifications/email.templates/`
- Templates: `board-created.tsx`, `card-completed.tsx`, `board-completed.tsx`. Each accepts props `{ companyName, primaryColor, logoUrl?, boardTitle, clientName, boardLink? }`.
- `EmailSender` uses `render()` from `@react-email/render` to convert JSX template → HTML string before passing to nodemailer.
- Email service interface (`IEmailSender`) remains unchanged for listeners, so no listener code needs modification.
- Templates are tested via snapshot comparison in unit tests (render output must match stored snapshots).
- Fallback: If `@react-email/render` fails or templates are missing, fallback to legacy HTML string (for backward compatibility during migration).

**Dependencies**: None (pure backend refactor)

**ADR Reference**: -> ADR-0005 (completed) — event bus already triggers emails; this FR only changes rendering layer.

### C5: Email Settings Tab

**Purpose**: Allow admin to configure email provider without editing env vars.

**Key Details**:
- New tab "Email" in Settings page.
- Fields: SMTP Host, SMTP Port, SMTP User, SMTP Password (masked), Email From Address.
- Backend `SettingsSchema` extended with `smtpHost, smtpPort, smtpUser, smtpPassword, emailFrom` columns.
- **Security**: SMTP password is encrypted at rest (simple AES with `ENCRYPTION_KEY` env var) and **never** returned by the API. The `GET /settings` excludes `smtpPassword`; `GET /settings/public` never includes any email config.
- Test button: `POST /settings/test-email` sends a test email to the admin's own email using current config.
- `EmailSender` reads settings from DB at runtime, falling back to env vars if DB not set.

**Dependencies**: None

### C6: Logo Upload

**Purpose**: Upload logo image via multipart instead of copy-pasting a URL.

**Key Details**:
- Reuses the S3/MinIO client built in PRD-002 (FR-9, upload real de arquivos).
- New endpoint: `POST /settings/upload-logo` with `FileInterceptor`.
- Validation: max 2MB, MIME types: `image/png`, `image/jpeg`, `image/svg+xml`.
- File is uploaded to bucket `branding/logo-{uuid}.{ext}`. Public-read permissions on this bucket.
- `SettingsService.updateLogo()` stores the returned S3 URL in `settings.logoUrl`.
- Old logo file is **not** deleted from S3 (orphan storage is acceptable for V1; garbage collection is V2).

**Dependencies**: PRD-002 FR-9 (multipart upload endpoint pattern already established)

### C7: Webhook Retry & Delivery Log

**Purpose**: Make the `sendWithRetry()` actually used and auditable.

**Key Details**:
- `WebhookSender.deliverToActiveWebhooks()` changes from calling `send()` to `sendWithRetry()` (which performs 3 attempts with exponential backoff: 1s, 2s, 4s).
- New schema `webhook_deliveries`: `id, webhookId, event, payload(JSON), status, attempt(max 3), error, createdAt`.
- `WebhookDeliveryService` inserts a row before each attempt and updates `status` + `attempt` after each result.
- `WebhooksTab` in frontend fetches last 10 deliveries per webhook via `GET /webhooks/:id/deliveries` endpoint.
- On final failure (3rd attempt), `status = 'failed'` and no further action is taken (not blocking). Admin can inspect delivery log.

**Dependencies**: None

**ADR Reference**: D3 from PRD-003 — delivery log as separate table vs column on `webhooks`.

### C8: Refresh Token (Frontend)

**Purpose**: Eliminate 401 errors after 15-minute JWT expiry.

**Key Details**:
- `apiClient.ts` wraps `fetch` in an interceptor: on 401 response, attempt `POST /auth/refresh` with `refresh_token` from `localStorage`, retry original request with new access token.
- Max 1 refresh attempt per request to avoid infinite loops.
- If refresh also 401 (expired refresh token), clear auth state + localStorage and redirect to `/login`.
- `useAuthStore` (zustand) updated with `refreshToken()` action.
- **Race condition handling**: If multiple in-flight requests hit 401 simultaneously, only one should trigger refresh. Use a promise-lock (`isRefreshing` boolean + waiters queue).

**Dependencies**: None (frontend-only)

## Implementation Order

| Phase | Component | FRs | Dependencies | Estimated Scope | Milestone |
|-------|-----------|-----|-------------|-----------------|-----------|
| 1 | **C1: Soft Delete Foundation** | FR-5 | None. Base for ALL queries | Medium | All entity services use soft delete; deleted rows invisible in standard queries |
| 2 | **C2: Activity Log** | FR-4 | Phase 1 (soft delete prevents ghost activities) | Medium | Activity entries appear on card move/comment/board actions; dashboard shows real feed |
| 3 | **C8: Refresh Token** | FR-9 | None (frontend independent) | Small | User stays logged in for 7 days; 401s silently refresh |
| 4 | **C3: Auto-Complete & Due Soon** | FR-1, FR-7 | Phase 1 (soft delete) | Medium | Board auto-completes when last card done; daily cron warns 3 days before due |
| 5 | **C4: React Email + C5: Email Settings** | FR-2, FR-3 | Phase 4 (auto-complete triggers emails) | Medium + Medium | Emails use branded React templates; admin configures SMTP in UI |
| 6 | **C6: Logo Upload** | FR-8 | PRD-002 FR-9 (multipart/S3 pattern) | Small | Admin uploads logo image; public view shows uploaded logo |
| 7 | **C7: Webhook Retry** | FR-6 | None | Medium | Failed webhooks retry 3x; delivery log visible per webhook |
| 8 | **Integration & E2E Tests** | All | All above | Medium | E2E validates auto-complete → email → webhook chain |

**Dependency Rationale:**
- **Phase 1 (Soft Delete)** is foundational. Every subsequent phase that touches queries must filter `deletedAt IS NULL`. Missing this causes data leaks (e.g., deleted board still showing in auto-complete counts).
- **Phase 2 (Activity Log)** could technically start in parallel with Phase 1 if we agree on the `deletedAt` column name upfront, but the log service must filter deleted cards when resolving references (e.g., `cardId` of a deleted card). Waiting for Phase 1 removes rework.
- **Phase 3 (Refresh Token)** is entirely frontend and can run in parallel with Phases 1–2.
- **Phase 4 (Auto-Complete/Due Soon)** depends on Phase 1 because the completion count query (`COUNT(cards) WHERE boardId = X`) must exclude deleted cards. Running before soft delete is done risks deleted cards interfering with completion math.
- **Phase 5 (Email)** depends on Phase 4 because email templates need realistic content (board completion, card completion) to validate. Setting up email infra before auto-complete works means testing with manual triggers.
- **Phase 6 (Logo Upload)** reuses the upload pattern from Phase 1h of PRD-002. Pure frontend-backend file upload. Can run in parallel with Phase 5 if S3 client is already configured.
- **Phase 7 (Webhook Retry)** is independent but should be validated with realistic events (which Phase 4 provides).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Soft delete audit incompleto** — uma query esquece `WHERE deletedAt IS NULL` e expõe dados deletados | Medium | High | Lista de checklist: auditar TODAS as queries em `BoardsService`, `ListsService`, `CardsService`, `CommentsService`, `LabelsService`, `TemplatesService`, `DashboardService`, `CardsController` (public). Teste: soft-deletar uma entidade e verificar que NÃO aparece em nenhum endpoint público. |
| **React Email quebra em clientes de email antigos** (Outlook 2016) | Medium | Medium | Usar `@react-email/components` que já inclui tabelas inline e estilos compatíveis. Testar renderização com EmailOnAcid ou Litmus antes de merge. Fallback para HTML inline se render falhar. |
| **Activity log cria dados mortos** — registros de ações em cards deletados ficam órfãos | Medium | Medium | Adicionar FK com `ON DELETE SET NULL` no `cardId` de `board_activities`. Ou manter cardId para audit trail e definir como `description = "Card (deleted) was moved..."`. Documentar escolha. |
| **Due soon cron duplica notificações** se processo reiniciar mid-run | Medium | Medium | Adicionar coluna `dueSoonNotifiedAt` em `cards`. Cron usa `WHERE dueSoonNotifiedAt IS NULL AND dueDate = NOW() + 3 days`. Atualiza após notificar. |
| **Webhook retry bomba endpoint falho** — 3x por evento pode gerar muitas requisições | Low | Medium | Backoff exponencial limita a 3 tentativas totais. Se todos falham, webhook marcado como failed e NÃO tenta novamente até novo evento. Não há retry persistente (sem agenda). |
| **Refresh token race condition** — 5 requests paralelas atingem 401 e disparam 5 refresh calls | Medium | Medium | Implementar promise-lock no interceptor: `isRefreshing` boolean + `refreshSubscribers` queue. Primeiro request inicia refresh; outros esperam a mesma promise. |
| **SMTP password em plaintext no DB** se encriptação falhar | Low | High | Adicionar validação de `ENCRYPTION_KEY` no bootstrap. Se ausente, logar erro fatal e NÃO iniciar servidor. Senha nunca retornada pela API. |
| **Logo upload sem garbage collection** — S3 acumula logos antigos | Low | Low | V2: implementar TTL/lifecycle policy no S3 bucket de branding. Para V1, aceitar armazenamento de órfãos. |

## Open Questions

- **Q1: Soft delete dos cards deve cascade para activities?** Quando um card é soft-deletado, suas entradas em `board_activities` devem ter `cardId` setado para NULL ou permanecerem como referência histórica? Se `board_activities.boardId` FK tem `ON DELETE CASCADE`, soft delete do board não dispara cascade (é UPDATE, não DELETE). Precisamos de trigger manual?
- **Q2: O cron de due-soon deve usar um timezone específico ou UTC?** Se o servidor está em UTC mas o time em São Paulo, um card com dueDate local (00:00 BRT) pode ser processado na hora errada.
- **Q3: O email de teste deve usar o template React Email ou um template simples de teste?** Usar o template real valida a configuração completa, mas envia email "não-produção".

## ADR Index

| ADR | Title | Status | Rationale |
|-----|-------|--------|-----------|
| Existing | ADR-0003: Completion Detection | Completed | Auto-complete (FR-1) extends this logic from card-level to board-level |
| Existing | ADR-0005: Event Bus for Notifications | Completed | Email templates and due soon use the event bus. No new ADR needed. |
| Proposed (D2 from PRD-003) | Soft Delete via Manual Query Filtering | Pending | Decision against Drizzle views or global helpers. Every service query explicitly filters `deletedAt IS NULL`. Documented in plan; ADR optional for future maintainers. |
| Proposed (D3 from PRD-003) | Webhook Delivery Log as Separate Table | Pending | Rejected "last status column on webhooks" in favor of `webhook_deliveries` table. Formalize if deployment team needs to review delivery history. |

---
