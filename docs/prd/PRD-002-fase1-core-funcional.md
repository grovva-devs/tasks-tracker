```yaml
---
title: "Fase 1 — Core Funcional: Assignees, Labels, Board Members e CRUD Essenciais"
prd: PRD-002
status: Draft
owner: TBD
issue: N/A
date: 2026-05-06
version: "1.0"
---

# PRD: Fase 1 — Core Funcional: Assignees, Labels, Board Members e CRUD Essenciais

---

## 1. Problem & Context

O Tasks Tracker possui um backend robusto com schemas completos para assignees de cards, labels por board, board members, CRUD de boards/cards/comments/attachments, e uma view pública para clientes. Contudo, a maioria das funcionalidades críticas para o dia-a-dia do time está **inacessível no frontend** ou **incompleta na integração**, transformando o sistema em um "kanban de leitura" para tarefas essenciais.

**Gaps críticos mapeados:**
- **Card assignees:** O backend possui tabela `card_assignees` e listener `CARD_ASSIGNED`, mas não há endpoint REST exposto nem UI para adicionar/remover membros de um card.
- **Labels:** Backend tem CRUD completo (`labels`, `cardLabels`), mas o frontend não permite criar labels nem associá-las a cards.
- **Edição de card:** O `CardDetailPanel` é apenas leitura para título, descrição e due date. Não há formulário de edição.
- **Edição de board:** Não há UI para atualizar título, descrição, clientName ou clientEmail de um board existente.
- **Arquivar / deletar board:** O backend suporta `status: archived` e soft delete (campos `deletedAt`/`deletedBy`), mas o frontend não oferece botão/opção.
- **Board members:** O `BoardMemberGuard` verifica apenas se `userId === createdBy` ou `role === admin`. Membros não-admin não conseguem acessar boards criados por colegas. Não existe tabela `board_members` para times colaborativos.
- **Comment edit/delete:** O backend (`CommentsService.update`) verifica `authorId`, mas o frontend (`CommentList`) não expõe ações de editar/deletar.
- **Attachment delete:** O `AttachmentList` recebe prop `onDelete`, mas o `BoardDetailPage` não conecta a mutation correspondente.
- **Upload real de arquivos:** O `AttachmentsController` salva apenas metadados (filename, url, size). Não há endpoint `multipart/form-data`, integração com S3/MinIO, nem componente de upload no frontend.

**Por que agora:** Essas 9 funcionalidades são pré-requisitos para que o sistema seja usável como ferramenta de onboarding. Sem elas, membros não conseguem distribuir trabalho (assignees), categorizar (labels), corrigir erros (edit/delete), colaborar (board members), nem entregar arquivos a clientes (upload).

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| **Adicionar assignees a cards** | % de cards onde membros podem ser atribuídos/removidos via UI | 100% |
| **Gerenciar labels por board** | % de boards com CRUD de labels + associação a cards via UI | 100% |
| **Editar card** | % de cards editáveis (título, descrição, due date) | 100% |
| **Editar board** | % de boards editáveis (título, descrição, clientName, clientEmail) | 100% |
| **Arquivar / deletar board** | % de boards com ação disponível no frontend (admin/criador) | 100% |
| **Board members** | % de boards acessíveis por qualquer membro atribuído ao board | 100% |
| **Comment edit/delete** | % de comments com ações visíveis para autor/admin | 100% |
| **Attachment delete conectado** | AttachmentList.onDelete funcional no board detail | 100% |
| **Upload real de arquivos** | Endpoint multipart + S3/MinIO + componente de upload no frontend | 1 endpoint funcional |

**Guardrails (must not regress):**
- A view pública (`/b/{token}`) deve continuar ocultando comments/attachments `internal`.
- A detecção automática de card completion (mover para lista "Done") não deve quebrar.
- O `BoardMemberGuard` deve continuar permitindo admin em todos os boards.
- A busca e filtragem de boards no dashboard devem continuar funcionando.

---

## 3. Users & Use Cases

### Primary: Team Member (Delivery)

> As a team member, I want to assign myself and colegas to cards, add labels, edit card details, and upload files so that we can execute onboarding boards collaboratively.

**Preconditions:** Logged in, membro do board (via `board_members` ou `createdBy`).

### Secondary: Admin

> As an admin, I want to archive completed boards, manage team access to boards, and delete obsolete boards so that the workspace stays organized.

**Preconditions:** Logged in, role `admin`.

### Future: Client (enabled by this work)

> As a client viewing the public board, I want to see updated labels, assigned team members avatars, and download deliverables so that I understand who is responsible for each task.

**Preconditions:** Access via public token. Público recebe apenas dados `client` visibility.

---

## 4. Scope

### In scope

1. **Card assignees** — Endpoint REST para add/remove assignees + UI no `CardDetailPanel`. Notificações por assignee já existem no listener.
2. **Labels** — CRUD de labels por board no frontend + UI para add/remove labels em cards. Backend já tem endpoints.
3. **Edit card** — Formulário de edição no `CardDetailPanel` (título, descrição, due date).
4. **Edit board** — Modal/inline para editar título, descrição, clientName, clientEmail no header do board.
5. **Arquivar / deletar board** — Botão no header do board (admin/criador) com confirmação.
6. **Board members** — Nova tabela `board_members` + migration + atualização do `BoardMemberGuard` + endpoint para listar membros.
7. **Comment edit/delete** — Ações de editar/deletar no `CommentList` com permissões (autor/admin).
8. **Attachment delete conectado** — Conectar `onDeleteAttachment` ao hook de mutações no `BoardDetailPage`.
9. **Upload real de arquivos** — Endpoint multipart, integração S3/MinIO, componente de upload no `AttachmentList`.

### Out of scope / later

| What | Why | Tracked in |
|------|-----|------------|
| Auto-mark board as completed quando 100% dos cards completos | Requer listener de card completion + update de board status. Complexidade média, melhor na Fase 2. | PRD-003 |
| Email templates profissionais (React Email) | Apenas infra de upload está no escopo; templates de email são Fase 2. | PRD-003 |
| Board activity log real | Schema existe mas não é populado. Grande esforço de listeners. | PRD-003 |
| Due soon notification (3 dias antes) | Requer nova cron job. Não bloqueia uso. | PRD-003 |
| Profile update (usuário próprio) | Funcionalidade independente de board. | PRD-004 |
| Dark/light theme | UX polish, não bloqueante. | PRD-004 |
| Mobile responsive | UX polish, não bloqueante. | PRD-004 |

### Design for future (build with awareness)

- **Board members:** A tabela `board_members` usa `(boardId, userId)` como PK composta. O `BoardMemberGuard` deve ser refatorado para consultar esta tabela, permitindo futuras permissões granulares (ex: `role` por board).
- **Upload:** O componente de upload deve aceitar `visibility` ("internal" | "client") e limitar tamanho (10MB). O backend deve retornar URL assinado do S3, não hospedar arquivo localmente.
- **Labels:** O schema `labels` é por board. Futuramente, labels podem ser globais (template-level) se necessário — o schema atual não impede essa extensão.

---

## 5. Functional Requirements

---

### FR-1: Card Assignees

Permitir atribuir e remover membros do time em cards. O backend já emite evento `CARD_ASSIGNED` via EventEmitter, e o `NotificationsService` cria notificação in-app para o assignee.

**Acceptance criteria:**

```gherkin
Given a card exists in a board
  And the board has members Alice (admin) and Bob (member)
