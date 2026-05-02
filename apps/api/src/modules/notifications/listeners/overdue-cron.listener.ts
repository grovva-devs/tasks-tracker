import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../../database/connection";
import { cards, lists, cardAssignees } from "../../../database/schema";
import { eq, lt, isNull, and } from "drizzle-orm";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class OverdueCronListener {
  private readonly logger = new Logger(OverdueCronListener.name);

  constructor(private eventEmitter: EventEmitter2) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkOverdueCards(): Promise<void> {
    try {
      this.logger.log("Checking for overdue cards...");
      const today = new Date().toISOString().split("T")[0];

      const overdueCards = await db
        .select({
          cardId: cards.id,
          cardTitle: cards.title,
          boardId: lists.boardId,
          dueDate: cards.dueDate,
        })
        .from(cards)
        .innerJoin(lists, eq(cards.listId, lists.id))
        .where(and(lt(cards.dueDate, today), isNull(cards.completedAt)));

      for (const card of overdueCards) {
        try {
          const assignees = await db
            .select({ userId: cardAssignees.userId })
            .from(cardAssignees)
            .where(eq(cardAssignees.cardId, card.cardId));

          this.eventEmitter.emit(EVENTS.CARD_OVERDUE, {
            cardId: card.cardId,
            cardTitle: card.cardTitle,
            boardId: card.boardId,
            assigneeIds: assignees.map((a) => a.userId),
            dueDate: card.dueDate,
          });
        } catch (error) {
          this.logger.error(`Failed to process overdue card ${card.cardId}: ${(error as Error).message}`);
        }
      }

      this.logger.log(`Found ${overdueCards.length} overdue cards`);
    } catch (error) {
      this.logger.error(`Failed to check overdue cards: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}