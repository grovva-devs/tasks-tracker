# Phase 6: Frontend — Kanban Board + Public Client View — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build the kanban board view with drag-and-drop using @hello-pangea/dnd, card detail side-panel with comments/attachments/labels, and the public read-only client view that reuses the same kanban components.

**Architecture:** Shared kanban components between internal (`/boards/[id]`) and public (`/b/[token]`) views. Internal view has full CRUD + drag-and-drop. Public view is read-only with client-visible content only (filter by `visibility=client`). Both use the same `KanbanBoard`, `BoardList`, and `BoardCard` components but wrapped in different contexts (edit vs read-only).

**Tech Stack:** Next.js 15, @hello-pangea/dnd, React Query, Shadcn/ui, date-fns, lucide-react

**Depends on:** Phase 5 complete
**Rules Hub:** `docs/plans/IMPLEMENTATION-HUB.md`
**Style Guide:** `docs/plans/STYLE-GUIDE.md` (paleta, tipografia, tom de voz)
**Kan+Focalboard UI/UX:** `docs/plans/REFERENCE-kan-focalboard-ui-ux.md` — 🔴 CRÍTICO para esta phase: drag-to-scroll, scroll restore, StrictModeDroppable, optimistic updates, card badges, filtros, card detail split panel, card context menu, empty states

---

## 🏛️ REGRAS DE FRONTEND — OBRIGATÓRIO NESTA PHASE

> Kanban board com drag-and-drop + client view público.
> Filtros de `visibility` são crítica de segurança aqui.
> **O frontend DEVE seguir o Grovva Style Guide:** cores, tipografia, grid 8px, motion, tom de voz.
>
> **O frontend DEVE seguir padrões Kan/Focalboard:** (ver `docs/plans/REFERENCE-kan-focalboard-ui-ux.md`)
> 1. NUNCA usar `Droppable` sem wrapper `StrictModeDroppable` (quebra em React 18 StrictMode)
> 2. SEMPRE implementar `useDragToScroll` no board container (scroll horizontal arrastando)
> 3. SEMPRE implementar `useScrollRestore` (salvar/restaurar posição scroll ao navegar)
> 4. SEMPRE fazer optimistic updates com rollback em drag-and-drop (6 passos: cancel → save state → update cache → return previous → rollback on error → refetch on settle)
> 5. NUNCA animate-spin no spinner — usar 3 dots fade (brandbook proibe rotate 360°)
> 6. SEMPRE ter empty state com CTA (botão verde) em cada contexto vazio
> 7. Toast para feedback: success=Green, error=Red, info=Blue; com undo para soft delete
> 8. Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)` — NUNCA bounce/rotate 360°/pulse

### Task 1: Kanban Board Core Components — Lists + Cards + Drag and Drop

**TDD scenario:** Component test for drag-and-drop behavior

**Files:**
- Create: `apps/web/src/components/board/kanban-board.tsx`
- Create: `apps/web/src/components/board/board-list-col.tsx`
- Create: `apps/web/src/components/board/board-card-item.tsx`
- Create: `apps/web/src/components/board/add-list-form.tsx`
- Create: `apps/web/src/components/board/add-card-form.tsx`
- Create: `apps/web/src/hooks/use-board-data.ts`
- Create: `apps/web/src/hooks/use-board-mutations.ts`
- Test: `apps/web/src/components/board/kanban-board.test.tsx`

**Step 1: Write failing test for KanbanBoard**

Create `apps/web/src/components/board/kanban-board.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KanbanBoard } from "./kanban-board";

// Mock @hello-pangea/dnd
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  Droppable: ({ children }: any) => children({ innerRef: vi.fn(), droppableProps: {} }, null),
  Draggable: ({ children }: any) => children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, null),
}));

const mockBoard = {
  id: "b1",
  title: "Test Board",
  lists: [
    {
      id: "l1",
      title: "To Do",
      position: 0,
      color: null,
      cards: [
        { id: "c1", title: "Setup environment", position: 0, description: null, dueDate: null, completedAt: null, labels: [], commentCount: 2, clientCommentCount: 1 },
        { id: "c2", title: "Send contracts", position: 1, description: null, dueDate: null, completedAt: null, labels: [], commentCount: 0, clientCommentCount: 0 },
      ],
    },
    {
      id: "l2",
      title: "Done",
      position: 1,
      color: "#22C55E",
      cards: [
        { id: "c3", title: "Welcome call", position: 0, description: null, dueDate: null, completedAt: "2025-04-30", labels: [], commentCount: 0, clientCommentCount: 0 },
      ],
    },
  ],
};

