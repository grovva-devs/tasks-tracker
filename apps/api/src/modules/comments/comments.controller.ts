import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ForbiddenException } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CardMemberGuard } from "../../common/guards/card-member.guard";
import { CommentsService } from "./comments.service";
import { CreateCommentDto, UpdateCommentDto } from "../../common/dto/comments.dto";

@Controller("cards/:cardId/comments")
@UseGuards(CardMemberGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  async create(
    @Param("cardId") cardId: string,
    @Body() body: CreateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.create(cardId, user.id, body);
  }

  @Get()
  async findAll(@Param("cardId") cardId: string, @Query("visibility") visibility?: string) {
    return this.commentsService.findByCard(cardId, visibility);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.commentsService.update(id, user.id, body.content);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.commentsService.remove(id, user.id, user.role);
    return { success: true };
  }
}