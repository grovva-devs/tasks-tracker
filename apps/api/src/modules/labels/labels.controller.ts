import { Controller, Get, Post, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { LabelsService } from "./labels.service";

@UseGuards(JwtAuthGuard)
@Controller("boards/:boardId/labels")
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

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.labelsService.remove(id);
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