describe("KanbanBoard", () => {
  it("renders all lists with their titles", () => {
    render(<KanbanBoard board={mockBoard as any} readOnly={false} />);

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders all card titles within their lists", () => {
    render(<KanbanBoard board={mockBoard as any} readOnly={false} />);

    expect(screen.getByText("Setup environment")).toBeInTheDocument();
    expect(screen.getByText("Send contracts")).toBeInTheDocument();
    expect(screen.getByText("Welcome call")).toBeInTheDocument();
  });

  it("shows completed indicator on cards in Done list", () => {
    render(<KanbanBoard board={mockBoard as any} readOnly={false} />);

    expect(screen.getByText("Welcome call")).toBeInTheDocument();
  });

  it("shows add card button when not read-only", () => {
    render(<KanbanBoard board={mockBoard as any} readOnly={false} />);

    // Each list should have an "Add card" trigger
    expect(screen.getAllByText("+ Add card")).toHaveLength(2);
  });

  it("hides add card button when read-only", () => {
    render(<KanbanBoard board={mockBoard as any} readOnly={true} />);

    expect(screen.queryByText("+ Add card")).not.toBeInTheDocument();
  });
});
```

**Step 2: Run test — fails**

```bash
cd apps/web && pnpm test kanban-board.test
```

**Step 3: Create the useBoardData hook**

Create `apps/web/src/hooks/use-board-data.ts`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface ListData {
  id: string;
  title: string;
  position: number;
  color: string | null;
  cards: CardData[];
  createdAt: string;
}

interface CardData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  labels: { id: string; name: string; color: string }[];
  commentCount: number;
  clientCommentCount: number;
}

export interface BoardDetail {
  id: string;
  title: string;
  description: string | null;
  clientName: string;
  status: string;
  publicToken: string;
  lists: ListData[];
}

export function useBoardData(boardId: string, token?: string | null) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => apiClient<BoardDetail>(`/boards/${boardId}`, { token: token ?? undefined }),
    enabled: !!boardId,
  });
}

export function usePublicBoardData(publicToken: string) {
  return useQuery({
    queryKey: ["public-board", publicToken],
    queryFn: () => apiClient<BoardDetail>(`/boards/public/${publicToken}`),
    enabled: !!publicToken,
  });
}
```

**Step 4: Create the useBoardMutations hook**

Create `apps/web/src/hooks/use-board-mutations.ts`:

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";