When Alice opens the card detail panel
Then she sees a section "Assignees" com os membros atuais e um botão "Add Assignee"

Given Alice clicks "Add Assignee"
  And seleciona Bob de um dropdown de membros do board
When ela confirma
Then Bob aparece na lista de assignees do card
  And Bob recebe uma in-app notification "Card 'X' assigned to you"
  And o backend emite evento CARD_ASSIGNED

Given Alice tenta adicionar Bob novamente
Then a operação é idempotente (onConflictDoNothing)
  And nenhuma notificação duplicada é criada

Given Alice clica no X ao lado do assignee Bob
When ela confirma a remoção
Then Bob desaparece da lista de assignees
  And nenhuma notificação é enviada
```

**Files:**
- `apps/api/src/modules/cards/cards.controller.ts` — New endpoints `POST /cards/:id/assignees` and `DELETE /cards/:id/assignees/:userId`
- `apps/api/src/modules/cards/cards.service.ts` — Methods `addAssignee()`, `removeAssignee()`
- `apps/api/src/common/guards/board-member.guard.ts` — Ensure guard allows board members (not just createdBy)
- `apps/web/src/components/board/card-detail-panel.tsx` — Add Assignees section with member dropdown
- `apps/web/src/hooks/use-board-mutations.ts` — Add `addAssignee` and `removeAssignee` mutations

---

### FR-2: Labels

Permitir criar, editar, deletar labels por board e associar/remover labels em cards.

**Acceptance criteria:**

```gherkin
Given a board exists
When a member with acesso ao board abre a página do board
Then ele vê um botão "Manage Labels" no header do board

