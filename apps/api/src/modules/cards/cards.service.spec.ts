import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before importing the service
vi.mock("../../database/connection", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  };
});

// Mock EventEmitter2
vi.mock("@nestjs/event-emitter", () => ({
  EventEmitter2: vi.fn().mockImplementation(() => ({
    emitAsync: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { CardsService } from "./cards.service";
import { db } from "../../database/connection";
import { EventEmitter2 } from "@nestjs/event-emitter";

describe("CardsService", () => {
  let service: CardsService;
  let eventEmitter: EventEmitter2;

  beforeEach(() => {
    vi.clearAllMocks();
    eventEmitter = new EventEmitter2();
    service = new CardsService(eventEmitter);
  });

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

  it("addAssignee inserts a card assignee and emits CARD_ASSIGNED event", async () => {
    const { valuesFn } = setupInsertReturning([{ cardId: "c1", userId: "u1", assignedAt: new Date() }]);
    const result = await service.addAssignee("c1", "u1");
    expect(result?.cardId).toBe("c1");
    expect(result?.userId).toBe("u1");
    expect(valuesFn).toHaveBeenCalledWith({ cardId: "c1", userId: "u1" });
    expect(eventEmitter.emitAsync).toHaveBeenCalledWith("card.assigned", {
      cardId: "c1",
      userId: "u1",
    });
  });

  it("addAssignee is idempotent via onConflictDoNothing", async () => {
    setupInsertReturning([]);
    await service.addAssignee("c1", "u1");
    await service.addAssignee("c1", "u1");
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("removeAssignee deletes the assignee", async () => {
    const { whereFn } = setupDelete();
    await service.removeAssignee("c1", "u1");
    expect(whereFn).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalled();
  });
});
