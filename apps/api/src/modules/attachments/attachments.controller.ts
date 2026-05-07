import { Controller, Get, Post, Delete, Param, Body, UseGuards, ForbiddenException } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CardMemberGuard } from "../../common/guards/card-member.guard";
import { AttachmentsService } from "./attachments.service";

@Controller("cards/:cardId/attachments")
@UseGuards(CardMemberGuard)
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
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.attachmentsService.remove(id, user.id, user.role);
    return { success: true };
  }
}