# 🔍 Extração de Padrões — Kan & Focalboard

> Análise de `kanbn/kan` (4.8k★, Drizzle + tRPC + Next.js) e `mattermost-community/focalboard` (26k★, Go + React) para incorporar lições no Onboarding Tracker.

---

## 1. PADRÕES DE SCHEMA (do Kan — Drizzle ORM)

### 1.1 Public ID vs Internal ID 🔴 CRÍTICO

O Kan **nunca** expõe o UUID interno (`id`) em URLs, respostas de API ou frontend. Usa `publicId` (varchar 12 chars) para comunicação externa.

```typescript
// Kan schema — cards.ts
export const cards = pgTable("card", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  // ...
});
```

**⚡ Incorporar no Onboarding Tracker:**

O projeto atual expõe UUIDs em rotas como `/boards/:id` e `/cards/:id`. Isso vaza estrutura interna e permite enumeration attacks.

| Tabela | Adicionar campo | Rota atual | Rota segura |
|--------|-----------------|-----------|-------------|
| boards | `publicId varchar(12) UNIQUE` | `/boards/:id` (UUID) | `/boards/:publicId` |
| cards | `publicId varchar(12) UNIQUE` | `/cards/:id` (UUID) | `/cards/:publicId` |

> ⚠️ O `public_token` do board já funciona como publicId implícito, mas é só para a view do cliente. O board interno ainda usa UUID na rota `/boards/:id`.

**Recomendação:** Manter UUID como PK interna, mas adicionar `publicId` (12 chars, alphanumeric) em boards e cards. Usar `publicId` em TODAS as rotas externas e na UI.

### 1.2 Soft Delete com `deletedAt` + `deletedBy` 🟡 IMPORTANTE

O Kan usa soft delete em TODAS as entidades deletáveis, com dois campos:

```typescript
deletedAt: timestamp("deletedAt"),          // WHEN
deletedBy: uuid("deletedBy").references(() => users.id, {  // WHO
  onDelete: "set null",  // se o user for deletado, não cascade
}),
```

**⚡ Incorporar:**

O Onboarding Tracker atualmente **deleta em cascade** (lists deletam cards, etc). Isso é irreversível. Para um sistema de onboarding, soft delete é essencial — o cliente pode querer recuperar dados.

| Tabela | Adicionar |
|--------|-----------|
| boards | `deletedAt`, `deletedBy` |
| lists | `deletedAt`, `deletedBy` |
| cards | `deletedAt`, `deletedBy` |
| comments | `deletedAt`, `deletedBy` |

**Regra de query:** TODA query deve incluir `.where(isNull(table.deletedAt))`.

### 1.3 Activity/Action Log 🔴 CRÍTICO

O Kan tem uma tabela `card_activity` que rastreia **cada mudança** em cada card:

```typescript
export const cardActivities = pgTable("card_activity", {
  id: bigserial("id").primaryKey(),
  publicId: varchar("publicId", { length: 12 }).notNull().unique(),
  type: activityTypeEnum("type").notNull(),  // "card.updated.title", "card.moved", etc.
  cardId: bigint("cardId").notNull().references(() => cards.id, { onDelete: "cascade" }),
  fromIndex: integer("fromIndex"),      // estado anterior
  toIndex: integer("toIndex"),          // estado novo
  fromListId: bigint("fromListId"),    // lista origem
  toListId: bigint("toListId"),        // lista destino
  fromTitle: text("fromTitle"),
  toTitle: text("toTitle"),
  createdBy: uuid("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

Tipos de atividade (enum explícito):

```typescript
export const activityTypes = [
  "card.created",
  "card.updated.title",
  "card.updated.description",
  "card.updated.index",
  "card.updated.list",         // ← quando card muda de lista
  "card.updated.label.added",
  "card.updated.label.removed",
  "card.updated.member.added",
  "card.updated.member.removed",
  "card.updated.comment.added",
  "card.updated.dueDate.added",
  "card.updated.dueDate.updated",
  "card.archived",
] as const;
```

**⚡ Incorporar:**

O Onboarding Tracker tem notificações mas **não tem action log**. O PRD menciona "recent activity feed" (US-123) mas não modelou a tabela. Sem activity log, é impossível rastrear quem fez o quê, e o "recent activity" do dashboard fica prejudicado.

**Schema sugerido:**

```typescript
export const boardActivities = pgTable("board_activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  boardId: uuid("boardId").notNull().references(() => boards.id, { onDelete: "cascade" }),
  cardId: uuid("cardId").references(() => cards.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(), // "card.moved", "card.completed", etc.
  userId: uuid("userId").references(() => users.id, { onDelete: "set null" }),
  fromListId: uuid("fromListId").references(() => lists.id, { onDelete: "set null" }),
  toListId: uuid("toListId").references(() => lists.id, { onDelete: "set null" }),
  metadata: jsonb("metadata"), // dados extras (título antes/depois, etc.)
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});
```

### 1.4 Composite PK com `primaryKey()` aux function 🟡

O Kan define junction tables com PK composta usando a função auxiliar:

```typescript
export const cardsToLabels = pgTable("_card_labels", {
  cardId: bigint("cardId").notNull().references(() => cards.id, { onDelete: "cascade" }),
  labelId: bigint("labelId").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.cardId, t.labelId] })]);
