# 🎨 Extração de UI/UX — Kan & Focalboard

> Padrões de interface e experiência extraídos de `kanbn/kan` (Drizzle + tRPC + Next.js) e `mattermost-community/focalboard` (Go + React) aplicáveis ao Onboarding Tracker com a identidade Grovva.

---

## 1. LAYOUT & NAVEGAÇÃO

### 1.1 Dashboard com Sidebar Colapsível 🔴 CRÍTICO

O Kan usa um layout de 3 regiões mutáveis:

```
┌──────────┬────────────────────────────┬──────────┐
│ SideNav  │    Content Principal       │ Right    │
│ (collap) │    (board, boards list)    │ Panel    │
│          │                            │ (opt.)   │
│  boards  │                            │          │
│  templt  │                            │ card     │
│  members │                            │ detail   │
│  settings│                            │          │
│          │                            │          │
│ ──────── │                            │          │
│ [avatar] │                            │          │
└──────────┴────────────────────────────┴──────────┘
```

Características:
- **Sidebar colapsível** com estado salvo em `localStorage` (`kan_sidebar-collapsed`)
- **Right Panel** aparece ao abrir card detail (não redireciona pra outra página)
- **Mobile**: sidebar vira overlay, right panel vira bottom sheet
- Ícones Lottie (JSON animado) no sidebar — muda entre light/dark mode
- `useClickOutside` para fechar panels ao clicar fora

**⚡ Incorporar no Onboarding Tracker:**

O design atual tem layout fixo sem sidebar colapsível. Para o dashboard Grovva:

```tsx
// apps/web/src/components/Dashboard.tsx (inspirado no Kan)
// Sidebar: Boards, Templates, Membros, Config
// Content: Board view ou dashboard
// Right Panel: Card detail (abre ao clicar card, sem nova rota)
```

