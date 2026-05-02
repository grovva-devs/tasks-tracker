"use client";

import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { BoardListCol } from "./board-list-col";
import { AddListForm } from "./add-list-form";

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
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;
      onCardMove?.(draggableId, destination.droppableId, destination.index);
    } else if (type === "LIST") {
      const newOrder = Array.from(board.lists);
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      onListReorder?.(newOrder.map((l, i) => ({ id: l.id, position: i })));
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="board" type="LIST" direction="horizontal">
        {(provided) => (
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