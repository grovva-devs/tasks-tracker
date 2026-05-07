import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

// Mock db before importing the guard
vi.mock("../../database/connection", () => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  return { db: { select: mockSelect } };
});

import { BoardMemberGuard } from "./board-member.guard";
import { db } from "../../database/connection";

describe("BoardMemberGuard", () => {
  let guard: BoardMemberGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new BoardMemberGuard();
  });

  function makeContext(user: { id: string; role: string }, params: Record<string, string> = {}) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    } as any;
  }

  /** Setup mock for the unified single-query guard */
  function setupDbResult(result: any[]) {
    const limitFn = vi.fn().mockResolvedValue(result);
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    (db.select as any).mockReturnValue({ from: fromFn });
    return { limitFn, whereFn, fromFn };
  }

  it("allows access if user is the board creator", async () => {
    setupDbResult([{ id: "b1", createdBy: "u1", hasAccess: true }]);
    const ctx = makeContext({ id: "u1", role: "member" }, { id: "b1" });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("allows access if user is admin even when not creator", async () => {
    setupDbResult([{ id: "b1", createdBy: "u-other", hasAccess: true }]);
    const ctx = makeContext({ id: "u1", role: "admin" }, { id: "b1" });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("allows access if user is a board member (not creator)", async () => {
    setupDbResult([{ id: "b1", createdBy: "u-other", hasAccess: true }]);
    const ctx = makeContext({ id: "u1", role: "member" }, { id: "b1" });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("denies access if user is not creator, not admin, and not board member", async () => {
    setupDbResult([{ id: "b1", createdBy: "u-other", hasAccess: false }]);
    const ctx = makeContext({ id: "u1", role: "member" }, { id: "b1" });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("throws NotFoundException if board does not exist", async () => {
    setupDbResult([]);
    const ctx = makeContext({ id: "u1", role: "member" }, { id: "nonexistent" });
    await expect(guard.canActivate(ctx)).rejects.toThrow(NotFoundException);
  });

  it("allows access when no board id param (skips check)", async () => {
    const ctx = makeContext({ id: "u1", role: "member" }, {});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it("allows access when boardId param is present (uses boardId)", async () => {
    setupDbResult([{ id: "b1", createdBy: "u1", hasAccess: true }]);
    const ctx = makeContext({ id: "u1", role: "member" }, { boardId: "b1" });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
