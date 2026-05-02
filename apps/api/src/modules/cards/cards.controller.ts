import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CardsService } from "./cards.service";

@UseGuards(JwtAuthGuard)
@Controller()
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Post("lists/:listId/cards")
  async create(
    @Param("listId") listId: string,
    @Body() body: { title: string; description?: string; dueDate?: string; boardId: string },
  ) {
    return this.cardsService.create(listId, body.boardId, body);
  }

  @Get("cards/:id")
  async findOne(@Param("id") id: string) {
    return this.cardsService.findOne(id);
  }

  @Get("cards/:id/detail")
  async findDetail(@Param("id") id: string) {
    return this.cardsService.findDetail(id);
  }

  @Patch("cards/:id")
  async update(@Param("id") id: string, @Body() body: any) {
    return this.cardsService.update(id, body);
  }

  @Patch("cards/:id/move")
  async move(@Param("id") id: string, @Body() body: { listId: string; position: number }) {
    return this.cardsService.moveCard(id, body.listId, body.position);
  }

  @Delete("cards/:id")
  async remove(@Param("id") id: string) {
    await this.cardsService.remove(id);
    return { success: true };
  }

  @Patch("lists/:listId/cards/reorder")
  async reorder(
    @Param("listId") listId: string,
    @Body() body: { items: { id: string; position: number }[] },
  ) {
    await this.cardsService.reorder(listId, body.items);
    return { success: true };
  }
}