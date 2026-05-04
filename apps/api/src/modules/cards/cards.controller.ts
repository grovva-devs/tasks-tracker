import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { CardsService } from "./cards.service";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";
import { UseGuards } from "@nestjs/common";
import { CreateCardDto, UpdateCardDto, MoveCardDto, ReorderCardsDto } from "../../common/dto/cards.dto";

@Controller()
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @UseGuards(BoardMemberGuard)
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

  @UseGuards(BoardMemberGuard)
  @Patch("cards/:id/move")
  async move(@Param("id") id: string, @Body() body: MoveCardDto) {
    return this.cardsService.moveCard(id, body.listId, body.position);
  }

  @Delete("cards/:id")
  async remove(@Param("id") id: string) {
    await this.cardsService.remove(id);
    return { success: true };
  }

  @UseGuards(BoardMemberGuard)
  @Patch("lists/:listId/cards/reorder")
  async reorder(
    @Param("listId") listId: string,
    @Body() body: ReorderCardsDto,
  ) {
    await this.cardsService.reorder(listId, body.items);
    return { success: true };
  }
}