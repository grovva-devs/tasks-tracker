```yaml
---
title: "Plano de Execução Paralela com Subagents"
prd: PRD-002, PRD-003, PRD-004
status: Draft
author: "Claude Code"
date: 2026-05-06
---

# Plano de Execução Paralela com Subagents

## Resumo Executivo

Das **14 issues** criadas no GitHub, **8 podem rodar em paralelo** usando subagents. O restante é sequencial devido a dependências de dados ou compartilhamento de arquivos críticos.

| Métrica | Valor |
|---------|-------|
| Issues totais | 14 |
| Issues paralelizáveis | 8 |
| Issues sequenciais (critical path) | 6 |
| Waves de execução | 8 |
| Subagents por wave (máx) | 5 |

---

## 1. Análise de Dependências

### Diagrama de Dependências

```
                    ┌─────────────────────────────────────┐
                    │     WAVE 1: SEQUENCIAL              │
                    │  Phase 1a: Board Members (BASE)     │
                    └──────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
    ┌────┴────┐              ┌────┴────┐              ┌────┴────┐
    │ WAVE 2A │              │ WAVE 2B │              │ WAVE 2C │
    │ Backend │              │ Backend │              │ Frontend│
    │ Cards   │              │ Attach  │              │ Refresh │
    │ +Labels │              │ +S3     │              │ Token   │
    └────┬────┘              └────┬────┘              └────┬────┘
         │                         │                         │
    ┌────┴────┐              ┌────┴────┐              ┌────┴────┐
    │ WAVE 2D │              │ WAVE 2E │              │         │
    │ Backend │              │ Backend │              │         │
    │ Comment │              │ Boards  │              │         │
    │ +Archive│              │ Archive │              │         │
    └────┬────┘              └────┬────┘              └─────────┘
         │                         │
         └───────────┬─────────────┘
                     │
    ┌────────────────┴────────────────┐
    │     WAVE 3: SEQUENCIAL          │
    │  Card Detail + Board Page       │
    │  (shared files bottleneck)      │
    └────────────────┬────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───┴───┐      ┌─────┴──────┐   ┌─────┴─────┐
│WAVE 4A│      │ WAVE 4B    │   │ WAVE 4C   │
│Soft   │      │ Theme      │   │ (idle)    │
│Delete │      │ (frontend) │   │           │
└───┬───┘      └─────┬──────┘   └───────────┘
    │                │
    └────────────────┼────────────────┐
                     │                │
            ┌────────┴────────┐     │
            │   WAVE 5          │     │
            │   Parallel        │     │
            │   (3 subagents)   │     │
            └────────┬──────────┘     │
                     │                │
    ┌────────────────┴────────────────┼────────┐
    │                                   │        │
┌───┴───┐      ┌────────┐      ┌───────┴───┐   │
│WAVE 6 │      │ WAVE 7A│      │   WAVE 7B │   │
│Backend │      │Dash-   │      │  Profile  │   │
│Fixes   │      │board   │      │  + Mobile │   │
│(seq)   │      │(par)   │      │  + Theme  │   │
└───┬───┘      └────────┘      └───────────┘   │
    │                                            │
    └────────────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │   WAVE 8        │
            │   E2E Tests     │
            └─────────────────┘
