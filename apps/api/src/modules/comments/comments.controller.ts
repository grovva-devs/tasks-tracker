import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";
import { CommentsService } from "./comments.service";
import { CreateCommentDto, UpdateCommentDto } from "../../common/dto/comments.dto";

@Controller("cards/:cardId/comments")
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
  async remove(@Param("id") id: string) {
    await this.commentsService.remove(id);
    return { success: true };
  }
}