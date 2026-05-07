"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useBoardData } from "@/hooks/use-board-data";
import { useBoardMutations } from "@/hooks/use-board-mutations";
import { KanbanBoard } from "@/components/board/kanban-board";
import { CardDetailPanel } from "@/components/board/card-detail-panel";
import { BoardMembersModal } from "@/components/boards/board-members-modal";
import { LabelsManager } from "@/components/board/labels-manager";
import { EditBoardModal } from "@/components/boards/edit-board-modal";
import { BoardActionsMenu } from "@/components/boards/board-actions-menu";
import { ActivityFeed } from "@/components/board/activity-feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface BoardMember {
  boardId: string;
  userId: string;
  addedAt: string;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl?: string | null;
}

interface BoardLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

interface CardDetail {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  labels: { id: string; name: string; color: string }[];
  assignees: { userId: string; displayName: string; email: string; avatarUrl?: string | null }[];
  comments: any[];
  attachments: any[];
}

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: board, isLoading } = useBoardData(boardId, token);
  const mutations = useBoardMutations(boardId);

  const { data: boardMembers = [] } = useQuery({
    queryKey: ["board-members", boardId],
    queryFn: () => apiClient<BoardMember[]>(`/boards/${boardId}/members`, { token: token! }),
    enabled: !!boardId,
  });

  const { data: boardLabels = [] } = useQuery({
    queryKey: ["board-labels", boardId],
    queryFn: () => apiClient<BoardLabel[]>(`/boards/${boardId}/labels`, { token: token! }),
    enabled: !!boardId,
  });

  const [selectedCard, setSelectedCard] = useState<CardDetail | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleCardClick = async (cardId: string) => {
    try {
      const cardDetail = await apiClient<CardDetail>(`/cards/${cardId}/detail`, { token: token! });
      setSelectedCard(cardDetail);
      setPanelOpen(true);
    } catch {
      toast.error("Failed to load card details");
    }
  };

  const handleCopyPublicLink = () => {
    if (board) {
      navigator.clipboard.writeText(`${window.location.origin}/b/${board.publicToken}`);
      toast.success("Public link copied to clipboard");
    }
  };

  const handleUpdateCard = (id: string, data: any) => {
    mutations.updateCard.mutate({ id, ...data });
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
            {board.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{board.description}</p>
            )}
          </div>
          <Badge>{board.status}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <LabelsManager boardId={boardId} />
          <BoardMembersModal boardId={boardId} />
          <EditBoardModal
            board={{
              id: board.id,
              title: board.title,
              description: board.description,
              clientName: board.clientName,
              clientEmail: board.clientEmail,
              status: board.status,
            }}
            onUpdate={(data) => mutations.updateBoard.mutate(data)}
          />
          <Button variant="outline" size="sm" onClick={handleCopyPublicLink}>
            <Share2 className="mr-2 h-3.5 w-3.5" />
            Copy Public Link
          </Button>
          <BoardActionsMenu
            boardId={boardId}
            boardTitle={board.title}
            onArchive={() => mutations.archiveBoard.mutate()}
            onDelete={() => mutations.deleteBoard.mutate()}
          />
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
        boardMembers={boardMembers.map((m) => ({
          userId: m.userId,
          displayName: m.userDisplayName,
          email: m.userEmail,
          avatarUrl: m.userAvatarUrl,
        }))}
        boardLabels={boardLabels}
        onAddComment={(cardId, content, visibility) => mutations.addComment.mutate({ cardId, content, visibility })}
        onUpdateComment={(id, content) => selectedCard && mutations.updateComment.mutate({ cardId: selectedCard.id, id, content })}
        onDeleteComment={(id) => selectedCard && mutations.deleteComment.mutate({ cardId: selectedCard.id, id })}
        onDeleteAttachment={(id) => selectedCard && mutations.deleteAttachment.mutate({ cardId: selectedCard.id, id })}
        onAddAttachment={() => queryClient.invalidateQueries({ queryKey: ["board", boardId] })}
        token={token || undefined}
        currentUserId={currentUser?.id}
        currentUserRole={currentUser?.role}
        onUpdateCard={handleUpdateCard}
        onAddAssignee={(cardId, userId) => mutations.addAssignee.mutate({ cardId, userId })}
        onRemoveAssignee={(cardId, userId) => mutations.removeAssignee.mutate({ cardId, userId })}
        onAddLabel={(cardId, labelId) => mutations.addLabel.mutate({ cardId, labelId })}
        onRemoveLabel={(cardId, labelId) => mutations.removeLabel.mutate({ cardId, labelId })}
      />
      {/* Activity Feed */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-lg font-semibold mb-4">Atividades</h2>
        <ActivityFeed boardId={boardId} />
      </div>
    </div>
  );
}
