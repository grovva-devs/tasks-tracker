import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { LabelsService } from "./labels.service";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("boards/:boardId/labels")
@UseGuards(BoardMemberGuard)
export class LabelsController {
  constructor(private labelsService: LabelsService) {}

  @Post()
  async create(
    @Param("boardId") boardId: string,
    @Body() body: { name: string; color: string },
  ) {
    return this.labelsService.create(boardId, body);
  }

  @Get()
  async findAll(@Param("boardId") boardId: string) {
    return this.labelsService.findByBoard(boardId);
  }

  @Patch(":id")
  async update(
    @Param("boardId") boardId: string,
    @Param("id") id: string,
    @Body() body: { name?: string; color?: string },
  ) {
    return this.labelsService.update(id, boardId, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.labelsService.remove(id, user.id);
    return { success: true };
  }

  @Post("cards/:cardId/labels/:labelId")
  async addCardLabel(
    @Param("cardId") cardId: string,
    @Param("labelId") labelId: string,
  ) {
    await this.labelsService.addCardLabel(cardId, labelId);
    return { success: true };
  }

  @Delete("cards/:cardId/labels/:labelId")
  async removeCardLabel(
    @Param("cardId") cardId: string,
    @Param("labelId") labelId: string,
  ) {
    await this.labelsService.removeCardLabel(cardId, labelId);
    return { success: true };
  }
}
