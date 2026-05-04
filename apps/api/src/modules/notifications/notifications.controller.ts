import { Controller, Get, Patch, Post, Param, Query } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("notifications")
export class NotificationsController {
  constructor(private notifService: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query("unreadOnly") unreadOnly?: string) {
    return this.notifService.findByUser(user.id, { unreadOnly: unreadOnly === "true" });
  }

  @Get("unread-count")
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notifService.getUnreadCount(user.id);
    return { count };
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string) {
    return this.notifService.markAsRead(id);
  }

  @Post("mark-all-read")
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notifService.markAllAsRead(user.id);
    return { success: true };
  }
}