export function useBoardMutations(boardId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  const invalidateBoard = () => {
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });
  };

  const addList = useMutation({
    mutationFn: (data: { title: string; color?: string }) =>
      apiClient(`/boards/${boardId}/lists`, { method: "POST", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const updateList = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; color?: string; position?: number }) =>
      apiClient(`/boards/${boardId}/lists/${id}`, { method: "PATCH", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const deleteList = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/boards/${boardId}/lists/${id}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const addCard = useMutation({
    mutationFn: ({ listId, ...data }: { listId: string; title: string; description?: string; dueDate?: string }) =>
      apiClient(`/lists/${listId}/cards`, { method: "POST", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const updateCard = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; dueDate?: string | null }) =>
      apiClient(`/cards/${id}`, { method: "PATCH", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const moveCard = useMutation({
    mutationFn: ({ id, listId, position }: { id: string; listId: string; position: number }) =>
      apiClient(`/cards/${id}/move`, { method: "PATCH", token: token!, body: { listId, position } }),
    onSuccess: invalidateBoard,
  });

  const deleteCard = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/cards/${id}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const addComment = useMutation({
    mutationFn: ({ cardId, content, visibility }: { cardId: string; content: string; visibility: string }) =>
      apiClient(`/cards/${cardId}/comments`, { method: "POST", token: token!, body: { content, visibility } }),
    onSuccess: invalidateBoard,
  });

  const addLabel = useMutation({
    mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      apiClient(`/cards/${cardId}/labels/${labelId}`, { method: "POST", token: token! }),
    onSuccess: invalidateBoard,
  });

  const removeLabel = useMutation({
    mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      apiClient(`/cards/${cardId}/labels/${labelId}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const reorderLists = useMutation({
    mutationFn: (items: { id: string; position: number }[]) =>
      apiClient(`/boards/${boardId}/lists/reorder`, { method: "PATCH", token: token!, body: { items } }),
    onSuccess: invalidateBoard,
  });

  return {
    addList, updateList, deleteList,
    addCard, updateCard, moveCard, deleteCard,
    addComment, addLabel, removeLabel, reorderLists,
  };
}
```

**Step 5: Implement BoardCardItem**

Create `apps/web/src/components/board/board-card-item.tsx`:

```typescript
"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, MessageSquare, Paperclip } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { DraggableProvided } from "@hello-pangea/dnd";

interface BoardCardItemProps {
  card: {
    id: string;
    title: string;
    description: string | null;
    position: number;
    dueDate: string | null;
    completedAt: string | null;
    labels: { id: string; name: string; color: string }[];
    commentCount: number;
    clientCommentCount: number;
  };
  index: number;
  readOnly: boolean;
  onClick?: () => void;
}

export function BoardCardItem({ card, index, readOnly, onClick }: BoardCardItemProps) {
  const isCompleted = !!card.completedAt;
  const isOverdue = card.dueDate && !isCompleted && new Date(card.dueDate) < new Date();

  const inner = (
    <Card className={cn(
      "cursor-pointer transition-shadow hover:shadow-sm",
      isCompleted && "opacity-60",
    )}>
      <CardContent className="p-3">
        {card.labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <Badge key={label.id} variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: label.color, color: label.color }}>
                {label.name}
              </Badge>
            ))}
          </div>
        )}
        <p className={cn("text-sm font-medium", isCompleted && "line-through")}>
          {isCompleted && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-green-500" />}
          {card.title}
        </p>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          {card.dueDate && (
            <span className={cn("flex items-center gap-1", isOverdue && "text-destructive font-medium")}>
              <Calendar className="h-3 w-3" />
              {formatDate(card.dueDate)}
            </span>
          )}
          {card.commentCount > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {card.commentCount}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (readOnly) {
    return <div onClick={onClick}>{inner}</div>;
  }

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided: DraggableProvided) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={onClick}>
          {inner}
        </div>
      )}
    </Draggable>
  );
}
```

**Step 6: Implement BoardListCol**

Create `apps/web/src/components/board/board-list-col.tsx`:

```typescript
"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { BoardCardItem } from "./board-card-item";
import { AddCardForm } from "./add-card-form";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { DroppableProvided, DraggableProvided } from "@hello-pangea/dnd";

interface BoardListColProps {
  list: {
    id: string;
    title: string;
    position: number;
    color: string | null;
    cards: any[];
  };
  index: number;
  readOnly: boolean;
  onDeleteList?: (id: string) => void;
  onAddCard?: (listId: string, title: string) => void;
  onCardClick?: (cardId: string) => void;
  onUpdateListTitle?: (id: string, title: string) => void;
}

export function BoardListCol({ list, index, readOnly, onDeleteList, onAddCard, onCardClick, onUpdateListTitle }: BoardListColProps) {
  return (
    <Draggable draggableId={`list-${list.id}`} index={index} isDragDisabled={readOnly}>
      {(provided: DraggableProvided) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="w-72 flex-shrink-0">
          <div className="flex h-full flex-col rounded-lg bg-muted/50 border">
            {/* List Header */}
            <div {...provided.dragHandleProps} className="flex items-center justify-between px-3 py-2 border-b" style={list.color ? { borderBottomColor: list.color } : undefined}>
              <h3 className="text-sm font-semibold">{list.title}</h3>
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onDeleteList?.(list.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete List
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Cards */}
            <Droppable droppableId={list.id} type="CARD">
              {(provided: DroppableProvided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 space-y-2 p-2 overflow-y-auto min-h-[50px]">
                  {list.cards.map((card: any, cardIndex: number) => (
                    <BoardCardItem
                      key={card.id}
                      card={card}
                      index={cardIndex}
                      readOnly={readOnly}
                      onClick={() => onCardClick?.(card.id)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* Add Card */}
            {!readOnly && (
              <div className="p-2 border-t">
                <AddCardForm onAdd={(title) => onAddCard?.(list.id, title)} />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
```

**Step 7: Implement AddCardForm + AddListForm**

Create `apps/web/src/components/board/add-card-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface AddCardFormProps {
  onAdd: (title: string) => void;
}

export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setIsOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add card
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Card title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onAdd(title.trim());
            setTitle("");
            setIsOpen(false);
          }
          if (e.key === "Escape") {
            setTitle("");
            setIsOpen(false);
          }
        }}
        autoFocus
      />
      <div className="flex gap-1">
        <Button size="sm" onClick={() => { if (title.trim()) { onAdd(title.trim()); setTitle(""); setIsOpen(false); } }} disabled={!title.trim()}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setTitle(""); setIsOpen(false); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

Create `apps/web/src/components/board/add-list-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface AddListFormProps {
  onAdd: (title: string) => void;
}

export function AddListForm({ onAdd }: AddListFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!isOpen) {
    return (
      <Button variant="outline" className="w-72 flex-shrink-0" onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add list
      </Button>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 rounded-lg border bg-muted/50 p-3 space-y-2">
      <Input
        placeholder="List title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onAdd(title.trim());
            setTitle("");
            setIsOpen(false);
          }
          if (e.key === "Escape") { setTitle(""); setIsOpen(false); }
        }}
        autoFocus
      />
      <div className="flex gap-1">
        <Button size="sm" onClick={() => { if (title.trim()) { onAdd(title.trim()); setTitle(""); setIsOpen(false); } }} disabled={!title.trim()}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setTitle(""); setIsOpen(false); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

**Step 8: Implement KanbanBoard (main component)**

Create `apps/web/src/components/board/kanban-board.tsx`:

```typescript
"use client";

import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { BoardListCol } from "./board-list-col";
import { AddListForm } from "./add-list-form";
import { DroppableProvided } from "@hello-pangea/dnd";

interface KanbanBoardProps {
  board: {
    id: string;
    title: string;
    lists: any[];
  };
  readOnly: boolean;
  onCardMove?: (cardId: string, listId: string, position: number) => void;
  onListReorder?: (items: { id: string; position: number }[]) => void;
  onDeleteList?: (id: string) => void;
  onAddCard?: (listId: string, title: string) => void;
  onAddList?: (title: string) => void;
  onCardClick?: (cardId: string) => void;
}

export function KanbanBoard({
  board, readOnly, onCardMove, onListReorder, onDeleteList, onAddCard, onAddList, onCardClick,
}: KanbanBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || readOnly) return;

    const { source, destination, type, draggableId } = result;

    if (type === "CARD") {
      // Moved a card
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;
      onCardMove?.(draggableId, destination.droppableId, destination.index);
    } else if (type === "LIST") {
      // Reordered lists
      const newOrder = Array.from(board.lists);
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      onListReorder?.(newOrder.map((l, i) => ({ id: l.id, position: i })));
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="board" type="LIST" direction="horizontal">
        {(provided: DroppableProvided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-4 overflow-x-auto p-1 pb-4">
            {board.lists
              .sort((a: any, b: any) => a.position - b.position)
              .map((list: any, index: number) => (
                <BoardListCol
                  key={list.id}
                  list={list}
                  index={index}
                  readOnly={readOnly}
                  onDeleteList={onDeleteList}
                  onAddCard={onAddCard}
                  onCardClick={onCardClick}
                />
              ))}
            {provided.placeholder}
            {!readOnly && <AddListForm onAdd={(title) => onAddList?.(title)} />}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

**Step 9: Run test — passes**

```bash
cd apps/web && pnpm test kanban-board.test
```

Expected: 5 tests PASS

**Step 10: Commit**

```bash
git add -A && git commit -m "feat: add kanban board with drag-and-drop, list/card components, and add forms"
```

---

### Task 2: Card Detail Side-Panel — Comments + Attachments + Labels

**TDD scenario:** Component test for panel rendering

**Files:**
- Create: `apps/web/src/components/board/card-detail-panel.tsx`
- Create: `apps/web/src/components/board/comment-list.tsx`
- Create: `apps/web/src/components/board/attachment-list.tsx`
- Test: `apps/web/src/components/board/card-detail-panel.test.tsx`

**Step 1: Write failing test for CardDetailPanel**

Create `apps/web/src/components/board/card-detail-panel.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardDetailPanel } from "./card-detail-panel";

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({ innerRef: vi.fn(), droppableProps: {} }, null),
  Draggable: ({ children }: any) => children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, null),
}));

const mockCard = {
  id: "c1",
  title: "Setup environment",
  description: "Configure the SaaS instance for the client",
  dueDate: "2025-05-15",
  completedAt: null,
  labels: [
    { id: "lbl-1", name: "Setup", color: "#3B82F6" },
    { id: "lbl-2", name: "Priority", color: "#EF4444" },
  ],
  comments: [
    { id: "cm-1", authorName: "Admin", content: "Started working on this", visibility: "internal", createdAt: "2025-04-28T10:00:00Z" },
    { id: "cm-2", authorName: "Admin", content: "Client can see this", visibility: "client", createdAt: "2025-04-29T10:00:00Z" },
  ],
  attachments: [
    { id: "att-1", fileName: "contract.pdf", fileUrl: "https://s3/contract.pdf", fileSize: 102400, mimeType: "application/pdf", visibility: "client", uploadedBy: "user-1", createdAt: "2025-04-28" },
  ],
};

describe("CardDetailPanel", () => {
  it("renders card title and description", () => {
    render(<CardDetailPanel card={mockCard as any} isOpen={true} onClose={vi.fn()} readOnly={false} />);

    expect(screen.getByText("Setup environment")).toBeInTheDocument();
    expect(screen.getByText("Configure the SaaS instance for the client")).toBeInTheDocument();
  });

  it("shows labels with correct colors", () => {
    render(<CardDetailPanel card={mockCard as any} isOpen={true} onClose={vi.fn()} readOnly={false} />);

    expect(screen.getByText("Setup")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
  });

  it("shows comments list", () => {
    render(<CardDetailPanel card={mockCard as any} isOpen={true} onClose={vi.fn()} readOnly={false} />);

    expect(screen.getByText("Started working on this")).toBeInTheDocument();
    expect(screen.getByText("Client can see this")).toBeInTheDocument();
  });

  it("shows internal/client visibility badges on comments", () => {
    render(<CardDetailPanel card={mockCard as any} isOpen={true} onClose={vi.fn()} readOnly={false} />);

    expect(screen.getByText("internal")).toBeInTheDocument();
    expect(screen.getByText("client")).toBeInTheDocument();
  });

  it("shows attachments list", () => {
    render(<CardDetailPanel card={mockCard as any} isOpen={true} onClose={vi.fn()} readOnly={false} />);

    expect(screen.getByText("contract.pdf")).toBeInTheDocument();
  });

  it("hides internal comments when in public/read-only mode", () => {
    render(<CardDetailPanel card={mockCard as any} isOpen={true} onClose={vi.fn()} readOnly={true} publicView={true} />);

    expect(screen.queryByText("Started working on this")).not.toBeInTheDocument();
    expect(screen.getByText("Client can see this")).toBeInTheDocument();
  });
});
```

**Step 2: Implement CommentList**

Create `apps/web/src/components/board/comment-list.tsx`:

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";

interface Comment {
  id: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  visibility: string;
  createdAt: string;
}

interface CommentListProps {
  comments: Comment[];
  publicView?: boolean;
}

export function CommentList({ comments, publicView }: CommentListProps) {
  const filtered = publicView
    ? comments.filter((c) => c.visibility === "client")
    : comments;

  if (filtered.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No comments yet</p>;
  }

  return (
    <div className="space-y-3">
      {filtered.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{comment.authorName}</span>
              {!publicView && (
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {comment.visibility}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Implement AttachmentList**

Create `apps/web/src/components/board/attachment-list.tsx`:

```typescript
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileIcon, Download, Trash2 } from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  visibility: string;
  uploadedBy: string;
  createdAt: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  publicView?: boolean;
  onDelete?: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ attachments, publicView, onDelete }: AttachmentListProps) {
  const filtered = publicView
    ? attachments.filter((a) => a.visibility === "client")
    : attachments;

  if (filtered.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No attachments</p>;
  }

  return (
    <div className="space-y-2">
      {filtered.map((att) => (
        <div key={att.id} className="flex items-center gap-3 rounded-md border p-2">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <a href={att.fileUrl} target="_blank" className="text-sm font-medium hover:underline truncate block">
              {att.fileName}
            </a>
            <span className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</span>
          </div>
          {!publicView && (
            <Badge variant="outline" className="text-[10px]">{att.visibility}</Badge>
          )}
          <a href={att.fileUrl} target="_blank" download>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
          {!publicView && onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(att.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Implement CardDetailPanel**

Create `apps/web/src/components/board/card-detail-panel.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, X } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { CommentList } from "./comment-list";
import { AttachmentList } from "./attachment-list";

interface CardDetailPanelProps {
  card: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    completedAt: string | null;
    labels: { id: string; name: string; color: string }[];
    comments: any[];
    attachments: any[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
  readOnly: boolean;
  publicView?: boolean;
  onAddComment?: (cardId: string, content: string, visibility: string) => void;
  onDeleteAttachment?: (id: string) => void;
  onUpdateCard?: (id: string, data: any) => void;
}

export function CardDetailPanel({
  card, isOpen, onClose, readOnly, publicView, onAddComment, onDeleteAttachment, onUpdateCard,
}: CardDetailPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("internal");

  if (!card) return null;

  const isCompleted = !!card.completedAt;
  const isOverdue = card.dueDate && !isCompleted && new Date(card.dueDate) < new Date();

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddComment?.(card.id, commentText.trim(), commentVisibility);
    setCommentText("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isCompleted && <span className="text-green-500">✓</span>}
            {card.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.labels.map((label) => (
                <Badge key={label.id} variant="outline" style={{ borderColor: label.color, color: label.color }}>
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          {card.description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.description}</p>
            </div>
          )}

          {/* Due Date */}
          {card.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className={cn("text-sm", isOverdue && "text-destructive font-medium")}>
                Due: {formatDate(card.dueDate)}
              </span>
            </div>
          )}

          <Separator />

          {/* Tabs: Comments + Attachments */}
          <Tabs defaultValue="comments">
            <TabsList className="w-full">
              <TabsTrigger value="comments" className="flex-1">
                Comments ({publicView ? card.comments.filter((c: any) => c.visibility === "client").length : card.comments.length})
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex-1">
                Attachments ({publicView ? card.attachments.filter((a: any) => a.visibility === "client").length : card.attachments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-4 space-y-4">
              <CommentList comments={card.comments} publicView={publicView} />

              {!readOnly && !publicView && (
                <div className="space-y-2 border-t pt-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={commentVisibility === "internal" ? "default" : "outline"}
                        onClick={() => setCommentVisibility("internal")}
                      >
                        Internal
                      </Button>
                      <Button
                        size="sm"
                        variant={commentVisibility === "client" ? "default" : "outline"}
                        onClick={() => setCommentVisibility("client")}
                      >
                        Client
                      </Button>
                    </div>
                    <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()}>
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <AttachmentList attachments={card.attachments} publicView={publicView} onDelete={onDeleteAttachment} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 5: Run test — passes**

```bash
cd apps/web && pnpm test card-detail-panel.test
```

Expected: 6 tests PASS

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: add card detail panel with comments (internal/client), attachments, and labels"
```

---

### Task 3: Board Detail Page + Public Client Board View

**TDD scenario:** Integration test — page rendering

**Files:**
- Create: `apps/web/src/app/(dashboard)/boards/[id]/page.tsx`
- Create: `apps/web/src/app/b/[token]/page.tsx`
- Create: `apps/web/src/app/b/layout.tsx`
- Test: `apps/web/src/app/b/[token]/page.test.tsx`

**Step 1: Implement board detail page**

Create `apps/web/src/app/(dashboard)/boards/[id]/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useBoardData } from "@/hooks/use-board-data";
import { useBoardMutations } from "@/hooks/use-board-mutations";
import { KanbanBoard } from "@/components/board/kanban-board";
import { CardDetailPanel } from "@/components/board/card-detail-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Copy, MoreVertical, Share2 } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

interface CardDetail {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  labels: { id: string; name: string; color: string }[];
  comments: any[];
  attachments: any[];
}

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const token = useAuthStore((s) => s.token);

  const { data: board, isLoading } = useBoardData(boardId, token);
  const mutations = useBoardMutations(boardId);

  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleCardClick = async (cardId: string) => {
    try {
      const cardDetail = await apiClient<CardDetail>(`/cards/${cardId}`, { token: token! });
      setSelectedCard(cardDetail);
      setPanelOpen(true);
    } catch (err) {
      toast.error("Failed to load card details");
    }
  };

  const handleCopyPublicLink = () => {
    if (board) {
      navigator.clipboard.writeText(`${window.location.origin}/b/${board.publicToken}`);
      toast.success("Public link copied to clipboard!");
    }
  };

  const handleRegenerateToken = async () => {
    try {
      const result = await apiClient<{ publicToken: string }>(`/boards/${boardId}/regenerate-token`, {
        method: "PATCH",
        token: token!,
      });
      toast.success("Public link regenerated");
    } catch { toast.error("Failed to regenerate token"); }
  };

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-lg" />;
  if (!board) return <div>Board not found</div>;

  return (
    <div className="space-y-4">
      {/* Board Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/boards">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{board.title}</h1>
            <p className="text-sm text-muted-foreground">{board.clientName}</p>
          </div>
          <Badge>{board.status}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyPublicLink}>
            <Share2 className="mr-2 h-3.5 w-3.5" />
            Copy Public Link
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleRegenerateToken}>Regenerate public link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        board={board}
        readOnly={false}
        onCardMove={(cardId, listId, position) => mutations.moveCard.mutate({ id: cardId, listId, position })}
        onListReorder={(items) => mutations.reorderLists.mutate(items)}
        onDeleteList={(id) => mutations.deleteList.mutate(id)}
        onAddCard={(listId, title) => mutations.addCard.mutate({ listId, title })}
        onAddList={(title) => mutations.addList.mutate({ title })}
        onCardClick={handleCardClick}
      />

      {/* Card Detail Panel */}
      <CardDetailPanel
        card={selectedCard}
        isOpen={panelOpen}
        onClose={() => { setPanelOpen(false); setSelectedCard(null); }}
        readOnly={false}
        onAddComment={(cardId, content, visibility) => mutations.addComment.mutate({ cardId, content, visibility })}
      />
    </div>
  );
}
```

**Step 2: Implement public board view**

Create `apps/web/src/app/b/layout.tsx`:

```typescript
import { SettingsProvider } from "@/providers/settings-provider";

export default function PublicBoardLayout({ children }: { children: React.ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
```

Create `apps/web/src/providers/settings-provider.tsx`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { createContext, useContext } from "react";

interface PublicSettings {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
}

const SettingsContext = createContext<PublicSettings>({
  companyName: "Onboarding Tracker",
  logoUrl: null,
  primaryColor: "#3B82F6",
});

export function usePublicSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: () => apiClient<PublicSettings>("/settings/public"),
  });

  return (
    <SettingsContext.Provider value={settings ?? { companyName: "Onboarding Tracker", logoUrl: null, primaryColor: "#3B82F6" }}>
      {children}
    </SettingsContext.Provider>
  );
}
```

Create `apps/web/src/app/b/[token]/page.tsx`:

```typescript
"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePublicBoardData } from "@/hooks/use-board-data";
import { KanbanBoard } from "@/components/board/kanban-board";
import { CardDetailPanel } from "@/components/board/card-detail-panel";
import { usePublicSettings } from "@/providers/settings-provider";
import { apiClient } from "@/lib/api-client";
import { Progress } from "@/components/ui/progress";

interface CardDetail {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  labels: { id: string; name: string; color: string }[];
  comments: any[];
  attachments: any[];
}

export default function PublicBoardPage() {
  const params = useParams();
  const token = params.token as string;
  const settings = usePublicSettings();

  const { data: board, isLoading } = usePublicBoardData(token);
  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleCardClick = async (cardId: string) => {
    try {
      const cardDetail = await apiClient<CardDetail>(`/cards/${cardId}`);
      // Filter to only client-visible content
      cardDetail.comments = cardDetail.comments.filter((c: any) => c.visibility === "client");
      cardDetail.attachments = cardDetail.attachments.filter((a: any) => a.visibility === "client");
      setSelectedCard(cardDetail);
      setPanelOpen(true);
    } catch {}
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!board) return <div className="flex min-h-screen items-center justify-center">Board not found</div>;

  // Calculate stats
  const totalCards = board.lists.reduce((sum, l) => sum + l.cards.length, 0);
  const completedCards = board.lists.reduce(
    (sum, l) => sum + l.cards.filter((c: any) => c.completedAt).length, 0
  );
  const completionPct = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  return (
    <div className="min-h-screen bg-background" style={{ "--primary": settings.primaryColor } as any}>
      {/* Header with branding */}
      <header className="border-b px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.logoUrl && <img src={settings.logoUrl} alt={settings.companyName} className="h-8" />}
              <h1 className="text-lg font-semibold" style={{ color: settings.primaryColor }}>
                {settings.companyName}
              </h1>
            </div>
            <span className="text-sm text-muted-foreground">Client Progress View</span>
          </div>
          <div className="mt-3">
            <h2 className="text-xl font-bold">{board.title}</h2>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={completionPct} className="h-2 max-w-xs" style={{ backgroundColor: `${settings.primaryColor}20` } as any} />
              <span className="text-sm font-medium" style={{ color: settings.primaryColor }}>{completionPct}%</span>
              <span className="text-xs text-muted-foreground">{completedCards}/{totalCards} cards completed</span>
            </div>
          </div>
        </div>
      </header>

      {/* Kanban Board (read-only) */}
      <div className="mx-auto max-w-7xl p-6">
        <KanbanBoard board={board} readOnly={true} onCardClick={handleCardClick} />
      </div>

      {/* Card Detail (public view) */}
      <CardDetailPanel
        card={selectedCard}
        isOpen={panelOpen}
        onClose={() => { setPanelOpen(false); setSelectedCard(null); }}
        readOnly={true}
        publicView={true}
      />
    </div>
  );
}
```

**Step 3: Write test for public board view**

Create `apps/web/src/app/b/[token]/page.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({ innerRef: vi.fn(), droppableProps: {} }, null),
  Draggable: ({ children }: any) => children({ innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} }, null),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ token: "test-token" }),
}));

vi.mock("@/hooks/use-board-data", () => ({
  usePublicBoardData: () => ({
    data: {
      id: "b1",
      title: "Acme Onboarding",
      lists: [
        { id: "l1", title: "To Do", position: 0, color: null, cards: [
          { id: "c1", title: "Setup", position: 0, description: null, dueDate: null, completedAt: null, labels: [], commentCount: 0, clientCommentCount: 0 },
        ]},
        { id: "l2", title: "Done", position: 1, color: "#22C55E", cards: [
          { id: "c2", title: "Welcome", position: 0, description: null, dueDate: null, completedAt: "2025-04-30", labels: [], commentCount: 0, clientCommentCount: 0 },
        ]},
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@/providers/settings-provider", () => ({
  usePublicSettings: () => ({ companyName: "Test Co", logoUrl: null, primaryColor: "#3B82F6" }),
}));

describe("PublicBoardPage", () => {
  it("renders board title and company branding", async () => {
    const { default: PublicBoardPage } = await import("./page");
    render(<PublicBoardPage />);

    expect(screen.getByText("Test Co")).toBeInTheDocument();
    expect(screen.getByText("Acme Onboarding")).toBeInTheDocument();
  });

  it("shows completion percentage", async () => {
    const { default: PublicBoardPage } = await import("./page");
    render(<PublicBoardPage />);

    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("1/2 cards completed")).toBeInTheDocument();
  });

  it("renders kanban lists in read-only mode", async () => {
    const { default: PublicBoardPage } = await import("./page");
    render(<PublicBoardPage />);

    expect(screen.getByText("To Do")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Setup")).toBeInTheDocument();
    expect(screen.queryByText("+ Add card")).not.toBeInTheDocument();
  });
});
```

**Step 4: Run all tests**

```bash
cd apps/web && pnpm test
```

Expected: All board tests PASS

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: add board detail page and public client view with branding, completion stats, and read-only kanban"
```

---

**Phase 6 checkpoint:** At this point you have:
- ✅ Kanban board with @hello-pangea/dnd drag-and-drop (cards + lists)
- ✅ Add card/list inline forms (Enter to submit, Escape to cancel — padrão de browser, não shortcut)
- ✅ Card detail side-panel with comments (internal/client toggle) + attachments + labels
- ✅ Board detail page with full CRUD, public link copy, token regeneration
- ✅ Public client view at `/b/[token]` with branding, completion stats, client-only content
- ✅ Settings provider for company logo/color/name in public view