```

---

## 2. Waves de Execução Detalhadas

### 🔴 WAVE 1 — SEQUENCIAL (Não paralelizável)

**Issue #1: Phase 1a — Board Members (schema, migration, guard refactor)**
- **Por que sequencial:** É a base de permissões para TODA a Fase 1. Sem board members, nenhuma outra funcionalidade tem contexto de "quem pode acessar o board".
- **Arquivos:** `schema/board-members.ts`, `board-member.guard.ts`, `board-members.service.ts`, `boards.controller.ts`
- **Duração estimada:** Medium
- **Subagent:** Não. Executar no contexto principal.

---

### 🟢 WAVE 2 — PARALELO (5 subagents)

Após WAVE 1, 5 domínios independentes podem rodar simultaneamente:

#### Subagent A: Backend Cards + Labels
**Tarefa:** Implementar endpoints de assignees no CardsController e adicionar guards no LabelsController.
- **Issue:** #2 (partial — backend only)
- **Arquivos:** `cards.controller.ts`, `cards.service.ts`, `labels.controller.ts`
- **Independência:** Controllers separados. Nenhum arquivo compartilhado.
- **Entrega:** `POST /cards/:id/assignees`, `DELETE /cards/:id/assignees/:userId`, guards em LabelsController

#### Subagent B: Backend Attachments + S3
**Tarefa:** Configurar S3/MinIO e endpoint multipart de upload.
- **Issue:** #5 (partial — backend only)
- **Arquivos:** `attachments.controller.ts`, `attachments.service.ts`, `s3.config.ts`, `package.json`
- **Independência:** Novo controller + config. Não toca em outros controllers.
- **Entrega:** Endpoint `POST /cards/:cardId/attachments/upload` funcional; S3 client configurado

#### Subagent C: Backend Comments + Archive/Delete
**Tarefa:** Fixar permissão de delete em comentários e adicionar endpoints de archive/delete de boards.
- **Issues:** #4 (partial — backend), #3 (partial — backend)
- **Arquivos:** `comments.controller.ts`, `comments.service.ts`, `boards.controller.ts`, `boards.service.ts`, `boards.dto.ts`
- **Independência:** Comments e boards são controllers separados.
- **Entrega:** `DELETE /comments/:id` com verificação de autor/admin; `PATCH /boards/:id` para archive; `DELETE /boards/:id` para delete

#### Subagent D: Frontend Refresh Token
**Tarefa:** Implementar interceptor automático de refresh token.
- **Issue:** #9 (partial — refresh token only)
- **Arquivos:** `api-client.ts`, `auth.ts`
- **Independência:** 100% frontend. Não toca em nenhum arquivo de outra tarefa.
- **Entrega:** Usuário permanece logado 7 dias; 401s são renovados automaticamente

#### Subagent E: Frontend Theme (Dark/Light)
**Tarefa:** Implementar toggle de tema com next-themes.
- **Issue:** #13 (partial — theme only)
- **Arquivos:** `theme-provider.tsx`, `app/layout.tsx`, `globals.css`, `header.tsx`
- **Independência:** 100% frontend. Só adiciona um botão no header (não remove nada).
- **Entrega:** Toggle dark/light funcional; persistência em localStorage; sem FOUC

**⚠️ Nota sobre Wave 2:** Os subagents A, B, C tocam backend; D e E tocam frontend. Nenhum conflito de arquivo entre A/B/C/D/E.

---

### 🔴 WAVE 3 — SEQUENCIAL (Bottleneck de arquivos compartilhados)

**Merged Task: Card Detail Panel + Board Page Enhancement**
- **Issues:** #2 (frontend), #3 (frontend), #4 (frontend), #5 (frontend)
- **Por que sequencial:** 4 funcionalidades diferentes (assignees, labels, edit card, comment CRUD, upload UI) tocam os mesmos 3 arquivos:
  1. `card-detail-panel.tsx` — adiciona seções de assignees, labels, modo de edição, comment actions, upload
  2. `use-board-mutations.ts` — adiciona 14 novas mutations
  3. `boards/[id]/page.tsx` — integra labels manager, edit modal, actions menu, attachment delete
- **Estratégia:** Executar como única tarefa grande. Subdividir internamente em passos:
  1. Adicionar mutations no hook
  2. Adicionar seções no CardDetailPanel (assignees → labels → edit mode → comment actions → upload)
  3. Integrar no BoardDetailPage
- **Duração estimada:** Large (merge de 4 issues frontend)
- **Subagent:** Não recomendado devido à complexidade de merge.

---

### 🟢 WAVE 4 — PARALELO (2 subagents)

Após WAVE 3 (frontend estável):

#### Subagent F: Soft Delete Foundation
**Tarefa:** Refatorar todos os hard deletes para soft delete.
- **Issue:** #6
- **Arquivos:** `boards.service.ts`, `lists.service.ts`, `cards.service.ts`, `comments.service.ts`, `labels.service.ts`, `templates.service.ts`
- **Duração estimada:** Medium-Large
- **Entrega:** Todos os `.delete()` do Drizzle viram `UPDATE deletedAt`.

#### Subagent G: Frontend Dashboard Polish (preparação)
**Tarefa:** Componentes de UI que não dependem de backend (layout, tabs, card number display).
- **Issue:** #11 (partial — UI components)
- **Arquivos:** `board-list.tsx`, `board-card.tsx`, `board-card-item.tsx`, `board-filter-tabs.tsx`
- **Independência:** Componentes puramente visuais. Só mostram dados que já existem.
- **Entrega:** Tabs de status, card number visível, description truncada.

**⚠️ Nota:** Subagent G pode rodar em paralelo com F porque toca frontend; F toca backend. Zero conflito.

---

### 🟢 WAVE 5 — PARALELO (3 subagents)

Após WAVE 4 (soft delete estável):

#### Subagent H: Activity Log + Auto-Complete + Due Soon
**Tarefa:** Criar module Activities, popular board_activities, implementar auto-complete e cron de due soon.
- **Issue:** #7
- **Arquivos:** `activities.module/`, `cards.service.ts`, `boards.service.ts`, `dashboard.service.ts`
- **Entrega:** Feed de atividades no dashboard; boards auto-completam; cron diário de due soon

#### Subagent I: React Email Templates + Email Settings
**Tarefa:** Substituir HTML inline por React Email; adicionar tab de email no Settings.
- **Issue:** #8
- **Arquivos:** `email.templates/`, `email.sender.ts`, `settings.controller.ts`, `settings.service.ts`, `email-tab.tsx`, `settings schema`, `package.json`
- **Entrega:** Templates profissionais; admin configura SMTP na UI

#### Subagent J: Webhook Retry + Logo Upload
**Tarefa:** Implementar retry real em webhooks e upload de logo.
- **Issue:** #9 (partial — webhook + logo)
- **Arquivos:** `webhook.sender.ts`, `webhook-delivery.service.ts`, `webhook schema`, `settings.controller.ts`, `branding-tab.tsx`
- **Entrega:** Webhooks retry 3x com backoff; delivery log; logo upload funcional

---

### 🔴 WAVE 6 — SEQUENCIAL

**Issue #10: Backend Data Fixes**
- **Por que sequencial:** Depende de Fase 2 completa (queries devem estar estáveis).
- **Arquivos:** `dashboard.service.ts`, `boards.service.ts`, `users.controller.ts`
- **Entrega:** Avg completion fix; search por título; public stats; profile endpoints

---

### 🟢 WAVE 7 — PARALELO (4 subagents)

Após WAVE 6:

#### Subagent K: Dashboard Polish (final)
**Tarefa:** Integrar backend fixes no frontend do dashboard.
- **Issue:** #11 (remaining)
- **Arquivos:** `stats-cards.tsx`, `board-list.tsx`, `dashboard/page.tsx`
- **Entrega:** Stats mostram avg real; busca funciona; filtros de status ativos

#### Subagent L: Interaction Polish
**Tarefa:** Notification links, error handling, template card description.
- **Issue:** #12
- **Arquivos:** `notification-bell.tsx`, `api-client.ts`, `error-handler.ts`, `template-editor.tsx`
- **Entrega:** Notificações clicáveis; erros contextuais; template cards com description

#### Subagent M: Template Categories + Profile Page
**Tarefa:** CRUD de categorias no frontend e página de perfil.
- **Issue:** #13 (partial — categories + profile)
- **Arquivos:** `category-manager.tsx`, `category-filter.tsx`, `templates/page.tsx`, `profile/page.tsx`, `header.tsx`
- **Entrega:** Admin gerencia categorias; user edita perfil

#### Subagent N: Mobile Responsive
**Tarefa:** Adaptar layout para tablets e smartphones.
- **Issue:** #14
- **Arquivos:** `sidebar.tsx`, `header.tsx`, `kanban-board.tsx`, `card-detail-panel.tsx`, `layout.tsx`
- **Entrega:** Sidebar colapsa; kanban scrolla; card detail é bottom sheet

---

### 🔴 WAVE 8 — SEQUENCIAL

**Integration & E2E Tests**
- Rodar suite de testes E2E completa.
- Validar todas as 14 issues.

---

## 3. Mapeamento Subagent → Issue

| Subagent | Issue(s) | Domínio | Arquivos Compartilhados? |
|----------|----------|---------|-------------------------|
| **A** | #2 (backend) | Backend | ❌ Controllers separados |
| **B** | #5 (backend) | Backend | ❌ Novo controller |
| **C** | #3 (backend) + #4 (backend) | Backend | ❌ Controllers separados |
| **D** | #9 (refresh token) | Frontend | ❌ api-client.ts, auth.ts |
| **E** | #13 (theme) | Frontend | ❌ theme, layout, header |
| **F** | #6 | Backend | ⚠️ Todos os services (mas é único subagent no backend nesta wave) |
| **G** | #11 (UI prep) | Frontend | ❌ Componentes visuais puros |
| **H** | #7 | Backend+Frontend | ⚠️ Touches cards/boards services (mas F já passou) |
| **I** | #8 | Backend+Frontend | ❌ Novo diretório email.templates |
| **J** | #9 (webhook+logo) | Backend+Frontend | ❌ webhook vs settings separados |
| **K** | #11 (final) | Frontend | ❌ Dashboard components |
| **L** | #12 | Frontend | ❌ notification-bell, template-editor |
| **M** | #13 (cat+profile) | Frontend | ❌ templates, profile |
| **N** | #14 | Frontend | ⚠️ Touche card-detail-panel (mas C3 já estável) |

---

## 4. Critical Path

A cadeia sequencial que determina o tempo mínimo total:

```
WAVE 1 (1a: Board Members)
    → WAVE 3 (Card Detail + Board Page — bottleneck)
        → WAVE 4 (Soft Delete)
            → WAVE 5 (Activity Log + Emails + Webhooks)
                → WAVE 6 (Backend Fixes)
                    → WAVE 7 (Frontend Polish)
                        → WAVE 8 (E2E Tests)
