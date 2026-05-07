import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { db } from "../../../database/connection";
import { cards } from "../../../database/schema";
import { eq, and, sql } from "drizzle-orm";
import { EVENTS } from "@onboarding-tracker/shared";

@Injectable()
export class DueSoonCronListener {
  private readonly logger = new Logger(DueSoonCronListener.name);

  constructor(private eventEmitter: EventEmitter2) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async checkDueSoonCards(): Promise<void> {
    try {
      this.logger.log("Checking for cards due in 3 days...");

      const today = new Date();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(today.getDate() + 3);
      const todayStr = today.toISOString().split("T")[0];
      const futureStr = threeDaysFromNow.toISOString().split("T")[0];

      const dueSoonCards = await db
        .select({
          id: cards.id,
          title: cards.title,
          boardId: cards.boardId,
          dueDate: cards.dueDate,
          dueSoonNotifiedAt: cards.dueSoonNotifiedAt,
        })
        .from(cards)
        .where(and(
          sql`${cards.dueDate} IS NOT NULL`,
          sql`${cards.completedAt} IS NULL`,
          sql`${cards.deletedAt} IS NULL`,
          sql`${cards.dueDate} >= ${todayStr}`,
          sql`${cards.dueDate} <= ${futureStr}`,
          sql`${cards.dueSoonNotifiedAt} IS NULL`,
        ));

      if (dueSoonCards.length === 0) {
        this.logger.log("No cards due in 3 days");
        return;
      }

      for (const card of dueSoonCards) {
        try {
          this.eventEmitter.emitAsync(EVENTS.CARD_DUE_SOON, {
            cardId: card.id,
            cardTitle: card.title,
            boardId: card.boardId,
            dueDate: card.dueDate,
          }).catch((err: Error) => {
            this.logger.error(`Failed to emit card.due_soon event: ${err.message}`);
          });

          // Mark as notified to avoid duplicate notifications
          await db
            .update(cards)
            .set({ dueSoonNotifiedAt: new Date() })
            .where(eq(cards.id, card.id));
        } catch (error) {
          this.logger.error(`Failed to process due-soon card ${card.id}: ${(error as Error).message}`);
        }
      }

      this.logger.log(`Found ${dueSoonCards.length} cards due in 3 days`);
    } catch (error) {
      this.logger.error(`Failed to check due-soon cards: ${(error as Error).message}`, (error as Error).stack);
    }
  }
}
