import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardEventsListener } from "./board-events.listener";
import { NotificationsService } from "../notifications.service";
import { EmailSender } from "../email.sender";

describe("BoardEventsListener", () => {
  let listener: BoardEventsListener;
  let notifService: any;
  let emailSender: any;

  beforeEach(() => {
    notifService = { createForUsers: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({}) };
    emailSender = { sendBoardCompletionEmail: vi.fn().mockResolvedValue(true) };
    // @ts-expect-error - manual construction for unit test
    listener = new BoardEventsListener(notifService, emailSender);
  });

  it("creates in-app notifications for team on board.completed", async () => {
    await listener.handleBoardCompleted({
      boardId: "b1",
      boardTitle: "Acme",
      clientEmail: null,
      clientName: "Acme",
      completedBy: "u1",
      teamMemberIds: ["u1", "u2", "u3"],
    });

    expect(notifService.createForUsers).toHaveBeenCalledWith(
      ["u1", "u2", "u3"],
      "board.completed",
      'Board "Acme" completed!',
      { boardId: "b1" },
    );
  });

  it("sends email to client on board.completed", async () => {
    await listener.handleBoardCompleted({
      boardId: "b1",
      boardTitle: "Acme",
      clientEmail: "c@acme.com",
      clientName: "Acme",
      completedBy: "u1",
      teamMemberIds: ["u1"],
    });
    expect(emailSender.sendBoardCompletionEmail).toHaveBeenCalledWith("c@acme.com", "Acme", "Acme", undefined);
  });

  it("notifies team (excluding creator) on board.created", async () => {
    await listener.handleBoardCreated({ boardId: "b1", boardTitle: "New", createdBy: "u1", teamMemberIds: ["u1", "u2"] });
    expect(notifService.createForUsers).toHaveBeenCalledWith(
      ["u2"],
      "board.created",
      'New board "New" created',
      { boardId: "b1" },
    );
  });
});