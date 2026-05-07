import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { WebhookSender } from "../notifications/webhook.sender";
import { CreateWebhookDto, UpdateWebhookDto } from "../../common/dto/webhooks.dto";

@Roles("admin")
@Controller("webhooks")
export class WebhooksController {
  constructor(
    private webhooksService: WebhooksService,
    private webhookSender: WebhookSender,
  ) {}

  @Get()
  async findAll() {
    return this.webhooksService.findAll();
  }

  @Post()
  async create(@Body() body: CreateWebhookDto, @CurrentUser() user: any) {
    return this.webhooksService.create({ url: body.url, events: body.events, createdBy: user.id });
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateWebhookDto) {
    if (body.isActive !== undefined) {
      return this.webhooksService.toggleActive(id, body.isActive);
    }
    return this.webhooksService.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.webhooksService.remove(id, user.id);
    return { success: true };
  }

  @Post(":id/test")
  async test(@Param("id") id: string) {
    const webhook = await this.webhooksService.findOne(id);
    if (!webhook) return { success: false, error: "Not found" };
    try {
      await this.webhookSender.send(webhook.url, webhook.secret, { event: "webhook.test", timestamp: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}