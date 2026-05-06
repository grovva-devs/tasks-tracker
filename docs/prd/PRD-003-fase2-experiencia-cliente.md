```yaml
---
title: "Fase 2 — Experiência Cliente e Confiança: Auto-Complete, Emails, Activity Log, Soft Delete, Webhook Retry"
prd: PRD-003
status: Draft
owner: TBD
issue: N/A
date: 2026-05-06
version: "1.0"
---

# PRD: Fase 2 — Experiência Cliente e Confiança: Auto-Complete, Emails, Activity Log, Soft Delete, Webhook Retry

---

## 1. Problem & Context

A Fase 1 (PRD-002) entregou as funcionalidades core de uso interno do time. Com o sistema operacional para delivery, a atenção agora deve voltar-se à **experiência do cliente** e à **confiança operacional** do sistema. Hoje, o cliente recebe um link público funcional, mas não recebe comunicação proativa por email; boards não são marcados como completos automaticamente; não há visibilidade do que aconteceu recentemente (audit trail); e operações destrutivas são irreversíveis (hard delete).

**Gaps críticos mapeados:**
- **Auto-mark board completed:** O PRD-001 define (BR-002) que um board é automaticamente marcado `completed` quando todos os cards têm `completed_at`. Hoje o board permanece `active` forever.
- **Email sender profissional:** O `EmailSender` usa HTML string crua. Não há templates React Email. Não há configuração de SMTP/Resend no frontend.
- **Activity log real:** A tabela `board_activities` existe no schema mas **não é populada em lugar nenhum**. O endpoint `/dashboard/recent-activity` apenas retorna boards ordenados por `updatedAt`.
- **Soft delete:** Os services (`CardsService.remove()`, `ListsService.remove()`) usam `DELETE` hard do Drizzle. O schema tem `deletedAt`/`deletedBy`, mas são ignorados.
- **Webhook retry real:** O `WebhookSender` implementa `sendWithRetry()`, mas `deliverToActiveWebhooks()` chama `send()` simples (sem retry).
- **Due soon notification:** O PRD-001 (US-092) exige notificação 3 dias antes do vencimento. Hoje só há notificação de overdue (após a data).
- **Logo upload real:** O branding settings aceita apenas URL externa para logo. Não há upload de imagem.
- **Refresh token automático:** O backend emite refresh token, mas o frontend não o usa. Access token expira em 15 min e usuário é deslogado.

**Por que agora:** O sistema está funcional para uso interno. Para ser usado em produção com clientes reais, é necessário confiabilidade (soft delete, retry), comunicação (emails, auto-complete), e observabilidade (activity log).

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| **Auto-complete boards** | % de boards que transicionam de active para completed automaticamente | 100% (quando todos cards completos) |
| **Email delivery** | % de milestones com email enviado ao cliente (dado clientEmail configurado) | >= 95% |
| **Professional email templates** | Templates usando React Email vs HTML inline crua | 100% |
| **Activity log** | % de ações (card moved, comment added, etc.) registradas em `board_activities` | 100% das ações do kanban |
| **Soft delete** | % de entities (boards, lists, cards) usando soft delete em vez de hard delete | 100% |
| **Webhook retry** | % de webhooks entregues com sucesso após retry (dentro de 3 tentativas) | >= 99% |
| **Due soon alerts** | Membros recebem notificação 3 dias antes do vencimento | 100% dos cards com dueDate |
| **Logo upload** | Admin pode fazer upload de logo sem precisar de URL externa | 100% |
| **Session refresh** | Usuários permanecem logados por 7 dias sem re-login manual | 100% dos usuários ativos |

**Guardrails (must not regress):**
- A view pública `/b/{token}` deve continuar funcionando e filtrando conteúdo internal.
- Webhooks já configurados devem continuar funcionando; retry é aditivo.
- O cron de `overdue` cards deve continuar rodando diariamente.
- Dashboard stats devem continuar retornando dados corretos.

---

## 3. Users & Use Cases

### Primary: Client (External)

> As a client, I want to receive a professional branded email when my onboarding board reaches milestones (created, card completed, board completed) so that I feel informed and confident about the process.

**Preconditions:** Board tem `clientEmail` configurado, `Settings.emailFrom` configurado, email service configurado.

### Secondary: Team Member (Delivery)

> As a team member, I want to see what changed recently across all boards so that I can prioritize my work without asking colleagues.

**Preconditions:** Logged in, boards acessíveis.

### Secondary: Admin

> As an admin, I want mis-deleted items to be recoverable and webhook failures to retry automatically so that I don't lose data or miss integrations.

**Preconditions:** Logged in, admin role.

### Future: Compliance / Audit (enabled by this work)

> As a compliance officer, I want an auditable trail of all actions performed in the system so that I can verify process adherence.

**Preconditions:** Future work — tudo da Fase 2 gera dados para audit.

---

## 4. Scope

### In scope

1. **Auto-mark board completed** — Listener que verifica `COUNT(cards.completed_at) == COUNT(cards.*)` e atualiza board status.
2. **Email React templates** — Substituir HTML inline por templates React Email (board-created, card-completed, board-completed).
3. **Email settings tab** — Tab no Settings para configurar SMTP/Resend (host, port, user, pass, from address, test button).
4. **Activity log** — Listener em todos os eventos de board/card para popular `board_activities`. Endpoint `/activities/:boardId`.
5. **Soft delete** — Refatorar todos os `.delete()` do Drizzle para `UPDATE deletedAt = NOW()`.
6. **Webhook retry** — Usar `sendWithRetry` no `deliverToActiveWebhooks` e adicionar tabela de delivery log.
7. **Due soon notification** — Cron job diário que verifica `dueDate = NOW() + 3 days` e emite `CARD_DUE_SOON`.
8. **Logo upload** — Upload de imagem para S3/MinIO no Settings, substituindo URL string.
9. **Refresh token automático** — Axios/fetch interceptor que renova token em 401 e re-executa request.

### Out of scope / later

| What | Why | Tracked in |
|------|-----|------------|
| Real-time updates via WebSocket | Refresh-based é suficiente para V1. | V2 |
| Multi-tenancy / organizations | Single-org por design. | V2 |
| Client login / authentication | Public link é suficiente por design. | V2 |
| Dark/light theme | `next-themes` instalado mas fora do MVP. | PRD-004 |
| Mobile responsive | Tablet funciona; mobile é best-effort. | PRD-004 |
| Profile update de usuários | UX independente de boards. | PRD-004 |
| Template categories no frontend | Backend já existe; UI é polish. | PRD-004 |

### Design for future (build with awareness)

- **Email service:** Usar interface `IEmailSender` já injectada. Implementação atual (`EmailSender` com nodemailer) pode ser substituída por Resend/SendGrid sem alterar listeners.
- **Activity log:** A tabela `board_activities` usa `action` string. Futuramente pode ser mapeada para enum type-safe. A coluna `description` aceita texto livre para flexibilidade.
- **Webhook delivery log:** Novo schema `webhook_deliveries` com `webhookId`, `event`, `payload`, `status`, `attempt`, `error`, `createdAt`. Permite re-delivery manual futuro.
- **Soft delete:** Adicionar `deletedBy` já existe no schema. Futuramente, adicionar endpoint de "restore" para undo.

---

## 5. Functional Requirements

---

### FR-1: Auto-Mark Board Completed

Quando o último card de um board recebe `completed_at` (por move para lista de completion ou manual), o board deve transicionar automaticamente para `status = 'completed'` e emitir o evento `BOARD_COMPLETED`.

**Acceptance criteria:**

```gherkin
Given um board com 3 cards e status "active"
When o último card (sem completed_at) é movido para a lista "Done"
Then o card recebe completed_at
  And o board status muda para "completed"
  And o evento BOARD_COMPLETED é emitido
  And o board.publicToken continua válido

