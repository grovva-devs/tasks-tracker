"use client";

import { useActivities } from "@/hooks/use-activities";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, CheckCircle, MoveRight, MessageSquare, UserPlus, FileText } from "lucide-react";

interface ActivityFeedProps {
  boardId: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  "board.created": <FileText className="h-4 w-4 text-blue-500" />,
  "card.created": <FileText className="h-4 w-4 text-green-500" />,
  "card.moved": <MoveRight className="h-4 w-4 text-orange-500" />,
  "card.completed": <CheckCircle className="h-4 w-4 text-emerald-500" />,
  "card.assigned": <UserPlus className="h-4 w-4 text-purple-500" />,
  "comment.added": <MessageSquare className="h-4 w-4 text-indigo-500" />,
  "board.completed": <CheckCircle className="h-4 w-4 text-emerald-500" />,
};

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    "board.created": "Quadro criado",
    "card.created": "Card criado",
    "card.moved": "Card movido",
    "card.completed": "Card concluído",
    "card.assigned": "Card atribuído",
    "comment.added": "Comentário adicionado",
    "board.completed": "Quadro concluído",
  };
  return labels[action] ?? action;
}

export function ActivityFeed({ boardId }: ActivityFeedProps) {
  const { data: activities, isLoading } = useActivities(boardId, 50);

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Carregando atividades...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  return (
    <div className="h-[400px] overflow-y-auto">
      <div className="space-y-3 p-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="mt-0.5">
              {actionIcons[activity.action] ?? (
                <Activity className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm">
                <span className="font-medium">{getActionLabel(activity.action)}</span>
                {activity.description ? (
                  <span className="text-muted-foreground"> — {activity.description}</span>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
