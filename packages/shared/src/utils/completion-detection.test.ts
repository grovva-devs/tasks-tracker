import { describe, it, expect } from "vitest";
import { isCompletionList } from "./completion-detection";

describe("isCompletionList", () => {
  it("detects 'Done' as completion list", () => {
    expect(isCompletionList("Done")).toBe(true);
  });

  it("detects 'done' (lowercase)", () => {
    expect(isCompletionList("done")).toBe(true);
  });

  it("detects 'Completed' as completion list", () => {
    expect(isCompletionList("Completed")).toBe(true);
  });

  it("detects 'Concluído' (Portuguese)", () => {
    expect(isCompletionList("Concluído")).toBe(true);
  });

  it("detects 'Concluido' (no accent)", () => {
    expect(isCompletionList("Concluido")).toBe(true);
  });

  it("detects 'Finalizado' (Portuguese)", () => {
    expect(isCompletionList("Finalizado")).toBe(true);
  });

  it("detects substring in longer title like 'All Done Tasks'", () => {
    expect(isCompletionList("All Done Tasks")).toBe(true);
  });

  it("does NOT match 'Pending' as completion", () => {
    expect(isCompletionList("Pending")).toBe(false);
  });

  it("does NOT match 'In Progress' as completion", () => {
    expect(isCompletionList("In Progress")).toBe(false);
  });

  it("handles whitespace", () => {
    expect(isCompletionList("  Done  ")).toBe(true);
  });

  it("handles empty string", () => {
    expect(isCompletionList("")).toBe(false);
  });
});