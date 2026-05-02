import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CardsService } from "./cards.service";
import { CreateCardDto, UpdateCardDto, MoveCardDto, ReorderCardsDto } from "../../common/dto/cards.dto";

@UseGuards(JwtAuthGuard)
@Controller()
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @Post("lists/:listId/cards")
  async create(
    @Param("listId") listId: string,
    @Body() body: CreateCardDto,
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
  async update(@Param("id") id: string, @Body() body: UpdateCardDto) {
    return this.cardsService.update(id, body);
  }

  @Patch("cards/:id/move")
  async move(@Param("id") id: string, @Body() body: MoveCardDto) {
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
    @Body() body: ReorderCardsDto,
  ) {
    await this.cardsService.reorder(listId, body.items);
    return { success: true };
  }
}