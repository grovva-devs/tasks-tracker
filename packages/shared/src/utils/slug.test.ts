import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug";

describe("generateSlug", () => {
  it("converts to lowercase and replaces spaces with hyphens", () => {
    expect(generateSlug("My Board Name")).toBe("my-board-name");
  });

  it("removes special characters", () => {
    expect(generateSlug("Board #123! @Test")).toBe("board-123-test");
  });

  it("collapses multiple spaces/hyphens into single hyphen", () => {
    expect(generateSlug("A   B")).toBe("a-b");
  });

  it("trims hyphens from ends", () => {
    expect(generateSlug("  hello world  ")).toBe("hello-world");
  });

  it("handles accented characters by removing them", () => {
    expect(generateSlug("Cliente Especial")).toBe("cliente-especial");
  });

  it("returns empty string for input with no valid chars", () => {
    expect(generateSlug("@@@!!!")).toBe("");
  });
});