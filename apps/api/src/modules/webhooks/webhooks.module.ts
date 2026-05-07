import { Module } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { WebhooksController } from "./webhooks.controller";
import { WebhookSender } from "../notifications/webhook.sender";
import { WebhookDeliveryService } from "../notifications/webhook-delivery.service";

@Module({
  providers: [WebhooksService, WebhookSender, WebhookDeliveryService],
  controllers: [WebhooksController],
  exports: [WebhooksService],
})
export class WebhooksModule {}