```

**⚡ Incorporar:**

O REVIEW já flagrou que `cardAssignees` e `cardLabels` no Onboarding Tracker faltam PK composta. Usar o mesmo padrão do Kan:

```typescript
// apps/api/src/database/schema/card-assignees.ts
export const cardAssignees = pgTable("card_assignees", {
  cardId: uuid("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
}, (table) => ({
  pk: primaryKey(table.cardId, table.userId),
}));
```

### 1.5 Índices em colunas de busca 🟡

O Kan cria índices compostos explicitamente:

```typescript
(table) => [
  index("card_list_number_idx").on(table.listId, table.cardNumber),
],
```

**⚡ Incorporar:**

O Onboarding Tracker precisa de índices em:
- `boards(public_token)` — já tem UNIQUE, que cria índice implícito
- `cards(list_id)` — FK sem índice = full table scan ao carregar um board
- `notifications(user_id, is_read)` — busca de notificações não lidas
- `boards(status)` — filtro de dashboard

---

## 2. PADRÕES DE ARQUITETURA (do Kan)

### 2.1 Repository Pattern separado do Router 🟡

O Kan separa **schema** (definição de tabelas) de **repository** (queries) de **router** (API endpoints):

```
packages/db/src/schema/cards.ts       → Schema (drizzle pgTable)
packages/db/src/repository/card.repo.ts → Queries (drizzle queries)
packages/api/src/routers/card.ts       → tRPC router (validação + auth)
```

**⚡ Incorporar:**

O Onboarding Tracker atual já usa o pattern `Service → Controller` do NestJS, que é o equivalente. Mas o **schema** e o **repository** estão no mesmo diretório (`database/schema/` e `database/connection.ts`). Separar schema de queries melhora a manutenibilidade.

### 2.2 Workspace-scoped Authorization 🟡

O Kan usa `assertUserInWorkspace` antes de CADA operação de board/card:

```typescript
// Sempre verifica:
// 1. User is authenticated
// 2. User has access to workspace
// 3. User has permission for the operation
```

**⚡ Incorporar:**

O Onboarding Tracker é single-org, mas o padrão se traduz em:
1. User is authenticated (JwtAuthGuard)
2. User has access (board belongs to the same org — por enquanto, sempre true)
3. User has permission (role check: admin vs member)

A checagem atual na Phase 2 usa `@Roles('admin')` decorator, que é o equivalente NestJS.

### 2.3 Rate Limiting via Redis 🟢 (V2)

O Kan tem rate limiting via Redis:

```typescript
// packages/api/src/utils/rateLimit.ts
```

**⚡ Incorporar quando escalar.** O Onboarding Tracker tem NFR-010 (100 req/min em endpoints públicos). Para V1, usar `@nestjs/throttler` in-memory. Para V2 com múltiplas instâncias, migrar para Redis.

### 2.4 Webhook Delivery com idempotency_key 🟡

O Kan envia webhooks com `idempotency_key` no payload para deduplicação no receptor:

**⚡ Incorporar:**

O design atual do Onboarding Tracker (no PRD BR-008) não inclui idempotency_key. Adicionar:

```json
{
  "event": "card.completed",
  "timestamp": "2026-04-28T10:00:00Z",
  "idempotency_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "data": { ... }
}
```

---

## 3. PADRÕES DO FOCALBOARD (Go + React)

### 3.1 Board Type: Open vs Private 🔴 CRÍTICO

O Focalboard tem um campo `Type` no Board que controla visibilidade:

```go
BoardTypeOpen    BoardType = "O"  // público
BoardTypePrivate  BoardType = "P"  // privado
```

Com `MinimumRole` que define o role mínimo para interagir:

```go
BoardRoleViewer    BoardRole = "viewer"
BoardRoleCommenter BoardRole = "commenter"
BoardRoleEditor    BoardRole = "editor"
BoardRoleAdmin     BoardRole = "admin"
```

**⚡ Incorporar:**

O Onboarding Tracker tem `public_token` para acesso externo, mas **não tem controle de visibilidade do board**. Na lógica atual, qualquer usuário autenticado vê todos os boards. Isso é ok pra single-org, mas:

- O `public_token` atua como "BoardTypeOpen" para clientes externos
- O board interno precisa de "BoardTypePrivate" — só membros do time veem

**Recomendação para V1:** Manter como está (single-org, todos veem tudo). Marcar como V2: adicionar `boardType` e `minimumRole`.

### 3.2 Board como Template 🟡

O Focalboard marca boards como template com flag:

```go
IsTemplate      bool `json:"isTemplate"`
TemplateVersion int  `json:"templateVersion"`
```

**⚡ Incorporar:**

O Onboarding Tracker já tem template como entidade separada (`templates` table). Não precisa mudar. Mas a ideia de `templateVersion` é interessante para rastrear versões de template.

### 3.3 Properties como JSONB 🟡

O Focalboard usa `properties` e `cardProperties` como `map[string]interface{}` (JSONB):

```go
Properties      map[string]interface{}   `json:"properties"`
CardProperties  []map[string]interface{} `json:"cardProperties"`
```

**⚡ Incorporar:**

Isso permite extender boards/cards com campos customizados sem alterar schema. Para V1, não precisamos. Para V2, se quiserem campos customizados nos cards (custom fields), usar `jsonb` no PostgreSQL.

### 3.4 Descendant Metadata (last update tracking) 🟢

O Focalboard rastreia quando último descendente foi modificado:

```go
DescendantLastUpdateAt  int64 `json:"descendantLastUpdateAt"`
DescendantFirstUpdateAt int64 `json:"descendantFirstUpdateAt"`
```

**⚡ Incorporar:**

O Onboarding Tracker já tem `updated_at` em boards e cards. Não precisa de `descendantLastUpdateAt` — o `updated_at` do board já é atualizado quando qualquer card muda (via service).

---

## 4. PADRÕES DE FRONTEND (do Kan)

### 4.1 Pages vs Views 🟡 BOA PRÁTICA

O Kan separa **Pages** (Next.js routing) de **Views** (componentes compostos):

```
pages/
  boards/[...boardId]/index.tsx     → 5 linhas, só importa View
views/
  board/index.tsx                   → 29KB, lógica completa
  board/components/Card.tsx         → componentes filhos
```

**⚡ Incorporar:**

O design atual do Onboarding Tracker mistura tudo nos pages. Separar:

```
apps/web/src/app/(dashboard)/boards/[id]/page.tsx  → import view
apps/web/src/views/board/index.tsx                 → componente completo
apps/web/src/views/board/components/KanbanBoard.tsx
apps/web/src/views/board/components/Card.tsx
```

### 4.2 useDragToScroll hook 🟢

O Kan tem hook customizado para scroll horizontal no kanban arrastando:

```
apps/web/src/hooks/useDragToScroll.ts
```

**⚡ Incorporar na Phase 6** (Frontend Kanban Board). Quando o board tem muitas listas, scroll horizontal é essencial.

### 4.3 StrictModeDroppable wrapper 🟡

O Kan encapsula o `Droppable` do `@hello-pangea/dnd` num wrapper `StrictModeDroppable` para contornar problema do React 18 Strict Mode:

```
apps/web/src/components/StrictModeDroppable.tsx
```

**⚡ Incorporar:** Este é um bug conhecido. Sem o wrapper, drag-and-drop quebra em dev mode com React.StrictMode.

### 4.4 usePermissions hook 🟡

O Kan centraliza permissões num hook:

```typescript
// apps/web/src/hooks/usePermissions.ts
export function usePermissions() {
  const { session } = useSession();
  return {
    canCreateBoard: session?.role === "admin" || session?.role === "editor",
    canDeleteBoard: session?.role === "admin",
    // ...
  };
}
```

**⚡ Incorporar:** Em vez de checar `user.role === 'admin'` espalhado pelos componentes, usar hook centralizado.

---

## 5. RESUMO: O QUE INCORPORAR AOS PHASES

### 🔴 Crítico (incorporar ANTES de executar)

| # | O quê | De onde | Impacto se ignorar | Phase |
|---|-------|---------|-------------------|-------|
| 1 | **Activity Log table** (`board_activity`) | Kan | Dashboard "recent activity" impossível; webhook events sem histórico auditável | 1 (schema) |
| 2 | **`deletedAt` + `deletedBy` em boards/lists/cards/comments** | Kan | Dados apagados são irrecuperáveis; cliente perde histórico | 1 (schema) |
| 3 | **Composite PK com `primaryKey()` aux** | Kan | `cardAssignees`/`cardLabels` sem PK → `onConflictDoNothing` falha silenciosamente | 1 (schema) |

### 🟡 Importante (incorporar durante execução)

| # | O quê | De onde | Impacto se ignorar | Phase |
|---|-------|---------|-------------------|-------|
| 4 | **`publicId` em boards e cards** (12 chars) | Kan | UUIDs internos expostos em URLs → enumeration attacks | 1-2 |
| 5 | **Índices compostos** (`list_id`, `user_id + is_read`) | Kan | Queries lentas em boards com muitos cards | 1 |
| 6 | **`idempotency_key` em webhooks** | Kan | Receptor não pode deduplicar | 4 |
| 7 | **StrictModeDroppable wrapper** | Kan | Drag-and-drop quebra em React.StrictMode | 6 |
| 8 | **usePermissions hook** | Kan | Checagem de role espalhada por componentes | 5 |
| 9 | **Pages vs Views separação** | Kan | Refactor doloroso depois | 5-6 |

### 🟢 Recomendado (backlog / V2)

| # | O quê | De onde | Notas |
|---|-------|---------|-------|
| 10 | Board type Open/Private | Focalboard | V2: multi-board visibility |
| 11 | `templateVersion` | Focalboard | V2: versioning de templates |
| 12 | JSONB `properties` em cards | Focalboard | V2: custom fields |
| 13 | Rate limiting via Redis | Kan | V2: multi-instância |
| 14 | `useDragToScroll` hook | Kan | V1: nice-to-have, melhora UX |

---

## 6. CORREÇÕES A APLICAR NOS PHASES EXISTENTES

### Phase 1 — Schema

**Adicionar ao Task 3 (Database Schema):**

1. Criar tabela `board_activities`:
```sql
CREATE TABLE board_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  card_id UUID REFERENCES card(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_list_id UUID REFERENCES list(id) ON DELETE SET NULL,
  to_list_id UUID REFERENCES list(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_board_activity_board ON board_activity(board_id);
CREATE INDEX idx_board_activity_card ON board_activity(card_id);
```

2. Adicionar `deleted_at` e `deleted_by` em boards, lists, cards, comments:
```sql
ALTER TABLE board ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE board ADD COLUMN deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
-- Repetir para list, card, card_comment
```

3. Corrigir PKs compostas em `card_assignees` e `card_labels` (já flagrado no REVIEW).

4. Adicionar índices:
```sql
CREATE INDEX idx_card_list_id ON card(list_id);
CREATE INDEX idx_notification_user_unread ON notification(user_id, is_read);
CREATE INDEX idx_board_status ON board(status);
```

### Phase 2 — Cards Module

**Ao mover card, criar activity:**
```typescript
// Em CardsService.moveCard():
await db.insert(boardActivities).values({
  boardId: card.boardId,
  cardId: card.id,
  type: 'card.moved',
  userId,
  fromListId: oldListId,
  toListId: listId,
});
```

### Phase 4 — Notifications

**Adicionar `idempotency_key` no webhook payload:**
```typescript
const idempotencyKey = crypto.randomUUID();
const payload = { event, timestamp: new Date().toISOString(), idempotency_key: idempotencyKey, data: eventData };
```

### Phase 5-6 — Frontend

**StrictModeDroppable:**
```tsx
// apps/web/src/components/StrictModeDroppable.tsx
import { Droppable } from '@hello-pangea/dnd';
import React from 'react';

export const StrictModeDroppable = ({ children, ...props }: any) => {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => { setEnabled(true); }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};
```

**usePermissions hook:**
```tsx
// apps/web/src/hooks/usePermissions.ts
export function usePermissions(role: 'admin' | 'member') {
  return {
    canCreateTemplate: role === 'admin',
    canManageMembers: role === 'admin',
    canManageWebhooks: role === 'admin',
    canManageSettings: role === 'admin',
    canArchiveBoard: role === 'admin',
    canDeleteBoard: role === 'admin',
    canChangeRoles: role === 'admin',
    canCreateBoard: true,
    canManageCards: true,
    canViewDashboard: true,
  };
}
```