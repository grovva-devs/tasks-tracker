"use client";

import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, MessageSquare } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface BoardCardItemProps {
  card: {
    id: string;
    title: string;
    description: string | null;
    cardNumber?: number;
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
    <Card className={cn("cursor-pointer transition-shadow hover:shadow-sm", isCompleted && "opacity-60")}>
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
          <span className="text-muted-foreground mr-1">#{card.cardNumber ?? ""}</span>
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
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={onClick}>
          {inner}
        </div>
      )}
    </Draggable>
  );
}