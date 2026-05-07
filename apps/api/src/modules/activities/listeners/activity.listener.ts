import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EVENTS } from "@onboarding-tracker/shared";
import { ActivitiesService } from "../activities.service";

interface ActivityPayload {
  boardId: string;
  cardId?: string;
  userId?: string;
  cardTitle?: string;
  listTitle?: string;
  assigneeId?: string;
  dueDate?: string;
  [key: string]: unknown;
}

@Injectable()
export class ActivityListener {
  private readonly logger = new Logger(ActivityListener.name);

  constructor(private activitiesService: ActivitiesService) {}

  private async record(
    action: string,
    payload: ActivityPayload,
    description?: string,
  ) {
    try {
      if (!payload.userId) return;
      await this.activitiesService.create({
        boardId: payload.boardId,
        cardId: payload.cardId,
        userId: payload.userId,
        action,
        description: description ?? null,
      });
    } catch (err) {
      this.logger.error(`Failed to record activity ${action}: ${(err as Error).message}`);
    }
  }

  @OnEvent(EVENTS.BOARD_CREATED)
  async onBoardCreated(payload: ActivityPayload) {
    await this.record("board.created", payload, `Board created`);
  }

  @OnEvent(EVENTS.CARD_CREATED)
  async onCardCreated(payload: ActivityPayload) {
    await this.record("card.created", payload, `Card "${payload.cardTitle}" created`);
  }

  @OnEvent(EVENTS.CARD_MOVED)
  async onCardMoved(payload: ActivityPayload) {
    await this.record("card.moved", payload, `Card "${payload.cardTitle}" moved to "${payload.listTitle}"`);
  }

  @OnEvent(EVENTS.CARD_COMPLETED)
  async onCardCompleted(payload: ActivityPayload) {
    await this.record("card.completed", payload, `Card "${payload.cardTitle}" completed`);
  }

  @OnEvent(EVENTS.CARD_ASSIGNED)
  async onCardAssigned(payload: ActivityPayload) {
    await this.record("card.assigned", payload, `Card "${payload.cardTitle}" assigned`);
  }

  @OnEvent(EVENTS.BOARD_COMPLETED)
  async onBoardCompleted(payload: ActivityPayload) {
    await this.record("board.completed", payload, `Board completed`);
  }
}