**Tradução para identidade Grovva:**
- Sidebar bg: `#151515` (dark) ou `white` (light)
- Sidebar ícones: usar `Fira Code` para labels, `Cornaltail Type` pra headings
- Sidebar width: 240px expandida, 64px colapsada (múltiplos de 8 ✓)
- Accent verde (#56C271) APENAS no botão "Novo Board" — nunca nos ícones de navegação

### 1.2 Board List com Grid e Tabs 🟡

O Kan lista boards como **grid de cards** com:
- Tab "Active" / "Archived" (toggle, não router)
- Favoritar board (★ icon, salvo no board.favorite)
- Import boards (Trello JSON import)
- Empty state com ilustração `PatternedBackground`

```
┌──────────────────────────────────────────────┐
│  Boards       [+ New] [↓ Import]             │
│  ───────────────────────────────────         │
│  [Active]  [Archived]                         │
│                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │ Board  │  │ Board  │  │ Board  │          │
│  │ Name   │  │ Name   │  │ Name   │          │
│  │ ★      │  │ ☆      │  │ ★      │          │
│  └────────┘  └────────┘  └────────┘          │
└──────────────────────────────────────────────┘
```

**⚡ Incorporar:**

O design atual tem "Recent boards" no dashboard. Para o Onboarding Tracker:
- Tab "Ativos" / "Arquivados" (alinhado com `deletedAt` do schema)
- Grid responsivo: 3 colunas desktop, 2 tablet, 1 mobile
- Card do board: nome, quantidade de cards, data de atualização
- **NÃO favoritar** (escopo diferenciado — onboarding é temporal, não permanente)

### 1.3 Breadcrumb no Card Detail 🟡

O Kan usa breadcrumb navegável no card detail:

```
Workspace > Board Name > PREFIX-42
```

Cada segmento é clicável e navega de volta. O card number com prefixo (ex: `KAN-42`) facilita referência em chats.

**⚡ Incorporar:**

O Onboarding Tracker não tem card number. Adicionar:
- `cardNumber` auto-incremental por board (como o Kan faz)
- Prefixo do workspace (`GRV-1`, `GRV-2`, etc.) — opcional, pode ser por board
- Breadcrumb: `Dashboard > Board > Cards > GRV-42`

---

## 2. KANBAN BOARD — O CORAÇÃO DA UI

### 2.1 Board View: Horizontal Scroll com Drag-to-Scroll 🔴 CRÍTICO

O Kan resolve o problema de muitas listas com **drag-to-scroll horizontal** — o usuário clica no vazio entre as listas e arrasta para rolar:

```tsx
// apps/web/src/hooks/useDragToScroll.ts
const { ref: scrollRef, onMouseDown } = useDragToScroll({
  enabled: true,
  direction: "horizontal",
});

// Aplica no container:
<div ref={scrollRef} onMouseDown={onMouseDown} className="overflow-x-auto">
  {lists.map(...)}
</div>
```

O hook é inteligente:
- **Não interfere** com drag-and-drop de cards (`isInteractiveElement` check)
- Verifica se o clique foi em `<a>`, `<button>`, `[draggable]`, `[data-rbd-drag-handle-draggable-id]`
- Muda cursor para `grabbing` e desabilita `userSelect` durante o arrasto
- Suporta horizontal, vertical e ambos

**⚡ Incorporar na Phase 6:**

```tsx
// Copiar o hook useDragToScroll ADAPTADO para @hello-pangea/dnd
// O Onboarding Tracker já planeja usar @hello-pangea/dnd (fork ativo do react-beautiful-dnd)
// Os data attributes são os mesmos: data-rbd-drag-handle-draggable-id
```

### 2.2 Scroll Restore ao Voltar de Card Detail 🔴 CRÍTICO

O Kan salva e restaura a posição de scroll horizontal do board quando o usuário navega para um card e volta:

```tsx
// apps/web/src/hooks/useScrollRestore.ts
export function useScrollRestore(
  boardId: string | null,
  scrollRef: RefObject<HTMLElement>,
  router: NextRouter,
  isReady: boolean,
) {
  // Salva posição no routeChangeStart
  // Restaura no mount com double rAF (necessário por StrictModeDroppable)
}
```

Sem isso, o board SEMPRE reseta para a primeira coluna ao voltar de um card. É péssimo UX em boards com 5+ listas.

**⚡ Incorporar:**

```tsx
// apps/web/src/hooks/useScrollRestore.ts
// Adaptar de Kan — essencial para UX do kanban
// Usar router events do Next.js App Router (beforeNavigate / afterNavigate)
```

### 2.3 StrictModeDroppable — Workaround para React 18 🔴 CRÍTICO

O `react-beautiful-dnd` (e o fork `@hello-pangea/dnd`) quebra com React 18 Strict Mode porque faz side effects no render. O Kan resolve com wrapper:

```tsx
// apps/web/src/components/StrictModeDroppable.tsx
import { Droppable } from 'react-beautiful-dnd';
import React from 'react';

export const StrictModeDroppable = ({ children, ...props }: any) => {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => { setEnabled(true); }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};
```

**⚡ Obrigatório na Phase 6** — sem isso, o kanban QUEBRA em desenvolvimento (React.StrictMode é default no Next.js).

### 2.4 Filtros no Board 🟡 IMPORTANTE

O Kan tem sistema de filtros avançado — filtros por membro, label, lista, due date:

```tsx
// apps/web/src/views/board/components/Filters.tsx
// CheckboxDropdown com grupos:
// - Members (com avatar à esquerda)
// - Labels (com cor à esquerda)  
// - Lists (sem ícone)
// - Due date (Overdue, Today, Tomorrow, Next week, Next month, No dates)
```

Os filtros usam **URL query params** (não state local), então são:
- Compartilháveis por URL
- Salvos no histórico do browser
- Preservados ao navegar e voltar

```
/boards/abc123?members=m1,m2&labels=l1&dueDate=overdue,today
```

O contador de filtros ativos aparece no botão "Filter" com badge:

```tsx
{numOfFilters > 0 && (
  <span className="...">
    {numOfFilters}
    <button onClick={clearFilters}>×</button>  
  </span>
)}
```

**⚡ Incorporar:**

O Onboarding Tracker tem 3 personas. Filtros mínimos:
- **Por membro** (quem tá assigned)
- **Por label** (categorias do card)
- **Por status da lista** (em qual coluna está)
- **Vencimento** (atrasado, hoje, esta semana, sem prazo) — alinhado com NFR de tracking de onboarding

**Identidade Grovva:** Botão "Filtrar" com ícone + badge verde (#56C271) quando ativo. Dropdown com checkboxes estilizados.

### 2.5 Kanban Column (List) — Inline Title Edit 🟡

O Kan permite editar o título da lista **inline** (clique no nome):

```tsx
// List.tsx — usa react-hook-form para edit inline
<input
  {...register("name")}
  onBlur={handleSubmit(onSubmit)}  // salva ao sair do campo
  onKeyDown={(e) => {
    if (e.key === "Enter") handleSubmit(onSubmit)();
    if (e.key === "Escape") reset(); // cancela
  }}
/>
```

E o dropdown da lista tem: rename, hide, delete (com confirmação).

**⚡ Incorporar:** O design atual já prevê edição inline de list names. Manter o pattern.

---

## 3. CARD — O ÁTOMO DO KANBAN

### 3.1 Card Compacto com Badges 🟡

O card do Kan é **compacto** — cada informação é um micro-badge:

```
┌─────────────────────────────┐
│ Título do Card               │
│                              │
│ [🟢Label1] [🔵Label2]        │
│                              │
│ 📎 3  💬 5  🕐 12 Jun       │
│     [👨‍💼] [👩‍💼] [👤]         │
└─────────────────────────────┘
```

Elementos (em ordem de prioridade visual):
1. **Título** — texto bold, truncate se longo
2. **Labels** — bolinhas coloridas com nome (inline)
3. **Badges de metadata** (linha de ícones):
   - `📄` = tem descrição (HiBars3BottomLeft)
   - `🕐` = due date (com cor: vermelho se overdue, amarelo se hoje)
   - `💬` = contagem de comentários (HiChatBubbleLeft)
   - `📎` = contagem de anexos (HiOutlinePaperClip)
4. **Checklist progress** — circular progress + "3/5"
5. **Membros** — stack de avatares (3 max, +N resto)

**⚡ Incorporar com identidade Grovva:**

```tsx
// Card badges — usar cores Grovva:
// Overdue: Red (#F87171)
// Due today: Orange (#F59E0B)  
// Due this week: Green (#56C271)
// Labels: cores customizadas do board (manter do Kan)

// Checklist progress — CircularProgress:
// Cor: Green (#56C271) quando 100%, Blue (#3B82F6) parcial
// Font: Fira Code para "3/5"

// Membros — Avatar stack:
// Border: 2px solid white (sobreposição)
// Tamanho: 24px (múltiplo de 8 ✓)
```

### 3.2 Card Detail — Split Panel (NÃO nova página) 🟡

O Kan abre card detail como **split view** dentro do board:

```
┌─────────────────────────┬──────────────────┐
│                         │  Board > CARD-42 │
│   Kanban Board          │  ─────────────── │
│   (escurecido/dimens)   │  [Título editável]│
│                         │  [Descrição]      │
│                         │  Checklist       │
│                         │  Anexos          │
│                         │  ─────────────── │
│                         │  Labels  [🟢][🔵]│
│                         │  Members [👤][👤]│
│                         │  Due Date [12 Jun]│
│                         │  List    [Doing] │
│                         │  ─────────────── │
│                         │  Atividade       │
│                         │  [Comentário]    │
└─────────────────────────┴──────────────────┘
```

A coluna direita tem:
- **Sidebar com actions** (Labels, Members, Due date, List)
- **Área principal** com: título editável, descrição rich text, checklists, anexos, comentários
- **Activity feed** no final (usando a tabela `card_activity`)

**⚡ Incorporar:**

O design atual do Onboarding Tracker tem card Detail como **página separada** (`/cards/:id`). Considerar split view para V1:

Vantagens do split view:
- Board fica visível ao editar card
- Menos navegação = menos perda de contexto
- Mais rápido para quick edits
- Scroll restore não é necessário (board nunca sai da tela)

Desvantagens:
- Mobile needs different treatment (full screen ou bottom sheet)
- Mais complexo de implementar

**Recomendação:** Phase 6 — implementar como **drawer lateral** (50% da tela) no desktop. No mobile, full screen com botão voltar.

### 3.3 Card Context Menu (Right-Click) 🟡

O Kan suporta **clique direito** no card com context menu:

```
╔════════════════╗
║ Copy Link      ║
║ Duplicate      ║
║ ────────────── ║
║ Members        ║
║ Labels         ║
║ Move to List   ║
║ Due Date       ║
║ ────────────── ║
║ Delete         ║
╚════════════════╝
```

**⚡ Incorporar:** Acessibilidade e velocidade. No mobile, long-press ou botão "⋯" no card.

### 3.4 Card Number (Auto-incremental) 🟡

O Kan mostra `cardNumber` no card e no detail:

```tsx
// No card mini:
<span className="text-xs text-gray-400">KAN-42</span>

// No card detail breadcrumb:
Workspace > Board > KAN-42
```

**⚡ Incorporar:**

O Onboarding Tracker NÃO tem cardNumber no schema. Adicionar:
```sql
ALTER TABLE card ADD COLUMN card_number INTEGER;
CREATE INDEX idx_card_board_number ON card(board_id, card_number);
```

Gerar cardNumber via service ao criar card:
```typescript
const lastCard = await db.select({ cardNumber: max(cards.cardNumber) })
  .from(cards).where(eq(cards.boardId, boardId));
const newNumber = (lastCard?.cardNumber ?? 0) + 1;
```

---

## 4. EMPTY STATES & LOADING

### 4.1 Empty State com Ilustração + CTA 🟡

O Kan usa `PatternedBackground` (SVG pattern animado) + copy + botão:

```tsx
if (data?.length === 0) return (
  <div className="flex flex-col items-center justify-center p-8">
    <PatternedBackground />
    <h3>{archived ? t`No archived boards` : t`No boards`}</h3>
    <p>{t`Get started by creating a new board`}</p>
    <Button onClick={() => openModal("NEW_BOARD")}>
      {t`New Board`}
    </Button>
  </div>
);
```

**⚡ Incorporar com identidade Grovva:**

Empty states são OPORTUNIDADES de onboarding. Para o Onboarding Tracker:

| Contexto | Ilustração | Título | Descrição | CTA |
|----------|-----------|--------|-----------|-----|
| Sem boards | Grid vazio com cards cinza | "Nenhum board ainda" | "Crie seu primeiro board de onboarding para começar a organizar o processo" | `[+ Criar Board]` verde |
| Board sem cards | Board vazio com listas | "Este board está vazio" | "Adicione cards para cada etapa do onboarding" | `[+ Adicionar Card]` verde |
| Sem notificações | Sino cinza | "Tudo tranquilo!" | "Você não tem notificações pendentes" | — |
| Sem templates | Documento vazio | "Nenhum template" | "Crie templates para reutilizar processos de onboarding" | `[+ Criar Template]` verde |

**Regra Grovva:** CTA button em empty state SEMPRE verde (#56C271) com white text — é o momento de ação.

### 4.2 Loading Spinner Minimalista 🟢

O Kan usa spinner ultra-simple — 3 círculos com gap:

```tsx
<svg className="animate-spin" viewBox="0 0 24 24">
  <circle cx="4" cy="12" r="2" fill="currentColor" opacity="0.3" />
  <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
  <circle cx="20" cy="12" r="2" fill="currentColor" />
</svg>
```

Tamanhos: `sm` (16px), `md` (24px), `lg` (32px) — todos múltiplos de 8 ✓.

**⚡ Incorporar:** Usar spinner no estilo Grovva — manter 3 dots mas com cor Green (#56C271) em vez de currentColor. Não usar bounce/rotate 360°/pulse (proibido pelo brandbook).

**⚠️ CONFLITO:** O brandbook Grovva diz "NUNCA rotate 360°" mas `animate-spin` é rotate. Solução: usar `animate-pulse` com opacity (fade in/out dos 3 dots) em vez de spin.

### 4.3 Skeleton Loading placeholders 🟡

O Kan NÃO usa skeleton loading — usa `placeholderData: keepPreviousData` do TanStack Query para manter dados antigos durante refetch. Isso é mais elegante que skeletons.

**⚡ Incorporar:** Usar `placeholderData: keepPreviousData` + `LoadingSpinner` como fallback. Skeletons são over-engineering para V1.

---

## 5. MODALS & FORMS

### 5.1 Modal System com Headless UI 🟡

O Kan usa `@headlessui/react` Dialog com Transition:

```tsx
<Transition show={isOpen}>
  <Dialog onClose={closeModal}>
    <TransitionChild enter="..." leave="...">
      {/* Backdrop */}
    </TransitionChild>
    <TransitionChild enter="..." leave="...">
      <DialogPanel>
        {children}
      </DialogPanel>
    </TransitionChild>
  </Dialog>
</Transition>
```

Tamanhos: `sm` (400px), `md` (550px), `lg` (800px).

**⚡ Incorporar:**

O Onboarding Tracker já planeja usar Shadcn/ui (que usa Radix). O Radix Dialog é equivalente ao Headless UI. Mas o pattern de tamanhos é valioso:

```tsx
// Modal sizes (alinhados ao grid 8px)
const modalSizeMap = {
  sm: "max-w-[400px]",  // 50 × 8px
  md: "max-w-[560px]",  // 70 × 8px  
  lg: "max-w-[800px]",  // 100 × 8px
};
```

### 5.2 "Create Another" Toggle 🟡 BOA PRÁTICA

O Kan tem toggle "Create another" nos forms de criação:

```tsx
<Toggle
  checked={isCreateAnotherEnabled}
  onChange={() => setValue("isCreateAnotherEnabled", !isCreateAnotherEnabled)}
/>
{t`Create another`}
```

Quando ativado, o form **não fecha** após submit — reseta e mantém foco. Essencial para criar múltiplos cards em sequência.

**⚡ Incorporar:** Toggle "Criar outro" nos forms de:
- New Card (mais comum — onboarding tem muitos cards)
- New List
- New Template

**Identidade Grovva:** Toggle switch com track cinza, thumb branco; ativo = track Green (#56C271).

### 5.3 Confirmação de Delete com Dialog 🟡 BOA PRÁTICA

O Kan SEMPRE mostra dialog de confirmação para deletes:

```tsx
<DeleteCardConfirmation />
<DeleteListConfirmation />
<DeleteBoardConfirmation />
```

**⚡ Incorporar:** O Onboarding Tracker NÃO tem soft delete no design original. Com soft delete, o botão muda para:

| Ação | Comportamento |
|------|--------------|
| "Archive" (soft delete) | Sem confirmação — undo toast "Card arquivado" com botão "Desfazer" |
| "Delete Permanent" | Confirmação com texto "Tem certeza? Esta ação não pode ser desfeita." |

---

## 6. DRAG & DROP — PADRÕES CRÍTICOS

### 6.1 Optimistic Updates com Rollback 🔴 CRÍTICO

O Kan faz **optimistic update** em TODA operação de drag-and-drop:

```tsx
const updateCardMutation = api.card.update.useMutation({
  onMutate: async (args) => {
    // 1. Cancelar queries em andamento
    await utils.board.byId.cancel();
    
    // 2. Salvar estado atual (para rollback)
    const currentState = utils.board.byId.getData(queryParams);
    
    // 3. Atualizar cache otimisticamente
    utils.board.byId.setData(queryParams, (oldBoard) => {
      // Mover card no array de listas
      const updatedLists = Array.from(oldBoard.lists);
      const sourceList = updatedLists.find(l => 
        l.cards.some(c => c.publicId === args.cardPublicId)
      );
      const destinationList = updatedLists.find(l => 
        l.publicId === args.listPublicId
      );
      // ... splice card de source para destination
      return { ...oldBoard, lists: updatedLists };
    });
    
    // 4. Retornar estado anterior
    return { previousState: currentState };
  },
  onError: (_error, _newCard, context) => {
    // 5. Rollback em caso de erro
    utils.board.byId.setData(queryParams, context?.previousState);
    showPopup({ header: t`Unable to update card`, icon: "error" });
  },
  onSettled: async () => {
    // 6. Refetch para confirmar com servidor
    await utils.board.byId.invalidate(queryParams);
  },
});
```

Este pattern de 6 passos é **obrigatório** para D&D sem lag percebível.

**⚡ Incorporar na Phase 6:**

O Onboarding Tracker usa REST + TanStack Query (sem tRPC). Adaptar:

```tsx
const moveCard = useMutation({
  mutationFn: (data) => api.patch(`/cards/${data.publicId}`, data),
  onMutate: async (data) => {
    await queryClient.cancelQueries(['board', boardId]);
    const previousBoard = queryClient.getQueryData(['board', boardId]);
    queryClient.setQueryData(['board', boardId], (old) => {
      // mesmo splice pattern do Kan
      return optimisticUpdatedBoard;
    });
    return { previousBoard };
  },
  onError: (_err, _data, context) => {
    queryClient.setQueryData(['board', boardId], context.previousBoard);
    toast.error('Não foi possível mover o card');
  },
  onSettled: () => {
    queryClient.invalidateQueries(['board', boardId]);
  },
});
```

### 6.2 Index Management no Drag 🟡

O Kan mantém campo `index` em cada card para ordenação dentro da lista:

- New card: `maxIndex + 1`
- Move card: ajustar indices de cards afetados
- Delete card: decrementar indices acima
- SEMPRE usar transação

**⚡ Incorporar:** O design do Onboarding Tracker já tem `position` (decimal) para reordenação. Mas o approach do Kan com `index` (inteiro) é mais simples e previsível. Considerar migração para inteiro + gaps (0, 1000, 2000...) para evitar reindexação frequente.

### 6.3 Drag Types (List vs Card) 🟡

O Kan distingue dois tipos de drag:

```tsx
<DragDropContext onDragEnd={onDragEnd}>
  {/* Lists são draggable type="LIST" */}
  <Droppable droppableId="board" type="LIST" direction="horizontal">
    {/* Cards são draggable type="CARD" */}
    <Droppable droppableId={list.publicId} type="CARD">
```

Isso impede que cards sejam dropados entre listas no nível errado.

**⚡ Incorporar:** Separar `type="LIST"` e `type="CARD"` é obrigatório.

---

## 7. KEYBOARD SHORTCUTS — NÃO IMPLEMENTAR

> ⚠️ **DECISÃO DE PRODUTO:** NÃO implementar keyboard shortcuts. Os usuários do Onboarding Tracker não utilizam atalhos de teclado — a interface deve ser 100% navegável por mouse/touch.
>
> O Kan tem um sistema sofisticado de shortcuts (árvore Vim-style, `⌘K`, `⌘/`), mas nosso público-alvo não se beneficia disso. Manter a UI simples e discoverable por cliques.
>
> A ÚNICA exceção é `Escape` para fechar modais/panels — isso é comportamento de browser esperado, não "shortcut".

### 7.1 O que o Kan faz (referência, NÃO copiar)

O Kan implementa shortcuts com prefix tree (estilo Vim): `G→B` (Boards), `G→T` (Templates), `C` (Create), `⌘K` (command palette). Tem legend dialog, detecção de conflito, e ignore em inputs.

**⚡ NÃO incorporar.** Arquivado como "bom saber" se o público mudar no futuro.

### 7.2 Tooltip nos Botões — SEM atalhos

O Kan mostra atalhos nos tooltips dos botões. No Onboarding Tracker, tooltips DEVEM conter apenas **descrição da ação**, nunca atalhos de teclado.

```tsx
// ✅ Certo: tooltip descritivo
<Tooltip content="Criar novo card">...</Tooltip>

// ❌ Errado: tooltip com atalho
<Tooltip content="Novo card (N)">...</Tooltip>
```

---

## 8. ONBOARDING TOUR — DO FOCALBOARD

### 8.1 Tour Guiado com Steps e Pulsating Dot 🔴 CRÍTICO PARA PROJETO DE ONBOARDING

O Focalboard tem sistema completo de tour guiado — **irônico e perfeito** para o Onboarding Tracker que é um produto de onboarding:

```
TOUR_ORDER = [TOUR_BASE, TOUR_CARD, TOUR_BOARD, TOUR_SIDEBAR]

BaseTourSteps:    OPEN_A_CARD
CardTourSteps:    ADD_PROPERTIES → ADD_COMMENTS → ADD_DESCRIPTION
BoardTourSteps:   ADD_VIEW → COPY_LINK → SHARE_BOARD  
SidebarTourSteps: SIDE_BAR → MANAGE_CATEGORIES → SEARCH_FOR_BOARDS
```

Componentes:
- `TutorialTourTip` — tooltip posicional com backdrop semi-transparente
- **Punch-out** (furo no backdrop) que destaca o elemento alvo
- `PulsatingDot` — bolinha que pulsa no elemento para chamar atenção
- Botões: Back / Next / Skip Tutorial
- Progress dots (● ● ○ ○) no rodapé do tooltip
- **Persistência** — salva step no `userConfig` do backend
- **Telemetry** — track de cada step (StartTour, SkipTour, etc.)

**⚡ INCORPORAR COMO FEATURE CORE (não apenas pattern):**

O Onboarding Tracker É um produto de onboarding. O tour guiado é META-FEATURE:

| Step do Tour | Elemento | Ação |
|-------------|----------|------|
| 1 | Dashboard vazio | "Bem-vindo! Crie seu primeiro board" |
| 2 | Botão "Novo Board" | "Clique para criar um board de onboarding" |
| 3 | Board vazio | "Adicione listas para as etapas: Boas-vindas, Treinamento, Concluído" |
| 4 | Lista com cards | "Adicione cards para cada tarefa do onboarding" |
| 5 | Card detail | "Aqui você adiciona detalhes, labels e assignees" |
| 6 | Template list | "Ou use templates prontos para acelerar!" |
| 7 | Share button | "Compartilhe o board com o cliente via link público" |

**Implementação sugerida:**

```tsx
// packages/shared/src/tour/steps.ts
export const TourSteps = {
  WELCOME: 0,
  CREATE_BOARD: 1,
  ADD_LISTS: 2,
  ADD_CARDS: 3,
  CARD_DETAIL: 4,
  TEMPLATES: 5,
  SHARE: 6,
  FINISHED: 999,
} as const;

// apps/web/src/components/TourTooltip.tsx
// Baseado no Focalboard TutorialTourTip mas simplificado:
// - Tippy.js ou Radix Popover
// - PulsatingDot com Green (#56C271)
// - Backdrop com punch-out
// - Salvar progresso no localStorage (V1) ou DB (V2)
```

### 8.2 Welcome Page — Primeira Experiência 🟡

O Focalboard tem uma **Welcome Page** dedicada para novos usuários:

- Imagem hero (2 versões: large >2000px e small)
- Texto: "Welcome to Boards"
- Dois botões: **"Start Tour"** (primário) e **"Skip"** (secundário)
- Marca `welcomePageViewed` no userConfig para nunca mostrar de novo
- Guests são automaticamente redirecionados (não veem welcome)

**⚡ Incorporar:**

O Onboarding Tracker precisa de welcome page? **SIM** — é um produto de onboarding, deve onboardear a si mesmo:

```tsx
// apps/web/src/app/welcome/page.tsx
// Hero: imagem com Grovva pattern background
// Título (Cornaltail Type): "Bem-vindo ao Onboarding Tracker"
// Descrição: "Organize o processo de integração dos seus clientes"
// Botões: [🎓 Iniciar Tour] (Green) ou [Pular →] (ghost)
```

**Regra:** Após login, se `!user.hasCompletedTour`, redirecionar para `/welcome`.

---

## 9. NOTIFICAÇÕES & FEEDBACK

### 9.1 Popup/Toast System Simples 🟡

O Kan usa sistema de toast **ultra-simples** — context provider + 1 componente:

```tsx
// providers/popup.tsx — context simples
showPopup({ header: "Card movido", message: "O card foi movido para a lista Concluído", icon: "success" });

// components/Popup.tsx — renderização
// Aparece no topo, auto-dismiss após 3s, click to dismiss
```

Tipos de ícone: `"success"`, `"error"`, `"info"`.

**⚡ Incorporar:**

O Onboarding Tracker planeja Shadcn/ui Toast. Usar o componente do Shadcn mas com o pattern de API simples do Kan:

```tsx
// toast.success("Card movido para Concluído");
// toast.error("Não foi possível mover o card");
// toast.info("3 cards foram atualizados");

// Com undo:
toast.success("Card arquivado", {
  action: { label: "Desfazer", onClick: () => unarchiveCard() },
});
```

**Identidade Grovva:**
- Success: Green (#56C271) ícone ✓
- Error: Red (#F87171) ícone ✗
- Info: Blue (#3B82F6) ícone ℹ
- Border-left colorida (4px) no toast

### 9.2 Inline Activity Feed 🟡

O Card Detail do Kan tem feed de atividades no final:

```
┌──────────────────────┐
│ Atividade             │
│ ──────────────────── │
│ 👤 João moveu este    │
│    card de "A Fazer"  │
│    para "Fazendo"     │
│    há 2 horas         │
│                      │
│ 👤 Maria adicionou    │
│    label "Urgente"    │
│    há 3 horas         │
│                      │
│ [💬 Adicionar         │
│    comentário]        │
└──────────────────────┘
```

**⚡ Incorporar:** Usa a tabela `board_activities` (já adicionada no schema da Phase 1). Activity types do Kan são ótimo modelo:

```typescript
// Tipos de atividade (alinhados com o Kan mas simplificados)
const activityTypes = [
  "card.created",
  "card.updated.title",
  "card.updated.description",
  "card.moved",             // entre listas
  "card.label.added",
  "card.label.removed",
  "card.member.added",
  "card.member.removed",
  "card.comment.added",
  "card.completed",          // ← específico do Onboarding Tracker
  "card.dueDate.added",
  "card.archived",
] as const;
```

---

## 10. DARK MODE

### 10.1 Theme System com next-themes 🟡

O Kan usa `next-themes` com classes CSS `light:` / `dark:` do Tailwind:

```tsx
const { resolvedTheme } = useTheme();
const isDarkMode = resolvedTheme === "dark";

// No HTML:
<div className="bg-white dark:bg-dark-1000">
<div className="text-neutral-900 dark:text-neutral-100">
```

Paleta escura do Kan:
- `dark-50` até `dark-1000` (escala de 11 níveis)
- Background principal: `#1c1c1c` (dark-1000)
- Cards: `#292929` (dark-950)
- Borders: `#3a3a3a` (dark-400)

**⚡ Incorporar com identidade Grovva:**

O brandbook Grovva NÃO define paleta dark. Precisamos criar:

| Token | Light | Dark (proposto) |
|-------|-------|-----------------|
| Background | `#FAFAFA` | `#151515` |
| Surface (card) | `#FFFFFF` | `#1E1E1E` |
| Border | `#E5E5E5` | `#2E2E2E` |
| Text primary | `#171717` | `#F5F5F5` |
| Text secondary | `#737373` | `#A3A3A3` |
| Accent (Green) | `#56C271` | `#5ECE7C` (slightly brighter) |
| Green Deep | `#2F8A47` | `#3D9E5A` |

**V2 feature** — não bloquear Phase 6 por causa de dark mode.

---

## 11. RESPONSIVE / MOBILE

### 11.1 Layout Adaptativo 🟡

O Kan faz adaptação mobile:

- **Sidebar**: overlay lateral (não fixa)
- **Board**: scroll horizontal mantido (touch-friendly)
- **Card detail**: full screen com botão voltar
- **Modais**: full screen no mobile
- **D&D**: touch support via `@hello-pangea/dnd` (que já suporta touch)
- **Min-width**: `320px` (html `min-width: 320px`)

O Focalboard adiciona:
- **Mobile detection** (`Utils.isMobile()`) para ajustar scroll sensitivity
- **Hidden cards/columns** com contagem (`HiddenCardCount`)

**⚡ Incorporar:**

```css
/* Mobile breakpoints — grid 8px aligned */
/* sm: 640px (80 × 8) — 1 coluna kanban */
/* md: 768px (96 × 8) — sidebar colapsa */
/* lg: 1024px (128 × 8) — 2 colunas kanban */
/* xl: 1280px (160 × 8) — sidebar expandida */
/* 2xl: 1536px (192 × 8) — full kanban */
```

### 11.2 Hidden Columns/Cards 🟡

O Focalboard permite **esconder colunas** (status que não são relevantes agora):

```tsx
<HiddenCardCount count={hiddenCardsCount} />
```

Mostra badge "5 cards ocultos" que ao clicar expande.

**⚡ Incorporar:** Para onboarding, nem todos os status são relevantes sempre. Ex: admin pode querer ver "Arquivado" mas membro não.

---

## 12. ANIMAÇÕES & MICRO-INTERAÇÕES

### 12.1 Framer Motion no Board List 🟢

O Kan usa `framer-motion` nas animações dos board cards na listagem:

```tsx
import { motion } from "framer-motion";
```

Mas NO brandbook Grovva: **"cub-bezier(0.2, 0.8, 0.2, 1); NUNCA bounce/rotate 360°/pulse"**

**⚡ Incorporar:**

Animações permitidas (Grovva):
- `transition: cubic-bezier(0.2, 0.8, 0.2, 1)` — ease-out gentil
- `fadeIn/fadeOut` — opacity transitions (0 → 1)
- `slideIn` — translateY(8px → 0) com opacity
- `scale` sutil — scale(0.98 → 1) em hover

Animações PROIBIDAS (Grovva):
- `bounce` ❌
- `rotate 360°` ❌
- `pulse` ❌ (exceto no Tour tooltip do Focalboard — discutir)
- `spin` ❌ (usar opacity animation no spinner em vez de rotate)

---

## 13. RESUMO: O QUE INCORPORAR AOS PHASES

### 🔴 Crítico (bloqueia UX aceitável)

| # | O quê | De onde | Phase |
|---|-------|---------|-------|
| 1 | **Drag-to-Scroll horizontal** | Kan | 6 (Kanban) |
| 2 | **Scroll Restore** ao voltar de card | Kan | 6 |
| 3 | **StrictModeDroppable** wrapper | Kan | 6 |
| 4 | **Optimistic Updates** com rollback em D&D | Kan | 6 |
| 5 | **Onboarding Tour** guiado | Focalboard | 6-7 (feature core!) |
| 6 | **Empty States** com CTA em cada contexto | Kan | 5-6 |
| 7 | **Card context menu** (right-click/long-press) | Kan | 6 |

### 🟡 Importante ( melhora UX significativamente)

| # | O quê | De onde | Phase |
|---|-------|---------|-------|
| 8 | **Sidebar colapsível** com `localStorage` | Kan | 5 |
| 9 | **Card Detail como split panel** (drawer lateral) | Kan | 6 |
| 10 | **Filtros** (membro, label, due date, status) via URL | Kan | 6 |
| 11 | **Inline edit** de títulos de lista | Kan | 6 |
| 12 | **Card badges** (descrição, due date, checklist, anexos, membros) | Kan | 6 |
| 13 | **Card number** (auto-incremental, ex: GRV-42) | Kan | 1 (schema) + 6 |
| 14 | **Toast com undo** para soft delete | Kan | 5-6 |
| 15 | **Activity Feed** no card detail | Kan | 6 |
| 16 | **"Create Another" toggle** nos forms | Kan | 6 |
| 17 | **Breadcrumb** navegável no card detail | Kan | 6 |
| 18 | **Board list com tabs** (Ativos / Arquivados) | Kan | 5 |
| 19 | **Welcome Page** para novos usuários | Focalboard | 7 |
| 20 | **Hidden columns/cards** com badge count | Focalboard | 6 |

### 🟢 Recomendado (V2 ou nice-to-have)

| # | O quê | De onde | Notas |
|---|-------|---------|-------|
| 21 | ~~Keyboard shortcuts (Vim-style)~~ | Kan | ❌ REMOVIDO — usuários não usam |
| 22 | Dark mode com paleta Grovva | Kan | V2 |
| 23 | Lottie icons no sidebar | Kan | V2 — polish |
| 24 | Board import (Trello/Asana) | Kan | V2 |
| 25 | Favoritar boards | Kan | V2 — onboarding é temporal |
| 26 | Cálculos no rodapé das colunas | Focalboard | V2 — sum, count, avg |

---

## 14. CHECKLIST RÁPIDO — ANTES DE COMEÇAR PHASE 6

```markdown
## Phase 6 Prerequisites (UI/UX)

- [ ] `useDragToScroll` hook copiado e adaptado de Kan
- [ ] `StrictModeDroppable` wrapper criado
- [ ] `useScrollRestore` hook copiado e adaptado
- [ ] Toast system configurado (Shadcn/ui Sonner)
- [ ] Empty states desenhados (6 contextos: sem boards, sem cards, sem templates, sem notificações, board vazio, lista vazia)
- [ ] Card badges definidos (descrição, due date, checklist, anexos, membros)
- [ ] Activity types enum definido no schema
- [ ] Optimistic update pattern documentado para card move
- [ ] Card number adicionado ao schema (Phase 1)
- [ ] Onboarding Tour steps definidos (7 steps)
- [ ] Animações Grovva documentadas: easing `cubic-bezier(0.2, 0.8, 0.2, 1)`, NO bounce/rotate/spin
- [ ] Spinner: 3 dots fade (não rotate!), cor Green (#56C271)
```

---

## 15. REFERÊNCIAS DE CÓDIGO

| Arquivo Kan | O que faz | Copiar? |
|-------------|-----------|---------|
| `apps/web/src/hooks/useDragToScroll.ts` | Scroll horizontal arrastando | ✅ Copiar e adaptar |
| `apps/web/src/hooks/useScrollRestore.ts` | Salvar/restaurar posição scroll | ✅ Copiar e adaptar |
| `apps/web/src/components/StrictModeDroppable.tsx` | Workaround React 18 Strict Mode | ✅ Copiar direto |
| `apps/web/src/views/board/components/Filters.tsx` | Sistema de filtros via URL | ✅ Adaptar (menos groups) |
| `apps/web/src/views/board/components/Card.tsx` | Card compacto com badges | ✅ Adaptar visual Grovva |
| `apps/web/src/providers/keyboard-shortcuts.tsx` | Sistema atalhos (árvore Vim-style) | ❌ NÃO copiar — decidido pelo usuário |
| `apps/web/src/components/Dashboard.tsx` | Layout 3-regiões + sidebar | ✅ Adaptar para Grovva |
| `apps/web/src/components/SideNavigation.tsx` | Sidebar colapsível | ✅ Adaptar |
| `apps/web/src/views/boards/components/BoardsList.tsx` | Grid de boards + empty state | ✅ Adaptar visual |
| `apps/web/src/views/board/components/NewListForm.tsx` | "Create another" toggle | ✅ Copiar pattern |
| `apps/web/src/views/board/index.tsx` | Board com D&D completo | ✅ Referência principal |
| `apps/web/src/views/card/index.tsx` | Card detail split panel | ✅ Referência principal |
| `apps/web/src/providers/popup.tsx` | Toast context | ⚡ Usar Shadcn/Sonner |

| Arquivo Focalboard | O que faz | Copiar? |
|---------------------|-----------|---------|
| `webapp/src/components/onboardingTour/index.ts` | Definição dos tour steps | ✅ Adaptar para nosso produto |
| `webapp/src/components/tutorial_tour_tip/tutorial_tour_tip.tsx` | Tooltip com backdrop + punch-out | ✅ Simplificar muito |
| `webapp/src/pages/welcome/welcomePage.tsx` | Welcome page | ✅ Adaptar para Grovva |
| `webapp/src/components/kanban/kanban.tsx` | Kanban com react-dnd-scrolling | ✅ Referência de scroll |
| `webapp/src/components/kanban/kanbanCard.tsx` | Card com property values inline | ⚡ Inspiração (diferente do Kan) |
| `webapp/src/components/kanban/kanbanColumnHeader.tsx` | Header com cor, cálculos, hide/delete | V2 — cálculos |
| `webapp/src/components/kanban/calculation/calculation.tsx` | Cálculos no rodapé da coluna | V2 |
| `webapp/src/components/shareBoard/shareBoard.tsx` | Share board (gerar token, copy link, gerenciar members) | ✅ Adaptar para public_token |
| `webapp/src/hooks/permissions.tsx` | Hook de permissões granulares (admin/editor/commenter/viewer) | ✅ Adaptar |
| `webapp/src/components/permissions/boardPermissionGate.tsx` | Permission gate component (renderização condicional) | ✅ Adaptar |
| `webapp/src/components/guestNoBoards.tsx` | Empty state para guest sem boards | ✅ Adaptar |
| `webapp/src/blocks/boardView.ts` | View types: board/table/gallery/calendar + filtros/sort/sort | ✅ Referência |
| `webapp/src/undomanager.ts` | Undo/redo manager com grouping | ✅ Adaptar |
| `webapp/src/components/boardTemplateSelector/boardTemplateSelector.tsx` | Template selector com preview | ✅ Adaptar |
| `webapp/src/components/gallery/gallery.tsx` | Gallery view | ⚡ Inspiração (V2) |
| `webapp/src/components/gallery/galleryCard.tsx` | Gallery card com image + badges | ⚡ Inspiração (V2) |
| `webapp/src/components/cardBadges.tsx` | Badges: descrição, comentários, checkboxes | ✅ Adaptar |

---

## 16. PADRÕES ÚNICOS DO FOCALBOARD (não existem no Kan)

> O Kan é um Trello-clone bem feito. O Focalboard é um Notion-Asana-Trello híbrido. Estas seções cobrem o que o Focalboard faz de diferente e valioso.

### 16.1 Share Board — Public Token + Role Management 🔴 CRÍTICO

O Focalboard tem um dialog completo de compartilhamento com **3 modos**:

```
┌──────────────────────────────────────────────┐
│  Share Board                            [✕]  │
│──────────────────────────────────────────────│
│  [Members]  [Publish]                        │
│──────────────────────────────────────────────│
│  👤 Invite people                             │
│  🔍 Search for people...                     │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ 👤 Maria Silva         [Admin ▼]       │  │
│  │ 👤 João Santos         [Editor ▼]       │  │
│  │ 👤 Ana Costa           [Viewer ▼]       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ─── Publish ───                             │
│  🌐 Publish to the web                       │
│  Publish and share a read-only link with     │
│  everyone on the web.                        │
│                                              │
│  [Toggle: Share ON/OFF]                     │
│                                              │
│  🔗 https://boards.mattermost.com/shared/... │
│  [Copy link]                                 │
│  [Regenerate token]                          │
└──────────────────────────────────────────────┘
```

Funcionalidades:
- **Search people** — buscar usuários por nome/email com async autocomplete
- **4 roles**: Admin, Editor, Commenter, Viewer (com cascata de permissões)
- **"Last admin" protection** — NÃO permite remover o único admin
- **Publish to web** — toggle que gera token público (read-only)
- **Regenerate token** — invalida link anterior (com confirmação)
- **Copy link** — feedback visual ("Copied!" ✓)
- **Guest badge** — marca visual para users guest que só acessam via link

**⚡ Incorporar:**

O Onboarding Tracker já tem `public_token` no board, mas não tem:
1. **Dialog de compartilhamento** com search de membros
2. **4 roles** (só tem admin/member)
3. **UI para gerenciar roles** por membro
4. **Copy public link** com feedback
5. **Regenerate token** (importante para segurança — quando token vaza)

Schema sugerido (add à Phase 1):
```sql
-- Já existe board.public_token, mas precisa adicionar:
ALTER TABLE board ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
-- E board_members com role granular:
CREATE TABLE board_member (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',  -- admin | editor | viewer
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);
```

UI: Dialog com tabs "Membros" / "Link Público" (como Focalboard).

### 16.2 Permission Gate — Renderização Condicional por Role 🟡 IMPORTANTE

O Focalboard tem `<BoardPermissionGate>` — componente wrapper que renderiza children SOMENTE se o user tem permissão:

```tsx
// Focalboard pattern:
<BoardPermissionGate permissions={[Permission.ManageBoardCards]}>
  <button onClick={addCard}>Add Card</button>
</BoardPermissionGate>

// Se o user é Viewer, o botão NÃO RENDERIZA (nem no DOM)
```

E o hook `useHasPermissions`:
```tsx
const canEdit = useHasCurrentBoardPermissions([Permission.ManageBoardCards]);
```

**⚡ Incorporar:**

Para o Onboarding Tracker com 3 personas:

```tsx
// apps/web/src/hooks/usePermissions.ts (já planejado, MAS adaptar com Gate)
export function usePermissions(role: 'admin' | 'member' | 'viewer') {
  return {
    canCreateTemplate: role === 'admin',
    canManageMembers: role === 'admin',
    canManageWebhooks: role === 'admin',
    canManageSettings: role === 'admin',
    canArchiveBoard: role === 'admin',
    canDeleteBoard: role === 'admin',
    canChangeRoles: role === 'admin',
    canCreateBoard: role !== 'viewer',   // admin + member
    canManageCards: role !== 'viewer',    // admin + member
    canViewDashboard: true,               // todos
    canComment: true,                     // todos (interno vs público = separado)
  };
}

// apps/web/src/components/PermissionGate.tsx
export function PermissionGate({ 
  permissions, 
  invert = false, 
  children 
}: { 
  permissions: (keyof ReturnType<typeof usePermissions>)[]; 
  invert?: boolean; 
  children: React.ReactNode;
}) {
  const { role } = useAuth(); // from auth context
  const perms = usePermissions(role);
  const allowed = permissions.some(p => perms[p]);
  if (invert ? !allowed : allowed) return <>{children}</>;
  return null;
}

// Uso:
<PermissionGate permissions={['canManageCards']}>
  <button>Add Card</button>
</PermissionGate>
```

**Regra Grovva:** Viewer NÃO vê botões de ação (nem desabilitados — desaparecem). Admin vê tudo. Member vê ações de cards mas NÃO de configuração do board.

### 16.3 Guest No Boards — Empty State para Visitantes 🟡

O Focalboard tem empty state específico para guests:

```tsx
// guestNoBoards.tsx
<div className="GuestNoBoards">
  <ErrorIllustration />
  <h2>No boards yet</h2>
  <p>There are no boards to display.</p>
</div>
```

**⚡ Incorporar:**

Para o Onboarding Tracker, o visitante público via `public_token` precisa de um empty state:

```tsx
// apps/web/src/views/public/NoBoardView.tsx
<div className="flex flex-col items-center justify-center p-8">
  <Illustration /> {/* Grovva pattern background */}
  <h2>Board não encontrado</h2>
  <p>Este link pode ter expirado ou o board foi removido.</p>
  {/* SEM CTA — visitante não pode criar board */}
</div>
```

**Diferença crucial:** Empty state de guest NÃO tem botão "Criar Board" — guest não pode criar. Só admin/member podem criar.

### 16.4 Board View Types — Board / Table / Gallery 🔴 MUITO VALIOSO (V2)

O Focalboard tem **4 view types** no mesmo board:

```typescript
// boardView.ts
type IViewType = 'board' | 'table' | 'gallery' | 'calendar'
```

Cada view tem suas próprias configurações:
```typescript
type BoardViewFields = {
  viewType: IViewType
  groupById?: string                    // qual propriedade agrupa as colunas
  sortOptions: ISortOption[]            // ordenação
  visiblePropertyIds: string[]          // quais colunas mostrar
  visibleOptionIds: string[]            // quais opções de grupo mostrar
  hiddenOptionIds: string[]             // quais esconder
  collapsedOptionIds: string[]          // quais colunas estão colapsadas
  filter: FilterGroup                   // filtros
  cardOrder: string[]                   // ordem manual dos cards
  columnWidths: Record<string, number>  // largura das colunas (table view)
  kanbanCalculations: Record<string, KanbanCalculationFields>  // cálculos nos rodapés
  defaultTemplateId: string            // template padrão para novos cards
}
```

**⚡ Incorporar:**

V1 = Kanban view only (como o design atual). MAS o schema pode prever V2:

```sql
-- V2: Board views (criar na Phase 1 como preparação)
CREATE TABLE board_view (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  view_type VARCHAR(20) NOT NULL DEFAULT 'board',  -- board | table | gallery
  name VARCHAR(100) NOT NULL DEFAULT 'Main View',
  sort_options JSONB DEFAULT '[]',
  filter JSONB DEFAULT '{}',
  visible_property_ids JSONB DEFAULT '[]',
  hidden_option_ids JSONB DEFAULT '[]',
  collapsed_option_ids JSONB DEFAULT '[]',
  card_order TEXT[] DEFAULT '{}',
  column_widths JSONB DEFAULT '{}',
  default_template_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Na Phase 1, NÃO criar a tabela. Mas no model, já deixar o board com `defaultViewType: 'kanban'` para facilitar migração futura.

### 16.5 Undo/Redo Manager com Grouping 🟡 IMPORTANTE

O Focalboard tem um `UndoManager` sofisticado com **grouping** (agrupar múltiplas ações em 1 undo):

```typescript
// undomanager.ts
// Exemplo: mover 5 cards por drag = 1 undo group
// Na pratica: mutator.performAsUndoGroup(async () => { ... })

// Funcionalidades:
// - undo() / redo() com stack persistente
// - groupId: multipleaçõesviram1 undo
// - isDiscardable: ações menores (ex: reorder) são descartáveis
// - onStateDidChange callback para atualizar UI (habilitar/desabilitar botão undo)
// - Limite: configurable (evita memory leak)
```

**⚡ Incorporar:**

O Onboarding Tracker NÃO precisa de um UndoManager custom para V1. Mas deve:
1. Usar TanStack Query `useMutation` com `onMutate` (optimistic) + `onError` (rollback) — JÁ documentado na §6.1
2. Considerar V2: UndoManager para ações complexas (reorder, bulk edit)

### 16.6 Board Template Selector com Preview 🟡

O Focalboard tem seletor de templates com **preview à esquerda** e lista à direita:

```
┌──────────────────────────────────────────────┐
│  Create a Board                          [✕]  │
│──────────────────────────────────────────────│
│  Start with a template or create from scratch │
│                                              │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │              │  │ 📋 Project Tracking   │  │
│  │   Preview    │  │ 📋 OKRs              │  │
│  │   do board   │  │ 📋 Sprint Planning   │  │
│  │   selecionado │  │ 📋 Task Management   │  │
│  │              │  │ 📋 Meeting Notes      │  │
│  └──────────────┘  └─────────────────────┘  │
│                                              │
│  [✕ Close]  [Use this template]  [+ Create Empty] │
└──────────────────────────────────────────────┘
```

Funcionalidades:
- Lista de templates global (fornecidos pelo sistema) + locais (criados pelo user)
- Preview em tempo real (renderiza o board template como mini-kanban)
- Botão "Use this template" (primary) — cria board a partir do template
- Botão "Create empty" (secondary) — board em branco
- Delete template custom (com confirmação)
- Reset tour quando template "Onboarding" é usado

**⚡ Incorporar na Phase 3 (Templates):**

O Onboarding Tracker já tem templates no design. O template selector do Focalboard é o padrão a seguir:

```tsx
// apps/web/src/views/templates/TemplateSelector.tsx
// Grid de templates com preview + botão "Usar template" + "Criar vazio"
// Templates locais + templates globais (vindos do backend)
// Delete template custom (somente admin)
```

### 16.7 Gallery View — Cards como Grid 🟢 (V2)

O Focalboard tem view tipo "Gallery" — cards em grid com imagem de capa:

```
┌────────────┐ ┌────────────┐ ┌────────────┐
│  [Imagem]  │ │  [Imagem]  │ │  [Imagem]  │
│            │ │            │ │            │
│  Título    │ │  Título    │ │  Título    │
│  Prop1    │ │  Prop1    │ │  Prop1    │
│  Prop2    │ │  Prop2    │ │  Prop2    │
│  [badges] │ │  [badges] │ │  [badges] │
└────────────┘ └────────────┘ └────────────┘
```

**⚡ Incorporar:** V2. O design atual é kanban-only. Gallery view é útil para:
- Visualizar cards como "perfil do funcionário" com foto
- Ver templates como cards visuais
- Ver cards em status "completed" como galeria de conquistas

### 16.8 Card Badges — Padrão do Focalboard 🟡

O `CardBadges` do Focalboard calcula badges dinamicamente:

```tsx
// cardBadges.tsx — calcula:
type Badges = {
  description: boolean     // tem descrição/texto?
  comments: number        // contagem de comentários
  checkboxes: {           // de blocos checkbox dentro do card
    total: number
    checked: number
  }
}
// Renderiza: 📄 | 💬 3 | ✓ 2/5
```

**⚡ Incorporar:**

Mapear para o Onboarding Tracker:

```tsx
type CardBadges = {
  hasDescription: boolean      // card.description !== null
  commentCount: number         // card.comments.length
  checklistProgress: {         // card.checklists
    total: number
    completed: number
  }
  attachmentCount: number     // card.attachments.length
  memberCount: number         // card.members.length
  isOverdue: boolean          // card.dueDate < now
}
```

**Nota:** O Focalboard NÃO mostra membros nos badges — mostra no header. O Kan já mostra membros (como avatares empilhados). Usar o padrão do Kan para membros (mais visual) e o padrão do Focalboard para checklists (✓ 2/5).

---

## 17. RESUMO FINAL — FOCALBOARD-SPECIFIC

### 🔴 Crítico (incorporar)

| # | O quê | De onde | Por que |
|---|-------|---------|--------|
| F1 | **Share Board Dialog** com search + roles + public token | Focalboard | O PRD tem `public_token` mas sem UI para gerenciar |
| F2 | **PermissionGate component** — renderização condicional | Focalboard | Viewer NÃO vê botões de ação (segurança + UX) |
| F3 | **Guest empty state** — sem CTA "criar board" | Focalboard | Visitante público não pode criar |

### 🟡 Importante

| # | O quê | De onde | Phase |
|---|-------|---------|-------|
| F4 | **Board View types** (board/table/gallery) | Focalboard | V2 — schema preparado |
| F5 | **UndoManager** com grouping | Focalboard | TanStack Query rollback basta p/ V1 |
| F6 | **Template Selector** com preview | Focalboard | 3 (Templates) |
| F7 | **4 roles** (admin/editor/commenter/viewer) | Focalboard | 2 (Auth) — expandir roles |

### 🟢 V2

| # | O quê | De onde |
|---|-------|---------|
| F8 | Gallery View | Focalboard |
| F9 | Calendar View | Focalboard |
| F10 | Column calculations (count/sum/avg) | Focalboard |
