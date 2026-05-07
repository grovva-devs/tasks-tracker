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

import { LabelsService } from "./labels.service";
import { db } from "../../database/connection";

describe("LabelsService", () => {
  let service: LabelsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LabelsService();
  });

  function setupInsertReturning(result: any[], options?: { onConflictDoNothing: boolean }) {
    const returning2 = vi.fn().mockResolvedValue(result);
    const onConflict = options?.onConflictDoNothing 
      ? vi.fn().mockReturnValue({ returning: returning2 })
      : undefined;
    const valuesFn = onConflict
      ? vi.fn().mockReturnValue({ onConflictDoNothing: onConflict })
      : vi.fn().mockReturnValue({ returning: returning2 });
    const mockInsert = vi.fn().mockReturnValue({ values: valuesFn });
    (db.insert as any) = mockInsert;
    return { returning2, valuesFn, mockInsert, onConflict };
  }

  function setupUpdateReturning(result: any[]) {
    const returning2 = vi.fn().mockResolvedValue(result);
    const whereFn = vi.fn().mockReturnValue({ returning: returning2 });
    const setFn = vi.fn().mockReturnValue({ where: whereFn });
    const mockUpdate = vi.fn().mockReturnValue({ set: setFn });
    (db.update as any) = mockUpdate;
    return { returning2, setFn, whereFn, mockUpdate };
  }

  function setupDelete() {
    const whereFn = vi.fn().mockResolvedValue(undefined);
    const mockDelete = vi.fn().mockReturnValue({ where: whereFn });
    (db.delete as any) = mockDelete;
    return { whereFn, mockDelete };
  }

  function setupSelectSequence(results: any[][]) {
    let callIndex = 0;
    const limitFn = vi.fn().mockImplementation(() => {
      const result = results[callIndex] ?? [];
      callIndex++;
      return Promise.resolve(result);
    });
    const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    (db.select as any).mockReturnValue({ from: fromFn });
    return { limitFn, whereFn, fromFn };
  }

  it("create inserts a label", async () => {
    setupInsertReturning([{ id: "l1", boardId: "b1", name: "Bug", color: "#ff0000" }]);
    const result = await service.create("b1", { name: "Bug", color: "#ff0000" });
    expect(result?.name).toBe("Bug");
  });

  it("update modifies a label", async () => {
    setupUpdateReturning([{ id: "l1", name: "Fixed", color: "#00ff00" }]);
    const result = await service.update("l1", "b1", { name: "Fixed", color: "#00ff00" });
    expect(result?.name).toBe("Fixed");
  });

  it("remove soft-deletes a label", async () => {
    const { whereFn } = setupUpdateReturning([{ id: "l1", deletedAt: new Date(), deletedBy: "u1" }]);
    await service.remove("l1", "u1");
    expect(whereFn).toHaveBeenCalled();
  });

  it("addCardLabel inserts a card label after verifying same board", async () => {
    setupSelectSequence([
      [{ boardId: "b1" }],  // card query
      [{ boardId: "b1" }],  // label query
    ]);
    const { valuesFn } = setupInsertReturning([{ cardId: "c1", labelId: "l1" }], { onConflictDoNothing: true });
    await service.addCardLabel("c1", "l1");
    expect(valuesFn).toHaveBeenCalledWith({ cardId: "c1", labelId: "l1" });
  });

  it("addCardLabel rejects label from different board", async () => {
    setupSelectSequence([
      [{ boardId: "b1" }],  // card query
      [{ boardId: "b2" }],  // label query — different board!
    ]);
    await expect(service.addCardLabel("c1", "l1")).rejects.toThrow("Label does not belong");
  });

  it("removeCardLabel deletes only the specific card-label pair", async () => {
    const { whereFn } = setupDelete();
    await service.removeCardLabel("c1", "l1");
    expect(whereFn).toHaveBeenCalled();
    // Verify it was called with the AND condition (we check by ensuring delete was called)
    expect(db.delete).toHaveBeenCalled();
  });
});