Given um board com 2 cards completados e 1 incompleto
When o card incompleto é movido para "In Progress" (não completion list)
Then o board permanece "active"

Given um board com status "completed"
When um card é movido para fora da lista "Done" (un-complete)
Then o board status volta para "active"
  And o evento BOARD_COMPLETED não é reemitido
```

**Files:**
- `apps/api/src/modules/cards/cards.service.ts` — After `moveCard`, count completed cards per board and trigger board update if all done
- `apps/api/src/modules/boards/boards.service.ts` — New method `markCompleted(id)`
- `apps/api/src/modules/notifications/listeners/board-events.listener.ts` — Listener for board completion already exists; ensure it fires

---

### FR-2: Email React Templates

Substituir os templates HTML inline em `EmailSender` por templates React Email profissionais e branded.

**Acceptance criteria:**

```gherkin
Given o admin configurou companyName = "Acme Corp" e primaryColor = "#EF4444"
When um board é criado para clientEmail = "client@acme.com"
Then o email enviado usa template React Email com logo, primaryColor, e CTA para public link
  And o html não é string crua

Given um card é movido para "Done"
  And o board tem clientEmail configurado
Then o cliente recebe email de milestone usando template card-completed

Given um board é marcado completed
  And o board tem clientEmail configurado
Then o cliente recebe email de board-completed com progress bar e resumo
```

**Files:**
- `apps/api/src/modules/notifications/email.templates/` — New directory
- `apps/api/src/modules/notifications/email.templates/board-created.tsx` — New — React Email template
- `apps/api/src/modules/notifications/email.templates/card-completed.tsx` — New — React Email template
- `apps/api/src/modules/notifications/email.templates/board-completed.tsx` — New — React Email template
- `apps/api/src/modules/notifications/email.sender.ts` — Modify — Render React Email templates via `@react-email/render`
- `apps/api/package.json` — Add `react-email`, `@react-email/render`, `@react-email/components`
- `apps/api/src/modules/settings/settings.service.ts` — Ensure branding settings (logo, color) passed to email context

---

### FR-3: Email Settings Tab

Adicionar aba "Email" no Settings do frontend para configurar provedor de email (SMTP ou Resend API key).

**Acceptance criteria:**

```gherkin
Given o admin abre Settings
When ele clica na aba "Email"
Then ele vê campos para: SMTP Host, Port, User, Password, From Address
  E um botão "Test Email"