Given o member clica "Manage Labels"
When ele preenche nome "Urgente" e cor #EF4444 e clica "Create"
Then a label aparece na lista de labels do board

Given a card exists no board
When o member abre o card detail panel
Then ele vê uma seção "Labels" com as labels já associadas e um botão "Add Label"

Given o member seleciona a label "Urgente" no dropdown
When ele confirma
Then o card exibe o dot/badge "Urgente" na lista e no painel

Given o member clica no X em uma label no card detail panel
When ele confirma
Then a label é removida do card, mas a label continua existindo no board
```

**Files:**
- `apps/web/src/components/board/labels-manager.tsx` — New — Modal para CRUD de labels do board
- `apps/web/src/components/board/card-labels.tsx` — New — Seção de labels no CardDetailPanel
- `apps/web/src/hooks/use-board-mutations.ts` — Add `createLabel`, `updateLabel`, `deleteLabel`, `addCardLabel`, `removeCardLabel` mutations
- `apps/api/src/modules/labels/labels.controller.ts` — Add `@UseGuards(BoardMemberGuard)` (currently lacks guards)
- `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` — Integrate LabelsManager into board header

---

### FR-3: Edit Card

Permitir editar título, descrição e due date de um card existente diretamente no `CardDetailPanel`.

**Acceptance criteria:**

```gherkin
Given a card exists com título "Old Title" e descrição "Old desc"
When o member clica "Edit" no CardDetailPanel
Then o painel entra em modo de edição com inputs para título, descrição e due date

Given o member altera o título para "New Title"
  And altera a descrição para "New desc"
  And altera o due date para "2026-06-01"
When ele clica "Save"
Then o card é atualizado no backend
  E o painel volta ao modo de visualização com os novos dados
  E o kanban board reflete o novo título

Given o member clica "Cancel"
When ele altera dados mas não salva
Then nenhuma requisição é feita
  E os campos retornam aos valores originais
```

**Files:**
- `apps/web/src/components/board/card-detail-panel.tsx` — Add edit mode toggle, input fields, save/cancel buttons
- `apps/web/src/hooks/use-board-mutations.ts` — `updateCard` mutation já existe mas precisa ser usada para edição
- `apps/api/src/modules/cards/cards.controller.ts` — `PATCH /cards/:id` já existe; verify DTO allows all fields
- `apps/api/src/common/dto/cards.dto.ts` — Verify `UpdateCardDto` supports description and dueDate

---

### FR-4: Edit Board

Permitir editar título, descrição, clientName e clientEmail de um board existente.

**Acceptance criteria:**

```gherkin
Given a board existe com título "Acme Onboarding"
When o admin ou criador do board abre a página do board
Then ele vê um ícone de "Edit" ao lado do título no header

Given o admin clica "Edit"
Then um modal/drawer aparece comform para título, descrição, client name, client email

Given o admin altera o título para "Acme Corp Onboarding"
  And altera o clientEmail para "new@acme.com"
