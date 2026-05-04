import { Controller, Get, Post, Delete, Param, Body } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AttachmentsService } from "./attachments.service";

@Controller("cards/:cardId/attachments")
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post()
  async create(
    @Param("cardId") cardId: string,
    @Body() body: { fileName: string; fileUrl: string; fileSize: number; mimeType: string; visibility: string },
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.create({
      cardId,
      ...body,
      uploadedBy: user.id,
    });
  }

  @Get()
  async findAll(@Param("cardId") cardId: string) {
    return this.attachmentsService.findByCard(cardId);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.attachmentsService.remove(id);
    return { success: true };
  }
}