Given o admin preenche credenciais SMTP válidas
When ele clica "Save"
Then as credenciais são salvas no backend (Settings table)
  Não se deve salvar password em plaintext — usar encriptação simples ou env var

Given o admin clica "Test Email"
When o backend tenta enviar um email de teste
Then o admin vê feedback: "Email sent successfully" ou "Connection failed: ..."
```

**Files:**
- `apps/web/src/components/settings/email-tab.tsx` — New — Tab component for email configuration
- `apps/web/src/app/(dashboard)/settings/page.tsx` — Add "Email" tab
- `apps/api/src/modules/settings/settings.controller.ts` — Add endpoint for testing email connection
- `apps/api/src/modules/settings/settings.service.ts` — Add `testEmailConnection()` method
- `apps/api/src/database/schema/settings.ts` — Add columns: `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword`, `emailProvider` (se necessário)

---

### FR-4: Activity Log Real

Popular a tabela `board_activities` em todas as ações significativas (card created, moved, completed, comment added, attachment uploaded) e expor via endpoint para o dashboard.

**Acceptance criteria:**

```gherkin
Given Alice move um card de "To Do" para "In Progress"
When o move completa
Then uma entrada é criada em board_activities com action="card.moved", userId de Alice, cardId, e description "Moved to In Progress"

Given Bob adiciona um comentário em um card
When o comentário é salvo
Then uma entrada é criada em board_activities com action="comment.added"

