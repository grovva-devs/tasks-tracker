import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsService } from "./notifications.service";
import { db } from "../../database/connection";

vi.mock("../../database/connection", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn(),
    limit: vi.fn(),
  },
}));

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - manual construction for unit test
    service = new NotificationsService();
  });

  it("creates an in-app notification", async () => {
    const mockReturning = vi.fn().mockResolvedValue([{ id: "n1", userId: "u1", type: "board.completed", isRead: false }]);
    (db.insert as any).mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) });

    const result = await service.create({ userId: "u1", type: "board.completed", title: "Board completed!", boardId: "b1" });
    expect(result.userId).toBe("u1");
    expect(result.isRead).toBe(false);
  });

  it("creates notifications for multiple users", async () => {
    const mockReturning = vi.fn().mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    (db.insert as any).mockReturnValue({ values: vi.fn().mockReturnValue({ returning: mockReturning }) });

    const result = await service.createForUsers(["u1", "u2"], "card.assigned", "Assigned", { cardId: "c1" });
    expect(result).toHaveLength(2);
  });

  it("finds notifications for a user", async () => {
    const mockOrderBy = vi.fn().mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    (db.select as any).mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ orderBy: mockOrderBy }) }) });

    const result = await service.findByUser("u1");
    expect(result).toHaveLength(2);
  });

  it("marks a notification as read", async () => {
    const mockReturning = vi.fn().mockResolvedValue([{ id: "n1", isRead: true }]);
    (db.update as any).mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) }) });

    const result = await service.markAsRead("n1");
    expect(result.isRead).toBe(true);
  });

  it("marks all as read for a user", async () => {
    const mockReturning = vi.fn().mockResolvedValue([{ id: "n1" }, { id: "n2" }]);
    (db.update as any).mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) }) });

    const result = await service.markAllAsRead("u1");
    expect(result).toHaveLength(2);
  });

  it("returns unread count", async () => {
    const mockFrom = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ count: 5 }]) });
    (db.select as any).mockReturnValue({ from: mockFrom });

    const result = await service.getUnreadCount("u1");
    expect(result).toBe(5);
  });
});