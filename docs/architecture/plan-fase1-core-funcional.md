```yaml
---
title: "Fase 1 — Core Funcional: Implementação de Assignees, Labels, Board Members e CRUD Essenciais"
prd: PRD-002
status: Draft
author: "Claude Code"
date: 2026-05-06
---

# Plan: Fase 1 — Core Funcional

## Source

- **PRD**: [docs/prd/PRD-002-fase1-core-funcional.md](../prd/PRD-002-fase1-core-funcional.md)
- **Context**: PRD-001 (especificação original) com funcionalidades core já implementadas em partes; PRD-002 identifica os 9 gaps críticos que bloqueiam uso real.
- **Date**: 2026-05-06
- **Author**: Claude Code

## Architecture Overview

Esta fase expande o modelo de permissões do Tasks Tracker de **"criador individual + admin"** para **"time colaborativo por board"**. A alteração central é a introdução da tabela `board_members`, que habilita 80% das funcionalidades desta fase: sem ela, assignees não sabem quem está disponível, labels precisam de contexto de board, e edit/delete só fazem sentido se múltiplas pessoas colaboram.

A arquitetura mantém o padrão existente: NestJS modulares, Drizzle ORM, EventEmitter2 para notificações, e React Query + Zustand no frontend. O event bus (ADR-0005) continua sendo o principal mecanismo de desacoplamento entre operação CRUD e side effects, e será usado para emitir eventos de card assign/unassign que alimentam o painel de notificações já existente.

O upload de arquivos (FR-9) introduz a única dependência infraestrutural nova: um bucket S3/MinIO. Localmente, isso significa adicionar um serviço MinIO ao `docker-compose.yml` (ou usar filesystem como fallback para dev rápido). Em produção, configura-se credenciais AWS. O pipeline é: frontend `FormData` → NestJS Multer → upload S3 → armazenamento de metadados (URL, key, visibility) no PostgreSQL. URLs são presigned para segurança.

Os polimentos de UI (edit inline, comment CRUD, archive/delete confirmation) são majoritariamente frontend, utilizando o padrão já estabelecido de componentes shadcn/ui (`Sheet`, `Dialog`, `DropdownMenu`, `Popover`).

## Components

### C1: Board Members (Permission Model)

**Purpose**: Introduzir tabela `board_members` e refatorar o `BoardMemberGuard` para suportar times colaborativos por board, não apenas criador/admin.

**Key Details**:
- Tabela `board_members` com PK composta `(boardId, userId)` + `addedAt`. Sem coluna de role por enquanto (extensão futura).
- `BoardMemberGuard` atual verifica `userId === createdBy || role === admin`. Nova lógica: `role === admin` OU `EXISTS board_members WHERE boardId = ? AND userId = ?`.
- Endpoint `GET /boards/:id/members` retorna membros com dados de perfil (join com `users`).
- Endpoint `POST /boards/:id/members` (admin ou criador) adiciona membro.
- Endpoint `DELETE /boards/:id/members/:userId` (admin ou criador) remove membro.
- O `createdBy` do board não é removido da tabela — é mantido como referência de proveniência.

**ADR Reference**: -> **ADR-0002** já define dual-mode auth; este componente extende o modelo de autorização interno. Ver ADR candidato na seção ADR Index.

### C2: Card Assignees

**Purpose**: Permitir atribuição de membros do board a cards, com notificação automática via EventEmitter2.

**Key Details**:
- Endpoints `POST /cards/:id/assignees` e `DELETE /cards/:id/assignees/:userId` no `CardsController`.
- O `CardsService` emite `CARD_ASSIGNED` via `EventEmitter2` apenas na _primeira_ atribuição (idempotente via `onConflictDoNothing` no Drizzle).
- A UI no `CardDetailPanel` mostra seção "Assignees" com badge por avatar + dropdown de membros do board (dados de `/boards/:id/members`).
- Remoção de assignee não emite evento (não há evento de "unassign" no sistema).

**Dependencies**: C1 (board_members para saber quem pode ser atribuído)

**ADR Reference**: -> ADR-0005 (event bus) já documenta o padrão. Nenhum ADR novo necessário.

### C3: Labels (CRUD + Card Association)

**Purpose**: Labels por board com associação a cards. Backend já tem endpoints/CRUD completo; frontend precisa de UI para gerenciar e associar.

**Key Details**:
- O backend (`LabelsController`) já tem `POST/GET/DELETE` para labels e `POST/DELETE` para `cardLabels` junction table, mas **não tem guardas** (`@UseGuards(BoardMemberGuard)`).
- **Ação obrigatória**: adicionar `@UseGuards(BoardMemberGuard)` e `@UseGuards(JwtAuthGuard)` nos endpoints do labels controller. Hoje os endpoints estão desprotegidos.
- Frontend: `LabelsManager` modal (no header do board) para CRUD de labels (nome + color picker). `CardLabels` seção no `CardDetailPanel` para adicionar/remover labels do card.
- Labels são por board-scoped (boardId FK). Remover label do board cascateia `DELETE` de `card_labels` junction table (já configurado no schema com `onDelete: "cascade"`).

**Dependencies**: C1 (board members para saber quem pode gerenciar labels)

### C4: Edit Card (Inline)

**Purpose**: Permitir edição de título, descrição e due date de um card diretamente no `CardDetailPanel`.

**Key Details**:
- O backend `PATCH /cards/:id` já existe e aceita `title, description, dueDate`. Nenhuma mudança de API necessária para título e dueDate.
- **Ação obrigatória**: Verificar se `UpdateCardDto` aceita `description`. Se não, expandir o DTO.
- O frontend adiciona modo de edição ao `CardDetailPanel`: toggle "Edit/Save/Cancel". Campos editáveis: título (Input), descrição (Textarea com markdown preview), dueDate (Date picker).
- A mutation `updateCard` no `useBoardMutations` já existe. Precisa apenas ser conectada ao formulário de edição.

**Dependencies**: None (uses existing API and mutation)

### C5: Edit Board (Modal)

**Purpose**: Permitir edição de título, descrição, clientName, clientEmail do board.

**Key Details**:
- Backend `PATCH /boards/:id` já existe e aceita `title, description, status`. Não aceita `clientName` ou `clientEmail` (verificar e expandir `UpdateBoardDto`).
- Frontend: Modal/drawer "Edit Board" no header do board, com campos para os 4 atributos editáveis.
- O `BoardDetailPage` deve invalidar query do board após salvar para refletir mudanças.

**Dependencies**: C1 (board members para autorização — quem pode editar)

### C6: Archive / Soft Delete Board

**Purpose**: Arquivar board (status = archived) ou deletar (soft delete). Admin pode ambos; criador pode arquivar.

**Key Details**:
- Backend: `PATCH /boards/:id` já aceita `status`. Para deletar, mudar `BoardsService.remove()` de `.delete()` do Drizzle para `UPDATE` setting `deletedAt` e `deletedBy`.
- **Ação obrigatória**: O `BoardsService.findAll()` e `findOne()` devem filtrar `WHERE deletedAt IS NULL` por padrão. Adicionar método admin-only para listar deletados se necessário.
- Frontend: `BoardActionsMenu` dropdown no header com "Archive" e "Delete". "Delete" requer confirmação modal (digitar título do board para confirmar).
- Dashboard `BoardList`: Adicionar tabs de filtro (All / Active / Completed / Archived). Filtrar `deletedAt` em todos os tabs.

**Dependencies**: C1 (para saber se o membro é criador — arquivar vs deletar permissão)

### C7: Comment Edit/Delete

**Purpose**: Edit inline e deletar com permissões no frontend.

**Key Details**:
- Backend: `CommentsService.update(id, authorId, content)` já verifica `authorId`. `DELETE /comments/:id` já existe.
- Frontend: `CommentList` recebe novas props: `onUpdateComment(id, content)`, `onDeleteComment(id)`.
- Extração do componente `CommentItem` (individual) com modo de edição inline (textarea + Save/Cancel).
- Condições de renderização dos botões: mostrar "Edit" só para autor; "Delete" para autor + admin.
- **Ação obrigatória**: `CommentsService.remove()` deve receber `userId` e verificar `authorId === userId || role === admin`. Rejeitar se não for autor nem admin.

**Dependencies**: None (uses existing API)

### C8: Attachment Delete Conectado

**Purpose**: Conectar o botão de delete do AttachmentList à mutation real.

**Key Details**:
- Backend `DELETE /attachments/:id` já existe.
- Frontend: Adicionar `deleteAttachment` mutation no `useBoardMutations.ts` usando `apiClient`.
- Passar `onDeleteAttachment` do `BoardDetailPage` → `CardDetailPanel` → `AttachmentList`.
- Invalidar query do board após delete.

**Dependencies**: None

### C9: Upload Real de Arquivos

**Purpose**: Upload multipart de arquivos para S3/MinIO com metadados no PostgreSQL.

**Key Details**:
- Backend: Novo endpoint `POST /cards/:cardId/attachments/upload` usando `@UseInterceptors(FileInterceptor)` do NestJS.
- Middleware `Multer` recebe arquivo, valida tamanho (<= 10MB) e mimetype (bloquear executáveis).
- Upload para S3/MinIO: criar bucket `attachments` no MinIO. Armazenar key `attachments/:cardId/:uuid/:filename`.
- Retornar presigned URL (GET) para download e armazenar metadados no `cardAttachments` (com visibility).
- Configuração S3 (`apps/api/src/config/s3.config.ts`) usando `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner`.
- Fallback dev: Se `S3_ENDPOINT` não configurado, salvar em filesystem local (`uploads/`). Presigned URL local = rota pública `/uploads/:path`.
- Frontend: `AttachmentUpload` component com `<input type="file">`, progress bar (usando `XMLHttpRequest` ou `fetch` com `onUploadProgress`), e toggle de visibility (internal/client).

**Dependencies**: C1 (board members para saber se pode fazer upload no card)

**ADR Reference**: -> ADR candidato na seção ADR Index (upload storage strategy)

## Implementation Order

| Phase | Component | Frs | Dependencies | Estimated Scope | Milestone |
|-------|-----------|-----|-------------|-----------------|-----------|
| 1 | **C6: Board Members** (schema + migration + guard refactor) | FR-6 | None — base para tudo | Medium | Queries de board retornam 403 para não-membros; admin sempre acessa |
| 2 | **C2: Card Assignees** (backend + UI) | FR-1 | Phase 1 (board members popula dropdown) | Medium | Member pode ser atribuído a card; notificação in-app chega |
| 3 | **C3: Labels** (guards no backend + UI frontend) | FR-2 | Phase 1 (board access) | Medium | CRUD de labels funcional; labels associados a cards visíveis no kanban |
| 4 | **C4: Edit Card** (frontend) + **C5: Edit Board** (frontend + DTO fix) | FR-3, FR-4 | Phase 1 (board access); existing APIs | Small + Small | Card e board editáveis inline/modal |
| 5 | **C6: Archive/Delete Board** (soft delete no backend + actions frontend) | FR-5 | Phase 1 (board access); Phase 4 (edit board para saber quem é criador) | Medium | Board pode ser arquivado e deletado com soft delete |
| 6 | **C7: Comment Edit/Delete** (frontend + backend permission fix) | FR-7 | None | Small | Author pode editar; author/admin pode deletar |
| 7 | **C8: Attachment Delete Conectado** | FR-8 | None | Extra small | Botão de delete funcional |
| 8 | **C9: Upload Real** (multipart + S3 + componente) | FR-9 | Phase 1 (board access) | Large | Upload multipart funcional em dev e produção |
| 9 | **Integration & E2E Tests** | All | All phases | Medium | E2E full-flow passa com assignees, labels, members |

**Dependency Rationale:**
- **Phase 1 (Board Members)** é a base. Sem ela, os dropdowns de assignees (Phase 2) e labels (Phase 3) não sabem quem está no board. O guard também bloqueia acesso ao board para não-membros.
- **Phases 4–7** são independentes entre si (edit card, edit board, archive/delete, comment CRUD, attachment delete). Podem ser implementadas em paralelo por devs diferentes, assumindo que Phase 1 está estável.
- **Phase 8 (Upload)** é a mais complexa (infra S3, multipart, presigned URLs). Isolada no final para não bloquear funcionalidades de UI.
- **Phase 9 (Tests)** valida tudo.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **BoardMemberGuard refactor quebra acesso de admin** | Low | High | Tests E2E existentes validam admin access. Adicionar testes para board member scenarios (acesso permitido, acesso negado) antes de merge. |
| **Soft delete cascade inconsistente** (ex: board deletado soft, mas lists/cards permanecem visíveis ao buscar por listId) | Medium | Medium | Usar `db.transaction()` para soft delete em cascata. Adicionar `WHERE deletedAt IS NULL` em TODAS as queries de `ListsService` e `CardsService` (auditar cada query). |
| **Upload de arquivo grande (> 10MB) causa timeout do NestJS** | Medium | Medium | Configurar `limits: { fileSize: 10 * 1024 * 1024 }` no Multer. Retornar erro 413 antes de iniciar upload. Streaming multipart no frontend. |
| **S3/MinIO indisponível em dev** (bloqueia desenvolvimento se hard-dep) | High | Medium | Implementar fallback filesystem em dev (`if (!S3_ENDPOINT) return localStorage`). Flag `USE_LOCAL_UPLOAD=true` em `.env.example`. |
| **Labels endpoints desprotegidos** (expostos sem guard) | High | Medium | Phase 3 inclui adição explícita de `@UseGuards(BoardMemberGuard)` em TODOS os endpoints do LabelsController. Auditoria manual após implementação. |
| **Comment edit/delete permissões incorretas** (ex: member deleta comentário de outro) | Medium | High | Adicionar teste unitário para `CommentsService.remove()` com cenários: autor válido, admin válido, autor inválido rejeita. |
| **Optimistic update faltando causa flicker em mutations rápidas** | Medium | Low | Usar React Query `onMutate` + `onError` rollback pattern para assignees, labels, comments. Se complexo demais, aceitar re-fetch (flicker minor). |

## Open Questions

- **Q1: Soft delete de listas/cards deve ser cascade ou preservar filhos para audit?** Quando um board é soft-deleted, seus lists e cards devem ser soft-deletados também? Se deixarmos filhos com `deletedAt IS NULL`, boards deletados podem ser recuperados com estrutura intacta. Se cascateamos, requer transaction com múltiplos UPDATEs.
- **Q2: Upload presigned URL deve ser GET (download) ou também PUT (upload direto para S3)?** O padrão "backend upload" (NestJS recebe arquivo → envia para S3) é mais simples mas gasta banda do servidor. "Presigned PUT" (frontend envia direto para S3) é mais escalável mas requer CORS no bucket. Decidir antes da Phase 8.
- **Q3: Board members devem ser auto-adicionados quando um board é criado a partir de template?** Sim — o criador (criador do board) já é o `createdBy`. Mas quando um template é aplicado por um member (não admin), o member deve aparecer automaticamente em `board_members`? Ou criador é implícito e não precisa de linha `board_members`? Resposta impacta o tamanho da tabela.

## ADR Index

Decisions surfaced during this plan that may deserve standalone ADRs:

| ADR | Title | Status | Rationale |
|-----|-------|--------|-----------|
| ADR-0006 (proposed) | Board Members Table for Collaborative Board Access | Pending | Decision D1 from PRD-002. Extends ADR-0002's auth model with per-board membership. Rejected "reuse createdBy" in favor of dedicated junction table |
| ADR-0007 (proposed) | S3/MinIO with Filesystem Fallback for File Storage | Pending | Decision D2 from PRD-002. Rejected "filesystem-only" and "S3-only" in favor of hybrid: MinIO in dev (Docker), S3 in production, filesystem fallback for zero-config dev |
| Existing | ADR-0002: Dual-mode Auth | Completed | Authorization base for internal vs public access. Extended by board members decision. |
| Existing | ADR-0005: Event Bus for Notifications | Completed | Mechanism for assignee notifications. Used by C2. |

**Note:** ADR-0006 and ADR-0007 should be created if their decisions need formal persistence for future maintainers. ADR-0006 is the more consequential — it changes the system's authorization model from globally-scoped (admin/member) to resource-scoped (per-board membership).
