"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
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
      // Use public endpoint that server-filters comments/attachments
      const cardDetail = await apiClient<CardDetail>(`/boards/public/${token}/cards/${cardId}`);
      setSelectedCard(cardDetail);
      setPanelOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  if (!board) return <div className="flex min-h-screen items-center justify-center">Board not found</div>;

  // Calculate stats
  const totalCards = board.lists.reduce((sum, l) => sum + l.cards.length, 0);
  const completedCards = board.lists.reduce(
    (sum, l) => sum + l.cards.filter((c: any) => c.completedAt).length, 0,
  );
  const completionPct = totalCards > 0 ? Math.round((completedCards / totalCards) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
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
              <Progress value={completionPct} className="h-2 max-w-xs" />
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