Given o member abre o dashboard
When ele visualiza a seção "Recent Activity"
Then ele vê as últimas 20 ações ordenadas por data com autor, ação, e link para board/card

Given um board é acessado via public view
When o cliente visualiza atividades
Then ele NÃO vê board_activities (apenas team view)
```

**Files:**
- `apps/api/src/modules/activities/activities.service.ts` — New — Service para criar e listar activities
- `apps/api/src/modules/activities/activities.controller.ts` — New — Endpoint `GET /boards/:boardId/activities`
- `apps/api/src/modules/activities/activities.module.ts` — New
- `apps/api/src/app.module.ts` — Register ActivitiesModule
- `apps/api/src/modules/cards/cards.service.ts` — Call activity service on create/move/update/delete
- `apps/api/src/modules/comments/comments.service.ts` — Call activity service on create/update/delete
- `apps/api/src/modules/lists/lists.service.ts` — Call activity service on create/update/delete
- `apps/web/src/components/dashboard/activity-feed.tsx` — New — Componente de feed de atividades
- `apps/web/src/app/(dashboard)/boards/page.tsx` — Integrate activity feed
- `apps/api/src/modules/dashboard/dashboard.service.ts` — Refactor `getRecentActivity` to use board_activities table

---

### FR-5: Soft Delete

Substituir todos os hard deletes (`.delete()` do Drizzle) por soft deletes (`UPDATE deletedAt = NOW(), deletedBy = userId`).

**Acceptance criteria:**

```gherkin
Given um admin deleta um board
When o DELETE /boards/:id é executado
Then o board recebe deletedAt preenchido e deletedBy = adminId
  E o board não aparece em queries padrão (findAll, findOne)
  E o link público retorna 404

Given o admin lista boards arquivados
When passa status=archived na query
Then boards com deletedAt NÃO aparecem (arquivado != deletado)

Given um card é deletado
When o DELETE /cards/:id é executado
Then o card recebe deletedAt e não aparece no kanban
  E seus comments e attachments recebem cascade soft delete (ou permanecem para audit)

Given o admin lista todos os boards (incluindo deletados)
Then há um endpoint separado ou flag para incluir soft-deleted
```

**Files:**
- `apps/api/src/modules/boards/boards.service.ts` — Refactor `remove()` to use soft delete; add `findDeleted()` admin-only
- `apps/api/src/modules/lists/lists.service.ts` — Refactor `remove()` to soft delete; cascade soft delete cards
- `apps/api/src/modules/cards/cards.service.ts` — Refactor `remove()` to soft delete
- `apps/api/src/modules/comments/comments.service.ts` — Refactor `remove()` to soft delete
- `apps/api/src/modules/labels/labels.service.ts` — Refactor `remove()` to soft delete; cascade card_labels
- `apps/api/src/modules/templates/templates.service.ts` — Refactor `remove()` to soft delete
- `apps/web/src/components/boards/board-list.tsx` — Ensure deleted boards never appear in standard views

---

### FR-6: Webhook Retry Real

Usar `sendWithRetry` no `deliverToActiveWebhooks` e adicionar tabela de delivery log.

**Acceptance criteria:**

```gherkin
Given um webhook configurado para event "board.created"
  And o webhook endpoint está temporariamente offline
When um board é criado
Then o sistema tenta entregar 3 vezes com backoff exponencial (1s, 2s, 4s)
  E após falha, registra em webhook_deliveries com status "failed"

Given o webhook volta online antes do último retry
When o retry é executado
Then a entrega é bem-sucedida
  E webhook_deliveries registra status "delivered"

