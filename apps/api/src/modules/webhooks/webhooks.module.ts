import { Module } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { WebhookSender } from "../notifications/webhook.sender";

@Module({
  providers: [WebhooksService, WebhookSender],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}