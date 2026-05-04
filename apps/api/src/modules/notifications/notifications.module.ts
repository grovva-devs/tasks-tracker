import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { EmailSender } from "./email.sender";
import { WebhookSender } from "./webhook.sender";
import { EMAIL_SENDER } from "./tokens/email-sender.token";
import { WEBHOOK_SENDER } from "./tokens/webhook-sender.token";
import { BoardEventsListener } from "./listeners/board-events.listener";
import { CardEventsListener } from "./listeners/card-events.listener";
import { OverdueCronListener } from "./listeners/overdue-cron.listener";

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  providers: [
    NotificationsService,
    { provide: EMAIL_SENDER, useClass: EmailSender },
    { provide: WEBHOOK_SENDER, useClass: WebhookSender },
    EmailSender,
    WebhookSender,
    BoardEventsListener,
    CardEventsListener,
    OverdueCronListener,
  ],
  controllers: [NotificationsController],
  exports: [NotificationsService, EMAIL_SENDER, WEBHOOK_SENDER],
})
export class NotificationsModule {}