Given o admin abre a aba Webhooks no Settings
When visualiza a lista
Then cada webhook mostra o número de deliveries sucedidas/falhas recentes
```

**Files:**
- `apps/api/src/database/schema/webhook-deliveries.ts` — New schema table
- `apps/api/src/database/schema/index.ts` — Export webhook-deliveries
- `apps/api/src/modules/notifications/webhook.sender.ts` — Modify `deliverToActiveWebhooks` to use `sendWithRetry`
- `apps/api/src/modules/notifications/webhook-delivery.service.ts` — New — Service to log deliveries
- `apps/api/drizzle/000X_webhook_deliveries.sql` — New migration
- `apps/web/src/components/settings/webhooks-tab.tsx` — Show delivery stats per webhook
			
---

### FR-7: Due Soon Notification

Notificar assignees 3 dias antes do vencimento de um card.

**Acceptance criteria:**

```gherkin
Given um card com dueDate = "2026-05-10"
  And hoje é "2026-05-07"
When o cron de due-soon roda (diariamente às 8h)
Then todos os assignees do card recebem notificação in-app "Card 'X' is due in 3 days"
  And um email é enviado se email configurado

Given um card com dueDate = "2026-05-10"
  And hoje é "2026-05-08" (2 dias antes)
When o cron roda
Then NENHUMA notificação é criada (pois é menor que 3 dias — notificação já foi enviada ou perdeu)

Given um card sem dueDate
When o cron rova
Then o card é ignorado

Given um card já completado
When o cron roda
Then o card é ignorado
```

**Files:**
- `apps/api/src/modules/notifications/listeners/due-soon-cron.listener.ts` — New — Cron daily at 8am
- `apps/api/src/modules/notifications/listeners/overdue-cron.listener.ts` — Refactor to share date logic
- `packages/shared/src/constants/events.ts` — Add `CARD_DUE_SOON` constant
- `apps/api/src/modules/notifications/notifications.service.ts` — Create notification for CARD_DUE_SOON
- `apps/api/src/modules/notifications/email.sender.ts` — Add `sendDueSoonEmail()` method

---

### FR-8: Logo Upload

Permitir upload de logo diretamente no Settings em vez de inserir URL externa.

**Acceptance criteria:**

```gherkin
Given o admin abre Settings > Branding
When ele clica em "Upload Logo"
  And seleciona um arquivo PNG de 200KB
Then o arquivo é enviado para S3/MinIO
  E a URL do arquivo é salva em Settings.logoUrl
  E o preview da logo atualiza imediatamente

Given o admin tenta upload de um arquivo de 5MB
Then o upload é rejeitado com "Maximum logo size is 2MB"

Given o upload completa
When o cliente abre a public view
Then a logo aparece no header com URL do S3
```

**Files:**
- `apps/web/src/components/settings/branding-tab.tsx` — Add file upload input with preview
- `apps/api/src/modules/settings/settings.controller.ts` — Add `POST /settings/upload-logo` endpoint (multipart)
- `apps/api/src/modules/settings/settings.service.ts` — Add `uploadLogo()` method

---

### FR-9: Refresh Token Automático

Renovar o access token automaticamente quando expirar, usando o refresh token armazenado no frontend.

**Acceptance criteria:**

```gherkin
Given o usuário está logado há 14 minutos (access token expira em 15 min)
When uma requisição API é feita
Then o access token ainda é válido e a requisição sucede

Given o usuário está logado há 16 minutos
When uma requisição API é feita
Then o backend retorna 401
  And o frontend automaticamente chama POST /auth/refresh com o refresh token
  And recebe novo access_token + refresh_token
  And re-executa a requisição original
  And o usuário não percebe nenhuma interrupção

Given o refresh token também expirou
When o frontend tenta renovar
Then o usuário é redirecionado para /login
  And uma mensagem "Session expired. Please log in again." é exibida
