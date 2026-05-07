import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing the service
vi.mock("../../database/connection", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
    },
  };
});

import { BoardMembersService } from "./board-members.service";
import { db } from "../../database/connection";

describe("BoardMembersService", () => {
  let service: BoardMembersService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BoardMembersService();
  });

  /** for queries WITH .limit() (isMember) */
  function setupSelectWithLimit(result: any[]) {
    const limitFn = vi.fn().mockResolvedValue(result);
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const innerJoinFn = vi.fn().mockReturnValue({ where: whereFn });
    const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoinFn, where: whereFn });
    (db.select as any).mockReturnValue({ from: fromFn });
    return { limitFn, whereFn, innerJoinFn, fromFn };
  }

  /** for queries WITHOUT .limit() (findByBoard) */
  function setupSelectNoLimit(result: any[]) {
    const limitFn = vi.fn().mockResolvedValue(result);
    const whereFn = vi.fn().mockReturnValue({
      // Make the returned object thenable so `await` works directly
      then: (onFulfilled: any) => limitFn().then(onFulfilled),
      // Also provide limit for compatibility
      limit: limitFn,
    });
    const innerJoinFn = vi.fn().mockReturnValue({ where: whereFn });
    const fromFn = vi.fn().mockReturnValue({ innerJoin: innerJoinFn, where: whereFn });
    (db.select as any).mockReturnValue({ from: fromFn });
    return { limitFn, whereFn, innerJoinFn, fromFn };
  }

  function setupInsertReturning(result: any[]) {
    const returning2 = vi.fn().mockResolvedValue(result);
    const onConflict = vi.fn().mockReturnValue({ returning: returning2 });
    const valuesFn = vi.fn().mockReturnValue({ onConflictDoNothing: onConflict });
    const mockInsert = vi.fn().mockReturnValue({ values: valuesFn });
    (db.insert as any) = mockInsert;
    return { returning2, onConflict, valuesFn, mockInsert };
  }

  function setupDelete() {
    const whereFn = vi.fn().mockResolvedValue(undefined);
    const mockDelete = vi.fn().mockReturnValue({ where: whereFn });
    (db.delete as any) = mockDelete;
    return { whereFn, mockDelete };
  }

  it("findByBoard returns members with user details", async () => {
    setupSelectNoLimit([
      { boardId: "b1", userId: "u1", addedAt: new Date(), userEmail: "a@a.com", userDisplayName: "Alice" },
    ]);
    const result = await service.findByBoard("b1");
    expect(result).toHaveLength(1);
    expect(result[0].userDisplayName).toBe("Alice");
  });

  it("add inserts a new member", async () => {
    setupInsertReturning([{ boardId: "b1", userId: "u2", addedAt: new Date() }]);
    const result = await service.add("b1", "u2");
    expect(result?.boardId).toBe("b1");
  });

  it("add is idempotent", async () => {
    setupInsertReturning([]);
    await service.add("b1", "u2");
    await service.add("b1", "u2");
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("remove deletes the member", async () => {
    const { whereFn } = setupDelete();
    await service.remove("b1", "u2");
    expect(whereFn).toHaveBeenCalled();
  });

  it("isMember returns true when found", async () => {
    setupSelectWithLimit([{ boardId: "b1" }]);
    expect(await service.isMember("b1", "u2")).toBe(true);
  });

  it("isMember returns false when not found", async () => {
    setupSelectWithLimit([]);
    expect(await service.isMember("b1", "u3")).toBe(false);
  });

  it("addCreator calls add with boardId and creatorId", async () => {
    setupInsertReturning([{ boardId: "b1", userId: "u1", addedAt: new Date() }]);
    const result = await service.addCreator("b1", "u1");
    expect(result?.boardId).toBe("b1");
    expect(result?.userId).toBe("u1");
  });
});
