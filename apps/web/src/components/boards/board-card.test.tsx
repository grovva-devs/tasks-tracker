import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardCard } from "./board-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BoardCard", () => {
  const board = {
    id: "b1",
    title: "Acme Onboarding",
    clientName: "Acme Corp",
    status: "active",
    slug: "acme-onboarding",
    publicToken: "tok123",
    createdAt: "2025-04-30T10:00:00Z",
  };

  it("renders board title and client name", () => {
    render(<BoardCard board={board} />);

    expect(screen.getByText("Acme Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows active status badge", () => {
    render(<BoardCard board={board} />);

    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows completion percentage when stats provided", () => {
    render(<BoardCard board={board} stats={{ totalCards: 10, completedCards: 7, completionPercentage: 70 }} />);

    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("renders a link to the board detail page", () => {
    render(<BoardCard board={board} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/boards/b1");
  });
});