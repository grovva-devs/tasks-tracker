import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { EmailSender } from "./email.sender";
import { WebhookSender } from "./webhook.sender";
import { BoardEventsListener } from "./listeners/board-events.listener";
import { CardEventsListener } from "./listeners/card-events.listener";
import { OverdueCronListener } from "./listeners/overdue-cron.listener";

@Module({
  imports: [EventEmitterModule.forRoot(), ScheduleModule.forRoot()],
  providers: [NotificationsService, EmailSender, WebhookSender, BoardEventsListener, CardEventsListener, OverdueCronListener],
  controllers: [NotificationsController],
  exports: [NotificationsService, WebhookSender],
})
export class NotificationsModule {}