import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "../notifications.service";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class CardEventsListener {
  private readonly logger = new Logger(CardEventsListener.name);

  constructor(private notifService: NotificationsService) {}

  @OnEvent(EVENTS.CARD_ASSIGNED)
  async handleCardAssigned(payload: { cardId: string; cardTitle: string; assigneeId: string; boardId: string; assignerId: string }): Promise<void> {
    try {
      this.logger.log(`Card assigned: ${payload.cardTitle}`);
      if (payload.assigneeId !== payload.assignerId) {
        await this.notifService.create({
          userId: payload.assigneeId,
          type: EVENTS.CARD_ASSIGNED,
          title: `Card "${payload.cardTitle}" assigned to you`,
          boardId: payload.boardId,
          cardId: payload.cardId,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to handle card.assigned: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  @OnEvent(EVENTS.CARD_COMPLETED)
  async handleCardCompleted(payload: { cardId: string; cardTitle: string; boardId: string; completedBy: string; listTitle: string }): Promise<void> {
    try {
      this.logger.log(`Card completed: ${payload.cardTitle}`);
      await this.notifService.create({
        userId: payload.completedBy,
        type: EVENTS.CARD_COMPLETED,
        title: `Card "${payload.cardTitle}" completed`,
        boardId: payload.boardId,
        cardId: payload.cardId,
        message: `Moved to "${payload.listTitle}"`,
      });
    } catch (error) {
      this.logger.error(`Failed to handle card.completed: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  @OnEvent(EVENTS.CARD_OVERDUE)
  async handleCardOverdue(payload: { cardId: string; cardTitle: string; boardId: string; assigneeIds: string[]; dueDate: string }): Promise<void> {
    try {
      this.logger.warn(`Card overdue: ${payload.cardTitle}`);
      if (payload.assigneeIds.length > 0) {
        await this.notifService.createForUsers(payload.assigneeIds, EVENTS.CARD_OVERDUE, `Card "${payload.cardTitle}" is overdue`, {
          boardId: payload.boardId,
          cardId: payload.cardId,
          message: `Due: ${payload.dueDate}`,
        });
      }
    } catch (error) {
      this.logger.error(`Failed to handle card.overdue: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}