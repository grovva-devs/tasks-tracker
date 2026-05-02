"use client";

interface KanbanPreviewProps {
  lists: { title: string; position: number; color: string | null; cards: { title: string; position: number }[] }[];
  variables: { key: string }[];
}

/**
 * Renders a read-only kanban preview with {{variables}} highlighted in a distinct color.
 */
export function KanbanPreview({ lists, variables }: KanbanPreviewProps) {
  const variableKeys = new Set(variables.map((v) => v.key));

  const renderWithHighlights = (text: string) => {
    const parts = text.split(/(\{\{\w+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\{\{(\w+)\}\}$/);
      if (match) {
        const isKnownVar = variableKeys.has(match[1]);
        return (
          <span
            key={i}
            className={`px-1 rounded text-xs font-mono ${
              isKnownVar ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-700"
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex gap-3 overflow-x-auto p-1">
      {lists
        .sort((a, b) => a.position - b.position)
        .map((list) => (
          <div
            key={list.position}
            className="w-56 flex-shrink-0 rounded-lg border bg-muted/30"
          >
            <div
              className="px-3 py-2 text-sm font-semibold border-b"
              style={list.color ? { borderBottomColor: list.color } : undefined}
            >
              {renderWithHighlights(list.title)}
            </div>
            <div className="space-y-1.5 p-2">
              {list.cards
                .sort((a, b) => a.position - b.position)
                .map((card, ci) => (
                  <div
                    key={ci}
                    className="rounded-md border bg-card p-2 text-xs"
                  >
                    {renderWithHighlights(card.title)}
                  </div>
                ))}
              {list.cards.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-2">No cards</p>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}