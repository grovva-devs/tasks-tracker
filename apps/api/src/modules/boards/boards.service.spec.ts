import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing the service
vi.mock("../../database/connection", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

// Mock EventEmitter2
vi.mock("@nestjs/event-emitter", () => ({
  EventEmitter2: vi.fn().mockImplementation(() => ({
    emitAsync: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { BoardsService } from "./boards.service";
import { db } from "../../database/connection";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("BoardsService", () => {
  let service: BoardsService;

  beforeEach(() => {
    vi.clearAllMocks();
    const eventEmitter = new EventEmitter2();
    service = new BoardsService(eventEmitter);
  });

  function setupUpdateReturning(result: any[]) {
    const returning2 = vi.fn().mockResolvedValue(result);
    const whereFn = vi.fn().mockReturnValue({ returning: returning2 });
    const setFn = vi.fn().mockReturnValue({ where: whereFn });
    const mockUpdate = vi.fn().mockReturnValue({ set: setFn });
    (db.update as any) = mockUpdate;
    return { returning2, whereFn, setFn, mockUpdate };
  }

  function setupSelectWithLimit(result: any[]) {
    const limitFn = vi.fn().mockResolvedValue(result);
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    (db.select as any).mockReturnValue({ from: fromFn });
    return { limitFn, whereFn, fromFn };
  }

  it("archive sets status to archived", async () => {
    setupUpdateReturning([{ id: "b1", status: "archived" }]);
    const result = await service.archive("b1", "u1");
    expect(result?.status).toBe("archived");
  });

  it("softDelete sets deletedAt and deletedBy", async () => {
    const { setFn } = setupUpdateReturning([{ id: "b1", deletedAt: new Date(), deletedBy: "u1" }]);
    const result = await service.softDelete("b1", "u1");
    expect(result?.deletedBy).toBe("u1");
    expect(setFn).toHaveBeenCalled();
  });

  it("findOne throws NotFoundException for soft-deleted board", async () => {
    setupSelectWithLimit([
      { id: "b1", title: "Test", deletedAt: new Date(), deletedBy: "u1" },
    ]);
    await expect(service.findOne("b1")).rejects.toThrow("Board not found");
  });
});
