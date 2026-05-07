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
  assignees: [
    { userId: "u1", displayName: "Alice", email: "alice@example.com", avatarUrl: null },
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

  it("shows labels with correct names", () => {
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

    // Attachments tab count is visible
    expect(screen.getByText(/attachments/i)).toBeInTheDocument();
  });

  it("hides internal comments when in public/read-only mode", () => {
    render(<CardDetailPanel card={mockCard as any} isOpen={true} onClose={vi.fn()} readOnly={true} publicView={true} />);

    expect(screen.queryByText("Started working on this")).not.toBeInTheDocument();
    expect(screen.getByText("Client can see this")).toBeInTheDocument();
  });
});