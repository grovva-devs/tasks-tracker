import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { EmailSender } from "./email.sender";
import { WebhookSender } from "./webhook.sender";
import { WebhookDeliveryService } from "./webhook-delivery.service";
import { EMAIL_SENDER } from "./tokens/email-sender.token";
import { WEBHOOK_SENDER } from "./tokens/webhook-sender.token";
import { BoardEventsListener } from "./listeners/board-events.listener";
import { CardEventsListener } from "./listeners/card-events.listener";
import { OverdueCronListener } from "./listeners/overdue-cron.listener";
import { DueSoonCronListener } from "./listeners/due-soon-cron.listener";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    NotificationsService,
    { provide: EMAIL_SENDER, useClass: EmailSender },
    { provide: WEBHOOK_SENDER, useClass: WebhookSender },
    EmailSender,
    WebhookSender,
    WebhookDeliveryService,
    BoardEventsListener,
    CardEventsListener,
    OverdueCronListener,
    DueSoonCronListener,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, EMAIL_SENDER, WEBHOOK_SENDER, WebhookDeliveryService],
})
export class NotificationsModule {}