```

**Files:**
- `apps/web/src/lib/api-client.ts` — Add fetch interceptor for 401 + refresh token logic
- `apps/web/src/lib/auth.ts` — Add `refreshToken()` action in zustand store
- `apps/web/src/app/(dashboard)/layout.tsx` — Ensure middleware/axios interceptor covers all routes
- `apps/api/src/modules/auth/auth.controller.ts` — `POST /auth/refresh` already exists

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Cron de due-soon deve processar < 10.000 cards em < 30s |
| **Performance** | Activity log queries devem retornar em < 200ms com índice apropriado |
| **Reliability** | Webhook retry deve respeitar backoff exponencial (1s, 2s, 4s) |
| **Reliability** | Soft delete deve ser atômico (transaction) quando há cascade |
| **Security** | Email credentials (SMTP password) NÃO devem ser retornados na API pública |
| **Security** | Presigned S3 URLs para logo devem expirar em 1h |
| **Testability** | Todos os listeners de activity log devem ser testáveis sem banco real (mock do service) |
| **Observability** | Webhook delivery log deve permitir identificar falhas em < 5 segundos de scanning |

---

## 7. Risks & Assumptions

### Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| React Email templates quebram em clientes de email antigos (Outlook) | Medium | Medium | Testar em múltiplos clients (Gmail, Outlook, Apple Mail); usar `@react-email/components` que lida com compatibilidade |
| Soft delete cascade fica inconsistente se transaction falhar | High | Low | Usar sempre db.transaction() para soft delete com cascade |
| Cron job de due-soon duplica notificações se reiniciado | Medium | Medium | Usar upsert ou `notifiedAt` flag no card para rastrear já-notificado |
| Refresh token interceptor causa loop infinito em 401 persistente | High | Low | Limitar a 1 tentativa de refresh por request; em falha, redireciona para login |
| Webhook retry spamma endpoint falho | Medium | Medium | Max 3 tentativas com backoff; após isso, falha silent no log |

### Assumptions

- **S3/MinIO está configurado e acessível** em dev e produção para upload de logo e emails (se houver anexos).
- **Nodemailer SMTP funciona** para email de board completion; se não, fallback para Resend API.
- **O usuário tem refresh token válido em localStorage** para auto-refresh funcionar.
- **O cron job roda em uma única instância** (não há múltiplos workers concorrentes). Para múltiplos workers, necessitaria de locks (ex: advisory locks PostgreSQL).

---

## 8. Design Decisions

### D1: React Email vs string HTML para templates

**Options considered:**
1. **String HTML inline (atual)** — Suficiente para MVP, mas não profissional/branded, difícil de manter.
2. **React Email** — Type-safe, componentes reutilizáveis, preview em dev, compatível com múltiplos clients.

**Decision:** React Email.

**Rationale:** O PRD-001 especifica "React Email templates" (FR-NOTIF-005). React Email gera HTML otimizado para clients de email. Os componentes `<Button>`, `<Text>`, `<Section>` já lidam com compatibilidade. O render é síncrono e rápido.

**Future path:** Templates podem ser extraídos para package compartilhado se o email service for usado por outros apps.

### D2: Soft delete — query filtering automático vs manual

**Options considered:**
1. **Filtro manual em cada query** (`WHERE deletedAt IS NULL`) — Explícito, mas repetitivo e propenso a erros.
2. **Query builder helper** — Helper `withSoftDelete()` aplicado nos services.
3. **Drizzle views** — PostgreSQL views que filtram automaticamente (não suportado nativamente por Drizzle ainda).

**Decision:** Filtro manual nos services, padronizado por convenção.

**Rationale:** Drizzle não tem built-in soft delete plugin (como TypeORM). O custo de adicionar `WHERE deletedAt IS NULL` em cada query é baixo (9 queries principais). Um helper global adiciona complexidade indireta. Documentação clara no ADR resolve.

**Future path:** Se o número de entidades crescer, criar um `SoftDeleteMixin` ou helper compartilhado.

### D3: Webhook delivery log — tabela separada vs coluna no webhooks

**Options considered:**
1. **Coluna `lastDeliveryStatus` no `webhooks`** — Simples, mas perde histórico.
2. **Tabela separada `webhook_deliveries`** — Permite histórico, análise de tendência, debugging.

**Decision:** Tabela separada `webhook_deliveries`.

**Rationale:** Histórico é essencial para debugging de falhas intermitentes. A tabela tem poucas colunas e pode ser purgada periodicamente (TTL 30 dias).

---

## 9. File Breakdown

| File | Change type | FR | Description |
|------|-------------|-----|-------------|
| `apps/api/src/modules/notifications/email.templates/` | New | FR-2 | Directory for React Email templates |
| `apps/api/src/modules/notifications/email.templates/board-created.tsx` | New | FR-2 | Template for board creation email |
| `apps/api/src/modules/notifications/email.templates/card-completed.tsx` | New | FR-2 | Template for card completion milestone email |
| `apps/api/src/modules/notifications/email.templates/board-completed.tsx` | New | FR-2 | Template for board completion email |
| `apps/api/src/modules/notifications/email.sender.ts` | Modify | FR-2 | Use React Email render instead of inline HTML |
| `apps/api/src/modules/notifications/listeners/due-soon-cron.listener.ts` | New | FR-7 | Daily cron for due-soon notifications |
| `apps/api/src/modules/notifications/webhook-delivery.service.ts` | New | FR-6 | Service to log webhook delivery attempts |
| `apps/api/src/modules/notifications/webhook.sender.ts` | Modify | FR-6 | Use `sendWithRetry` in `deliverToActiveWebhooks` |
| `apps/api/src/modules/activities/activities.service.ts` | New | FR-4 | CRUD for board activities |
| `apps/api/src/modules/activities/activities.controller.ts` | New | FR-4 | Endpoint for board activities |
| `apps/api/src/modules/activities/activities.module.ts` | New | FR-4 | NestJS module registration |
| `apps/api/src/modules/cards/cards.service.ts` | Modify | FR-1, FR-4, FR-5 | Add board completion check, activity logging, soft delete |
| `apps/api/src/modules/lists/lists.service.ts` | Modify | FR-4, FR-5 | Activity logging, soft delete |
| `apps/api/src/modules/comments/comments.service.ts` | Modify | FR-4, FR-5 | Activity logging, soft delete |
| `apps/api/src/modules/boards/boards.service.ts` | Modify | FR-1, FR-4, FR-5 | Auto-complete logic, activity logging, soft delete |
| `apps/api/src/modules/labels/labels.service.ts` | Modify | FR-5 | Soft delete |
| `apps/api/src/modules/templates/templates.service.ts` | Modify | FR-5 | Soft delete |
| `apps/api/src/modules/settings/settings.controller.ts` | Modify | FR-3, FR-8 | Email test endpoint, logo upload endpoint |
| `apps/api/src/modules/settings/settings.service.ts` | Modify | FR-3, FR-8 | Email test logic, logo upload to S3 |
| `apps/api/src/database/schema/webhook-deliveries.ts` | New | FR-6 | Schema for delivery log |
| `apps/api/src/database/schema/index.ts` | Modify | FR-6 | Export webhook-deliveries |
| `apps/api/drizzle/000X_webhook_deliveries.sql` | New | FR-6 | Migration |
| `apps/web/src/components/settings/email-tab.tsx` | New | FR-3 | Email configuration UI |
| `apps/web/src/components/settings/branding-tab.tsx` | Modify | FR-8 | Add file upload for logo |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Modify | FR-3 | Add "Email" tab |
| `apps/web/src/components/dashboard/activity-feed.tsx` | New | FR-4 | Recent activity feed component |
| `apps/web/src/app/(dashboard)/boards/page.tsx` | Modify | FR-4 | Integrate activity feed |
| `apps/web/src/lib/api-client.ts` | Modify | FR-9 | Add 401 interceptor + refresh token logic |
| `apps/web/src/lib/auth.ts` | Modify | FR-9 | Add `refreshToken` action |
| `apps/api/package.json` | Modify | FR-2 | Add react-email dependencies |
| `apps/api/src/app.module.ts` | Modify | FR-4 | Register ActivitiesModule |

---

## 10. Dependencies & Constraints

- **React Email** (^0.x) — Para templates de email. Requer React como peer dependency.
- **@react-email/render** — Para server-side rendering de templates React para HTML string.
- **@aws-sdk/client-s3** — Para upload de logo (já dependência da Fase 1 se upload for implementado).
- **MinIO** — Para S3-compatible local storage (dev).
- **Drizzle ORM** — Para soft delete migrations.
- **PostgreSQL advisory locks** — Se houver múltiplas instâncias do cron job.

---

## 11. Rollout Plan

1. **Phase 2a: Soft Delete Foundation** — Refatorar `.delete()` para soft delete em todos os services. Adicionar `findDeleted()` onde necessário.
2. **Phase 2b: Activity Log** — Criar module Activities, adicionar chamadas em todos os services modificados na Phase 2a.
3. **Phase 2c: Auto-Complete & Due Soon** — Listener de card completion verificando board status; cron job diário para due-soon.
4. **Phase 2d: Email Infrastructure** — React Email setup, templates, integração com EmailSender. Tab de email no frontend.
5. **Phase 2e: Logo Upload** — Endpoint multipart para logo, integração com BrandingTab.
6. **Phase 2f: Webhook Retry & Delivery Log** — Tabela de delivery log, refatorar sender para usar retry.
7. **Phase 2g: Refresh Token** — Interceptor no frontend, testes de sessão.
8. **Phase 2h: Integration & E2E Tests** — Testes para activity log, auto-complete, due-soon, email rendering.

---

## 12. Open Questions

| # | Question | Owner | Due | Status |
|---|----------|-------|-----|--------|
| Q1 | Devemos manter histórico de `board_activities` indefinidamente ou com TTL? | Dev | Phase 2b | Open |
| Q2 | Logo upload deve substituir o campo URL existente ou adicionar upload como opção separada? | Dev | Phase 2e | Open |
| Q3 | O cron de due-soon deve rodar na mesma hora do overdue (8h) ou em horário diferente? | Dev | Phase 2c | Open |
| Q4 | Soft delete dos cards deve dar cascade soft delete em comments/attachments ou manter filhos? | Dev | Phase 2a | Open |

---

## 13. Related

| Issue / PRD | Relationship |
|-------|-------------|
| PRD-001-onboarding-tracker.md | **Depends-on / extends** — Funcionalidades descritas no PRD-001 |
| PRD-002-fase1-core-funcional.md | **Depends-on** — Esta Fase 2 assume que a Fase 1 está implementada |
| ADR-0005-event-bus-for-notifications.md | **Completed** — Event bus já implementado; usado para auto-complete e activity log |
| ADR-0003-completion-detection.md | **Completed** — Detecção de completion já existe; usada para trigger de auto-complete |

---

## 14. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-05-06 | Initial draft | Claude + User |

---

## 15. Verification (Appendix)

1. **Auto-complete**: Criar board com 2 cards, mover ambos para Done, verificar que board status muda para completed.
2. **Activity log**: Mover card, adicionar comentário, upload attachment. Verificar que 3 entradas aparecem em `board_activities` com userId correto.
3. **Soft delete**: Deletar um board como admin. Verificar que `deletedAt` é preenchido. Verificar que não aparece no dashboard padrão.
4. **Email template**: Trigger board completion. Verificar que email contém branding (logo, primaryColor) do Settings.
5. **Due soon**: Definir card dueDate para hoje + 3 dias. Executar cron manualmente. Verificar notificação in-app para assignees.
6. **Webhook retry**: Configurar webhook para URL offline. Trigger evento. Verificar 3 tentativas no log com backoff crescente.
7. **Refresh token**: Esperar 15 min, realizar ação no frontend. Verificar que requisição é renovada automaticamente.
