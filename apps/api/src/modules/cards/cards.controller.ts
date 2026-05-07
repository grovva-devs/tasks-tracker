import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { CardsService } from "./cards.service";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";
import { CardMemberGuard } from "../../common/guards/card-member.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateCardDto, UpdateCardDto, MoveCardDto, ReorderCardsDto } from "../../common/dto/cards.dto";

@Controller()
export class CardsController {
  constructor(private cardsService: CardsService) {}

  @UseGuards(BoardMemberGuard)
  @Post("lists/:listId/cards")
  async create(
    @Param("listId") listId: string,
    @Body() body: CreateCardDto,
    @CurrentUser() user: any,
  ) {
    return this.cardsService.create(listId, body.boardId, { ...body, createdBy: user.id });
  }

  @UseGuards(CardMemberGuard)
  @Get("cards/:id")
  async findOne(@Param("id") id: string) {
    return this.cardsService.findOne(id);
  }

  @UseGuards(CardMemberGuard)
  @Get("cards/:id/detail")
  async findDetail(@Param("id") id: string) {
    return this.cardsService.findDetail(id);
  }

  @UseGuards(CardMemberGuard)
  @Patch("cards/:id")
  async update(@Param("id") id: string, @Body() body: UpdateCardDto) {
    return this.cardsService.update(id, body);
  }

  @UseGuards(BoardMemberGuard)
  @Patch("cards/:id/move")
  async move(
    @Param("id") id: string,
    @Body() body: MoveCardDto,
    @CurrentUser() user: any,
  ) {
    return this.cardsService.moveCard(id, body.listId, body.position, user.id);
  }

  @UseGuards(CardMemberGuard)
  @Delete("cards/:id")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.cardsService.remove(id, user.id);
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

  @UseGuards(CardMemberGuard)
  @Post("cards/:id/assignees")
  async addAssignee(
    @Param("id") id: string,
    @Body() body: { userId: string },
  ) {
    return this.cardsService.addAssignee(id, body.userId);
  }

  @UseGuards(CardMemberGuard)
  @Delete("cards/:id/assignees/:userId")
  async removeAssignee(
    @Param("id") id: string,
    @Param("userId") userId: string,
  ) {
    await this.cardsService.removeAssignee(id, userId);
    return { success: true };
  }
}
