import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../database/connection", () => ({
  db: { select: vi.fn() },
}));

import { CardMemberGuard } from "./card-member.guard";
import { db } from "../../database/connection";

describe("CardMemberGuard", () => {
  let guard: CardMemberGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new CardMemberGuard();
  });

  function makeContext(user: { id: string; role: string }, params: Record<string, string> = {}) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as any;
  }

  function setupCardQuery(card: any | null) {
    const limitFn = vi.fn().mockResolvedValue(card ? [card] : []);
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    (db.select as any).mockReturnValue({ from: fromFn });
    return { limitFn, whereFn, fromFn };
  }

  function setupBoardQuery(board: any | null) {
    const limitFn = vi.fn().mockResolvedValue(board ? [board] : []);
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    // Second call to db.select is for board lookup
    let callCount = 0;
    (db.select as any).mockImplementation(() => {
      callCount++;
      if (callCount === 1) return { from: fromFn }; // card query
      return { from: fromFn }; // board query
    });
    return { limitFn };
  }

  it("allows access if user is the card's board creator", async () => {
    setupCardQuery({ id: "c1", boardId: "b1" });
    setupBoardQuery({ id: "b1", createdBy: "u1", hasAccess: true });
    const ctx = makeContext({ id: "u1", role: "member" }, { id: "c1" });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("allows access if user is admin", async () => {
    setupCardQuery({ id: "c1", boardId: "b1" });
    setupBoardQuery({ id: "b1", createdBy: "u-other", hasAccess: true });
    const ctx = makeContext({ id: "u1", role: "admin" }, { id: "c1" });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("denies access if user is not member of card's board", async () => {
    setupCardQuery({ id: "c1", boardId: "b1" });
    setupBoardQuery({ id: "b1", createdBy: "u-other", hasAccess: false });
    const ctx = makeContext({ id: "u1", role: "member" }, { id: "c1" });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it("throws NotFound if card does not exist", async () => {
    setupCardQuery(null);
    const ctx = makeContext({ id: "u1", role: "member" }, { id: "nonexistent" });
    await expect(guard.canActivate(ctx)).rejects.toThrow("Card not found");
  });

  it("allows access when no card id param (skips check)", async () => {
    const ctx = makeContext({ id: "u1", role: "member" }, {});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
