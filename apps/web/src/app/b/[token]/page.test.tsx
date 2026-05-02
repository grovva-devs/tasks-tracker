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

vi.mock("@/providers/query-provider", () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
    expect(screen.queryByText(/add card/i)).not.toBeInTheDocument();
  });
});