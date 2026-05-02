import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "../notifications.service";
import { EmailSender } from "../email.sender";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class BoardEventsListener {
  private readonly logger = new Logger(BoardEventsListener.name);

  constructor(
    private notifService: NotificationsService,
    private emailSender: EmailSender,
  ) {}

  @OnEvent(EVENTS.BOARD_CREATED)
  async handleBoardCreated(payload: { boardId: string; boardTitle: string; createdBy: string; teamMemberIds: string[] }): Promise<void> {
    try {
      this.logger.log(`Board created: ${payload.boardTitle}`);
      const notifyIds = payload.teamMemberIds.filter((id) => id !== payload.createdBy);
      if (notifyIds.length > 0) {
        await this.notifService.createForUsers(notifyIds, EVENTS.BOARD_CREATED, `New board "${payload.boardTitle}" created`, { boardId: payload.boardId });
      }
    } catch (error) {
      this.logger.error(`Failed to handle board.created: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  @OnEvent(EVENTS.BOARD_COMPLETED)
  async handleBoardCompleted(payload: { boardId: string; boardTitle: string; clientEmail: string | null; clientName: string; completedBy: string; teamMemberIds: string[]; publicToken?: string }): Promise<void> {
    try {
      this.logger.log(`Board completed: ${payload.boardTitle}`);
      await this.notifService.createForUsers(payload.teamMemberIds, EVENTS.BOARD_COMPLETED, `Board "${payload.boardTitle}" completed!`, { boardId: payload.boardId });
      if (payload.clientEmail) {
        await this.emailSender.sendBoardCompletionEmail(payload.clientEmail, payload.clientName, payload.boardTitle, payload.publicToken).catch((err: Error) => {
          this.logger.error(`Failed to send board completion email: ${err.message}`);
        });
      }
    } catch (error) {
      this.logger.error(`Failed to handle board.completed: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}