When ele clica "Save"
Then o board é atualizado no backend
  E o header reflete o novo título
  E o dashboard lista reflete o novo clientName

Given um member que não é o criador do board
When ele tenta editar
Then a opção de editar não aparece (hidden pelo frontend) ou retorna 403
```

**Files:**
- `apps/web/src/components/boards/edit-board-modal.tsx` — New — Modal com form de edição de board
- `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` — Add edit button to header, integrate modal
- `apps/web/src/hooks/use-board-mutations.ts` — Add `updateBoard` mutation (new)
- `apps/api/src/modules/boards/boards.controller.ts` — `PATCH /boards/:id` já existe

---

### FR-5: Arquivar / Deletar Board

Permitir arquivar (soft delete) ou deletar permanentemente um board. Admin pode fazer ambos; criador pode arquivar.

**Acceptance criteria:**

```gherkin
Given a board ativo existe
When o admin abre o menu do board (três pontinhos no header)
Then ele vê opções "Archive" e "Delete"

Given o admin clica "Archive"
  And confirma no dialog
Then o board status muda para "archived"
  E o board desaparece da lista padrão do dashboard
  E o link público do board continua funcionando

Given o admin clica "Delete"
  And confirma no dialog com digitação do título do board
Then o board recebe deletedAt preenchido
  E o board desaparece de todas as listas
  E o link público retorna 404

Given o member (não admin) que é o criador do board
When ele abre o menu
Then ele vê apenas "Archive", não vê "Delete"

Given o member que não é criador nem admin
When ele abre o menu
Then ele não vê opções de archive/delete
```

**Files:**
- `apps/web/src/components/boards/board-actions-menu.tsx` — New — Dropdown com Archive/Delete no header do board
- `apps/web/src/hooks/use-board-mutations.ts` — Add `archiveBoard`, `deleteBoard` mutations
- `apps/api/src/modules/boards/boards.controller.ts` — `PATCH /boards/:id` for archive; `DELETE /boards/:id` for delete (already exists but hard delete — change to soft delete)
- `apps/api/src/modules/boards/boards.service.ts` — Change `remove` to set `deletedAt` and `deletedBy` instead of hard delete
- `apps/web/src/components/boards/board-list.tsx` — Filter out `deletedAt` boards from list; add status filter tabs

---

### FR-6: Board Members

Criar tabela `board_members` para permitir que múltiplos membros acessem um board, não apenas o criador.

**Acceptance criteria:**

```gherkin
Given a board foi criado por Alice
When Alice abre o board detail
Then ela vê uma aba/section "Members" com ela mesma como criador

Given Alice clica "Add Member"
  And seleciona Bob do dropdown de usuários do sistema
When ela confirma
Then Bob recebe acesso ao board
  E Bob consegue ver o board no dashboard
  E Bob consegue criar/editar cards e lists no board

Given um member Charlie que NÃO está no board_members
When Charlie tenta acessar o board via API
Then o BoardMemberGuard retorna 403

Given um admin Diana que NÃO está no board_members
When ela acessa o board
Then o BoardMemberGuard permite (admin bypass)

Given Alice remove Bob do board
When Bob tenta acessar o board
Then o BoardMemberGuard retorna 403
```

**Files:**
- `apps/api/src/database/schema/board-members.ts` — New schema table
- `apps/api/src/database/schema/index.ts` — Export board-members schema
- `apps/api/src/database/schema/boards.ts` — Add boardMembers relation
- `apps/api/drizzle/000X_board_members.sql` — New migration
- `apps/api/src/modules/boards/boards.module.ts` — Register board members service
- `apps/api/src/modules/boards/board-members.service.ts` — New — CRUD de board members
- `apps/api/src/modules/boards/boards.controller.ts` — Endpoints `GET /boards/:id/members`, `POST /boards/:id/members`, `DELETE /boards/:id/members/:userId`
- `apps/api/src/common/guards/board-member.guard.ts` — Refactor to check `board_members` table or admin role
- `apps/web/src/components/boards/board-members-modal.tsx` — New — UI para gerenciar membros do board

---

### FR-7: Comment Edit/Delete

Permitir que o autor de um comentário edite seu próprio comentário, e que autor ou admin deletem.

**Acceptance criteria:**

```gherkin
Given um comment foi criado por Bob com conteúdo "Erro no step 3"
When Bob visualiza o card detail panel
Then ele vê ícones de "Edit" e "Delete" ao lado do seu comment

