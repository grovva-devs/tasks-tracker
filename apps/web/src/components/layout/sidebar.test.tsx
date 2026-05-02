import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/boards",
}));

describe("Sidebar", () => {
  it("renders all navigation items", () => {
    render(<Sidebar />);

    expect(screen.getByText("Boards")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights the active navigation item", () => {
    render(<Sidebar />);

    const boardsLink = screen.getByText("Boards").closest("a");
    expect(boardsLink?.className).toContain("bg-accent");
  });

  it("renders company name from settings", () => {
    render(<Sidebar companyName="Test Co" />);
    expect(screen.getByText("Test Co")).toBeInTheDocument();
  });
});