import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../../database/connection";
import { cards, lists, cardAssignees } from "../../../database/schema";
import { lt, isNull, and, eq, inArray } from "drizzle-orm";
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
          dueDate: cards.dueDate as any,
        })
        .from(cards)
        .innerJoin(lists, eq(cards.listId, lists.id))
        .where(and(lt(cards.dueDate as any, today), isNull(cards.completedAt)));

      if (overdueCards.length === 0) {
        this.logger.log("No overdue cards found");
        return;
      }

      // Fix N+1: batch fetch all assignees at once using inArray
      const cardIds = overdueCards.map((c) => c.cardId);
      const allAssignees = await db
        .select({ cardId: cardAssignees.cardId, userId: cardAssignees.userId })
        .from(cardAssignees)
        .where(inArray(cardAssignees.cardId, cardIds));

      // Build a map of cardId -> assigneeIds
      const assigneesByCard = new Map<string, string[]>();
      for (const a of allAssignees) {
        const arr = assigneesByCard.get(a.cardId) ?? [];
        arr.push(a.userId);
        assigneesByCard.set(a.cardId, arr);
      }

      for (const card of overdueCards) {
        try {
          const assigneeIds = assigneesByCard.get(card.cardId) ?? [];
          this.eventEmitter.emitAsync(EVENTS.CARD_OVERDUE, {
            cardId: card.cardId,
            cardTitle: card.cardTitle,
            boardId: card.boardId,
            assigneeIds,
            dueDate: card.dueDate,
          }).catch((err: Error) => {
            this.logger.error(`Failed to emit card.overdue event: ${err.message}`);
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