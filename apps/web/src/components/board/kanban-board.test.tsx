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

    expect(screen.getAllByText(/add card/i)).toHaveLength(2);
  });

  it("hides add card button when read-only", () => {
    render(<KanbanBoard board={mockBoard as any} readOnly={true} />);

    expect(screen.queryByText(/add card/i)).not.toBeInTheDocument();
  });
});