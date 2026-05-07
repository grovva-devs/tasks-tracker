import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../database/connection", () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

import { ActivitiesService } from "./activities.service";
import { db } from "../../database/connection";
import { boardActivities } from "../../database/schema";

describe("ActivitiesService", () => {
  let service: ActivitiesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ActivitiesService();
  });

  function setupInsertReturning(result: any[]) {
    const returningFn = vi.fn().mockResolvedValue(result);
    const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
    const mockInsert = vi.fn().mockReturnValue({ values: valuesFn });
    (db.insert as any) = mockInsert;
    return { valuesFn, returningFn, mockInsert };
  }

  function setupSelectWithOrder(results: any[]) {
    const limitFn = vi.fn().mockReturnValue({ offset: vi.fn().mockResolvedValue(results) });
    const orderByFn = vi.fn().mockReturnValue({ limit: limitFn });
    const whereFn = vi.fn().mockReturnValue({ orderBy: orderByFn });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    const selectFn = vi.fn().mockReturnValue({ from: fromFn });
    (db.select as any) = selectFn;
    return { selectFn, fromFn, whereFn, orderByFn, limitFn };
  }

  it("create inserts an activity", async () => {
    const activity = { id: "a1", boardId: "b1", userId: "u1", action: "card.moved", description: null, createdAt: new Date() };
    setupInsertReturning([activity]);

    const result = await service.create({
      boardId: "b1",
      userId: "u1",
      action: "card.moved",
      description: "Card moved to Done",
    });

    expect(result).toBeDefined();
  });

  it("findByBoard returns activities for a board", async () => {
    const activities = [{ id: "a1", boardId: "b1", userId: "u1", action: "card.created", description: null, createdAt: new Date() }];
    setupSelectWithOrder(activities);

    const result = await service.findByBoard("b1", { limit: 20 });
    expect(result).toEqual(activities);
  });
});
