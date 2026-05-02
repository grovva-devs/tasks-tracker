"use client";

import { Droppable, Draggable } from "@hello-pangea/dnd";
import { BoardCardItem } from "./board-card-item";
import { AddCardForm } from "./add-card-form";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";

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
}

export function BoardListCol({ list, index, readOnly, onDeleteList, onAddCard, onCardClick }: BoardListColProps) {
  return (
    <Draggable draggableId={`list-${list.id}`} index={index} isDragDisabled={readOnly}>
      {(provided) => (
        <div ref={provided.innerRef} {...provided.draggableProps} className="w-72 flex-shrink-0">
          <div className="flex h-full flex-col rounded-lg bg-muted/50 border">
            {/* List Header */}
            <div {...provided.dragHandleProps} className="flex items-center justify-between px-3 py-2 border-b" style={list.color ? { borderBottomColor: list.color } : undefined}>
              <h3 className="text-sm font-semibold">{list.title}</h3>
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6" />}>
                    <MoreHorizontal className="h-3.5 w-3.5" />
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
              {(provided) => (
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