Given Alice (admin) visualiza o mesmo comment
Then ela vê apenas "Delete" (não vê Edit pois não é autor)

Given Charlie (outro member) visualiza o comment
Then ele não vê nenhuma ação

Given Bob clica "Edit"
When ele altera o texto para "Erro corrigido no step 3"
  And clica "Save"
Then o comment é atualizado
  E updatedAt é preenchido

Given Bob clica "Delete"
  And confirma
Then o comment é removido da lista
  E o backend executa DELETE /comments/:id
```

**Files:**
- `apps/web/src/components/board/comment-list.tsx` — Add edit/delete buttons with conditional rendering
- `apps/web/src/components/board/comment-item.tsx` — New — Extracted component for individual comment with edit mode
- `apps/web/src/hooks/use-board-mutations.ts` — Add `updateComment`, `deleteComment` mutations
- `apps/api/src/modules/comments/comments.controller.ts` — Verify `PATCH /comments/:id` author check already exists

---

### FR-8: Attachment Delete Conectado

Conectar o botão de deletar attachment no frontend à mutation real.

**Acceptance criteria:**

```gherkin
Given a card tem um attachment "contrato.pdf"
When o member abre o card detail panel
  E clica no ícone de lixeira ao lado do attachment
Then o backend executa DELETE /attachments/:id
  E o attachment desaparece da lista
```

**Files:**
- `apps/web/src/hooks/use-board-mutations.ts` — Add `deleteAttachment` mutation
- `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` — Pass `onDeleteAttachment` to `CardDetailPanel`
- `apps/api/src/modules/attachments/attachments.controller.ts` — Verify delete endpoint exists

---

### FR-9: Upload Real de Arquivos

Implementar upload de arquivos via multipart/form-data, armazenamento em S3/MinIO, e componente de upload no frontend.

**Acceptance criteria:**

```gherkin
Given o member abre o card detail panel na aba Attachments
When ele clica "Upload File"
  And seleciona um arquivo PDF de 2MB
When o upload completa
Then o arquivo aparece na lista de attachments com nome, tamanho e badge de visibility
  E o arquivo está acessível via URL assinado do S3

Given o member tenta fazer upload de um arquivo de 15MB
Then o upload é rejeitado com erro "Maximum file size is 10MB"

Given o member seleciona visibility "internal"
When o upload completa
Then o attachment é salvo com visibility = "internal"
  E não aparece na view pública do cliente