```

**Otimizações de pipeline:**
- WAVE 2 roda em paralelo com nada esperando (só precisa de 1a)
- WAVE 4F (Soft Delete) pode começar ANTES de WAVE 3 terminar completamente? **Não.** Soft delete muda queries que o frontend depende. O frontend deve estar estável antes.
- Subagent E (Theme) pode rodar a QUALQUER MOMENTO após WAVE 1. É totalmente independente.
- Subagent D (Refresh Token) pode rodar a QUALQUER MOMENTO. Só toca api-client.ts.

---

## 5. Riscos de Paralelismo

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Subagents A+B+C conflitam em `package.json` (ambos adicionam dependências) | Baixa | Média | Cada subagent adiciona sua dependência em seção separada; merge manual de package.json |
| Subagent F (Soft Delete) quebra queries que frontend usa | Média | Alta | Fase 1 E2E tests passam ANTES de iniciar F. Adicionar testes de regressão. |
| Subagent N (Mobile) conflita com L/M que também tocam header.tsx | Média | Média | Header.tsx é pequeno; merge manual simples. Alternativa: fazer header em sequencial. |
| Subagent D (Refresh Token) modifica api-client.ts que outros subagents usam | Baixa | Alta | D só ADICIONA um interceptor; não remove código existente. Se outros subagents não tocam api-client.ts, não há conflito. |
| Testes E2E quebram após merge paralelo | Média | Alta | Rodar testes após CADA wave, não só no final. CI/CD por wave. |

---

## 6. Execução Recomendada com Subagents

### Comando de dispatch por wave:

**WAVE 2 (após 1a completo):**
```
subagent({
  tasks: [
    { agent: "backend-worker", task: "Implement card assignees endpoints (POST/DELETE /cards/:id/assignees) and add BoardMemberGuard to all LabelsController endpoints. See issue #2 backend tasks." },
    { agent: "backend-worker", task: "Configure S3/MinIO client and implement multipart upload endpoint POST /cards/:cardId/attachments/upload with 10MB limit and mime validation. See issue #5 backend tasks." },
    { agent: "backend-worker", task: "Fix CommentsService.remove() to verify author/admin permission. Add archive/delete endpoints to BoardsController. See issues #3 and #4 backend tasks." },
    { agent: "frontend-worker", task: "Implement automatic refresh token interceptor in api-client.ts. On 401, call /auth/refresh, retry original request. If refresh fails, redirect to /login. See issue #9 refresh token tasks." },
    { agent: "frontend-worker", task: "Implement dark/light theme toggle using next-themes. Add ThemeProvider in layout, toggle button in header. Ensure no FOUC. See issue #13 theme tasks." },
  ]
})
```

**WAVE 4 (após 3 completo):**
```
subagent({
  tasks: [
    { agent: "backend-worker", task: "Refactor all hard deletes to soft delete across ALL services (boards, lists, cards, comments, labels, templates). Add WHERE deletedAt IS NULL to all queries. See issue #6." },
    { agent: "frontend-worker", task: "Build dashboard UI components: status filter tabs, card number display, board description truncation. These are visual-only and use existing data. See issue #11 UI tasks." },
  ]
})
```

**WAVE 5 (após 4 completo):**
```
subagent({
  tasks: [
    { agent: "backend-worker", task: "Create ActivitiesModule with service and controller. Add activity logging to CardsService, ListsService, CommentsService, BoardsService. Implement board auto-complete and due-soon cron. See issue #7." },
    { agent: "backend-worker", task: "Create React Email templates (board-created, card-completed, board-completed). Refactor EmailSender to use @react-email/render. Add email settings tab backend. See issue #8." },
    { agent: "backend-worker", task: "Implement webhook retry with exponential backoff in WebhookSender. Create webhook_deliveries schema and service. Add logo upload endpoint. See issue #9 webhook+logo tasks." },
  ]
})
```

**WAVE 7 (após 6 completo):**
```
subagent({
  tasks: [
    { agent: "frontend-worker", task: "Integrate backend fixes into dashboard: avg completion stats, title search, public board stats. See issue #11 final tasks." },
    { agent: "frontend-worker", task: "Make notifications clickable with links to board/card. Implement global error handler interceptor. Add template card description field. See issue #12." },
    { agent: "frontend-worker", task: "Build category manager modal and filter. Build profile page with displayName, avatar upload, password change. See issue #13 categories+profile." },
    { agent: "frontend-worker", task: "Implement mobile responsive: collapsible sidebar, bottom sheet card detail, touch-friendly targets. See issue #14." },
  ]
})
```

---

## 7. Checklist de Validação Pós-Merge

Após cada wave paralela:

- [ ] `pnpm build` passa sem erros (ambos apps: api + web)
- [ ] `pnpm test` passa (testes unitários existentes não quebram)
- [ ] `pnpm test:e2e` passa (full-flow e2e)
- [ ] Verificar se arquivos compartilhados não têm conflitos de merge
- [ ] Rodar `git diff --stat` para confirmar blast radius

---

## 8. Resumo do Speedup

| Cenário | Waves | Tempo Estimado* |
|---------|-------|----------------|
| **Sequencial puro** (14 issues em série) | 14 | ~14x |
| **Com paralelismo otimizado** (8 waves, 5 subagents no pico) | 8 | ~8x |
| **Speedup** | — | **~43% mais rápido** |

\* Tempo unitário = duração média de uma issue small/medium

---