Given o member clica em um attachment
Then o arquivo é baixado via link pré-assinado do S3
```

**Files:**
- `apps/api/src/modules/attachments/attachments.controller.ts` — Add `POST /cards/:cardId/attachments/upload` with multipart parser
- `apps/api/src/modules/attachments/attachments.service.ts` — Add `uploadToS3()` method
- `apps/api/src/config/s3.config.ts` — New — S3/MinIO client configuration
- `apps/api/package.json` — Add `@aws-sdk/client-s3` dependency
- `apps/web/src/components/board/attachment-upload.tsx` — New — Componente de upload com input file, progress bar, visibility toggle
- `apps/web/src/components/board/attachment-list.tsx` — Integrate upload component
- `apps/web/src/hooks/use-board-mutations.ts` — Add `uploadAttachment` mutation using FormData
- `apps/api/src/modules/attachments/attachments.module.ts` — Register S3 service injection

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Upload de arquivo até 10MB deve completar em < 10s em rede normal |
| **Security** | Upload deve validar mime type e rejeitar executáveis (.exe, .sh, .bat) |
| **Security** | URLs S3 devem ser pré-assinadas (presigned) com expiração de 1h |
| **Security** | Board member guard deve verificar `board_members` tabela em <= 2 queries |
| **UX** | Comment edit deve mostrar inline (sem reload de página) |
| **UX** | Board archive/delete deve exigir confirmação para prevenir acidentes |
| **Testability** | Toda mutation nova no `useBoardMutations` deve invalidar query relevante |

---

## 7. Risks & Assumptions

### Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Board member guard refatoração quebra acesso de admin | Critical | Low | Tests E2E existentes validam admin access; adicionar testes para board member scenarios |
| Upload de arquivos grandes causa timeout no servidor | Medium | Medium | Limitar a 10MB no frontend + backend; usar streaming multipart |
| S3/MinIO não configurado no ambiente de dev | Medium | High | Fallback para upload local em dev (salvar no filesystem) com flag env |
| Labels UI polui o board header com muitos elementos | Low | Medium | Usar overflow/max-w no header; agrupar actions em dropdown |
| Comment edit sem optimistic update causa flicker | Low | Medium | Implementar optimistic update no React Query mutation |

### Assumptions

- **O ambiente de dev usa MinIO** (S3-compatible local) para uploads. Se não houver MinIO, implementar fallback para filesystem local.
- **Todos os usuários do sistema estão na mesma organização.** Não há multi-tenancy.
- **O `BoardMemberGuard` atual é a única fonte de autorização para boards.** Não há middleware de autorização em outros níveis.
- **O frontend usa React Query para server state.** Todas as mutations devem invalidar queries relevantes.

---

## 8. Design Decisions

### D1: Board members — tabela nova vs reaproveitar outra estrutura

**Options considered:**
1. **Reaproveitar `createdBy` do board** — Simplifica, mas não permite múltiplos membros. Board creator pode sair da organização.
2. **Nova tabela `board_members`** — Overhead mínimo, permite roles futuros por board, tracking de quando o membro foi adicionado.

**Decision:** Nova tabela `board_members`.

**Rationale:** A tabela tem 3 colunas (boardId, userId, addedAt) — overhead mínimo. Permite adicionar `role` por board no futuro (ex: "editor" vs "viewer"). O `createdBy` do board continua existindo para rastreabilidade de quem criou.

**Future path:** Adicionar coluna `role` à `board_members` para granularidade de permissão por board (editor/viewer/commenter).

### D2: Upload — S3/MinIO vs filesystem local

**Options considered:**
1. **Filesystem local** — Simples, não requer infra extra. Arquivos ficam dentro do container, não escalam, perdem-se em deploy.
2. **S3/MinIO** — Padrão de mercado, URLs assinadas, escalável.

**Decision:** S3/MinIO com fallback para filesystem local em desenvolvimento.

**Rationale:** O PRD original especifica S3-compatible storage. MinIO roda localmente via Docker (já temos `docker-compose.yml`). Em produção, configura-se bucket S3 real. Fallback para local simplifica o setup inicial para novos devs.

### D3: Edit card — inline no panel vs modal separado

**Options considered:**
1. **Modal separado para edição** — Mais espaço, menos conflito com visualização.
2. **Inline no CardDetailPanel** — Menor context switch, mais rápido, padrão Trello/Linear.

**Decision:** Inline no CardDetailPanel com toggle de modo.

**Rationale:** Menor complexidade de navegação. O painel já tem espaço suficiente. Padrão do mercado (Trello, GitHub Projects, Linear).

---

## 9. File Breakdown

| File | Change type | FR | Description |
|------|-------------|-----|-------------|
| `apps/api/src/database/schema/board-members.ts` | New | FR-6 | Tabela `board_members` com PK composta (boardId, userId) |
| `apps/api/src/database/schema/index.ts` | Modify | FR-6 | Exportar `boardMembers` e `boardMembersRelations` |
| `apps/api/src/database/schema/boards.ts` | Modify | FR-6 | Adicionar relação `members` ao `boardsRelations` |
| `apps/api/drizzle/000X_board_members.sql` | New | FR-6 | Migration para criar tabela `board_members` |
| `apps/api/src/modules/boards/board-members.service.ts` | New | FR-6 | CRUD de membros do board |
| `apps/api/src/modules/boards/boards.controller.ts` | Modify | FR-1, FR-4, FR-5, FR-6 | Novos endpoints para assignees, board members, ajuste no delete para soft delete |
| `apps/api/src/modules/boards/boards.service.ts` | Modify | FR-5 | Change `remove` to soft delete (deletedAt, deletedBy) |
| `apps/api/src/modules/boards/boards.module.ts` | Modify | FR-6 | Registrar BoardMembersService |
| `apps/api/src/common/guards/board-member.guard.ts` | Modify | FR-6 | Verificar tabela `board_members` além de `createdBy` e admin |
| `apps/api/src/modules/cards/cards.controller.ts` | Modify | FR-1 | Endpoints `POST /cards/:id/assignees` e `DELETE /cards/:id/assignees/:userId` |
| `apps/api/src/modules/cards/cards.service.ts` | Modify | FR-1 | Métodos `addAssignee()` e `removeAssignee()` |
| `apps/api/src/modules/labels/labels.controller.ts` | Modify | FR-2 | Adicionar `@UseGuards(BoardMemberGuard)` nos endpoints |
| `apps/api/src/modules/attachments/attachments.controller.ts` | Modify | FR-9 | Endpoint multipart para upload com S3 integration |
| `apps/api/src/modules/attachments/attachments.service.ts` | Modify | FR-9 | Método `uploadToS3()` com presigned URLs |
| `apps/api/src/config/s3.config.ts` | New | FR-9 | Configuração do cliente S3/MinIO |
| `apps/api/package.json` | Modify | FR-9 | Adicionar `@aws-sdk/client-s3` |
| `apps/web/src/components/board/card-detail-panel.tsx` | Modify | FR-1, FR-2, FR-3, FR-7 | Adicionar seções de assignees, labels, modo de edição, comment actions |
| `apps/web/src/components/board/comment-list.tsx` | Modify | FR-7 | Adicionar edit/delete buttons com permissões |
| `apps/web/src/components/board/comment-item.tsx` | New | FR-7 | Componente individual de comentário com modo de edição inline |
| `apps/web/src/components/board/labels-manager.tsx` | New | FR-2 | Modal para CRUD de labels do board |
| `apps/web/src/components/board/card-labels.tsx` | New | FR-2 | Seção de labels dentro do CardDetailPanel |
| `apps/web/src/components/board/attachment-upload.tsx` | New | FR-9 | Componente de upload de arquivo com input, progress e visibility toggle |
| `apps/web/src/components/board/attachment-list.tsx` | Modify | FR-9 | Integrar AttachmentUpload component |
| `apps/web/src/components/boards/edit-board-modal.tsx` | New | FR-4 | Modal para editar detalhes do board |
| `apps/web/src/components/boards/board-actions-menu.tsx` | New | FR-5 | Dropdown com Archive/Delete no header do board |
| `apps/web/src/components/boards/board-members-modal.tsx` | New | FR-6 | UI para adicionar/remover membros do board |
| `apps/web/src/hooks/use-board-mutations.ts` | Modify | FR-1, FR-2, FR-4, FR-5, FR-7, FR-8, FR-9 | Adicionar mutations: addAssignee, removeAssignee, createLabel, updateLabel, deleteLabel, addCardLabel, removeCardLabel, updateBoard, archiveBoard, deleteBoard, updateComment, deleteComment, deleteAttachment, uploadAttachment |
| `apps/web/src/app/(dashboard)/boards/[id]/page.tsx` | Modify | FR-2, FR-4, FR-5, FR-8 | Integrar LabelsManager, EditBoardModal, BoardActionsMenu, conectar onDeleteAttachment |
| `apps/web/src/app/(dashboard)/boards/page.tsx` | Modify | FR-5 | Adicionar tabs de filtro por status (All, Active, Archived) |
| `apps/web/src/components/boards/board-list.tsx` | Modify | FR-5 | Filtrar boards com deletedAt; adicionar tabs de filtro |

---

## 10. Dependencies & Constraints

- **@aws-sdk/client-s3** (^3.x) — Upload para S3/MinIO
- **MinIO** — S3-compatible para desenvolvimento local (já disponível via docker-compose ou instalar separadamente)
- **multer** ou **busboy** — Parser multipart para NestJS (o NestJS tem Multer built-in via `@nestjs/platform-express`)
- **Drizzle ORM** — Migrations já configuradas
- **PostgreSQL** — Tabela `board_members` requer migration

---

## 11. Rollout Plan

1. **Phase 1a: Board Members & Guard** — Schema, migration, service, guard refactor, endpoints. Base para todas as outras funcionalidades.
2. **Phase 1b: Card Assignees** — Endpoints backend + UI no CardDetailPanel. Sem board members, assignees não fazem sentido.
3. **Phase 1c: Labels** — UI de gerenciamento + associação em cards. Independentes de assignees.
4. **Phase 1d: Edit Card & Edit Board** — Inline edit no panel + modal de board. Pure frontend em cima de APIs existentes.
5. **Phase 1e: Archive/Delete Board** — Soft delete no backend + actions menu no frontend.
6. **Phase 1f: Comment Edit/Delete** — UI actions + mutations.
7. **Phase 1g: Attachment Delete Conectado** — Uma linha de conexão no BoardDetailPage.
8. **Phase 1h: Upload Real** — S3 config, multipart endpoint, componente de upload.
9. **Phase 1i: Integration & E2E Tests** — Atualizar full-flow e2e para cobrir assignees, labels, board members.

---

## 12. Open Questions

| # | Question | Owner | Due | Status |
|---|----------|-------|-----|--------|
| Q1 | Qual é a estratégia de storage para dev? MinIO local ou filesystem fallback? | Dev | Phase 1h | Open |
| Q2 | Devemos implementar optimistic update para mutations de assignees/labels? | Dev | Phase 1a | Open |
| Q3 | O `BoardMemberGuard` deve cachear resultados em memória para evitar N+1? | Dev | Phase 1a | Open |
| Q4 | O upload deve limitar tipos de arquivo além de mime type? | Dev | Phase 1h | Open |

---

## 13. Related

| Issue / PRD | Relationship |
|-------|-------------|
| PRD-001-onboarding-tracker.md | **Depends-on / extends** — Este PRD implementa funcionalidades descritas no PRD-001 que estavam incompletas |
| ADR-0003-completion-detection.md | **Completed** — Detecção de completion já implementada; não é afetada por este PRD |
| ADR-0002-dual-mode-auth.md | **Completed** — Autenticação dual (JWT + public token) já implementada |

---

## 14. Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-05-06 | Initial draft | Claude + User |

---

## 15. Verification (Appendix)

Post-implementation checklist:

1. **Board members flow**: Criar board como admin, adicionar member Bob via API, fazer login como Bob, verificar que Bob vê o board no dashboard e consegue criar card.
2. **Assignees flow**: Abrir card, adicionar assignee Alice, verificar notificação in-app para Alice, remover assignee, verificar que desaparece.
3. **Labels flow**: Criar label "Urgente" no board, associar a um card, verificar badge no kanban, remover do card, deletar label do board.
4. **Edit card**: Abrir card, clicar edit, alterar título/desc/due date, salvar, recarregar página, verificar persistência.
5. **Edit board**: Abrir board, clicar edit no header, alterar título e clientEmail, salvar, verificar no dashboard e public view.
6. **Archive board**: Clicar archive no menu do board, verificar que some do All/Active tabs, aparece no Archived tab, public link ainda funciona.
7. **Comment CRUD**: Adicionar comment, editar, deletar. Verificar que admin pode deletar comment de outro autor.
8. **Attachment upload**: Upload arquivo 5MB PDF, verificar presença na lista, abrir public view e verificar que aparece (se visibility=client).
9. **Board member guard**: Tentar acessar board como member sem estar no board_members → 403. Tentar como admin → 200.
