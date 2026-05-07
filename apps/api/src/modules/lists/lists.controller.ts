import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { ListsService } from "./lists.service";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";
import { UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateListDto, UpdateListDto } from "../../common/dto/lists.dto";

@Controller("boards/:boardId/lists")
export class ListsController {
  constructor(private listsService: ListsService) {}

  @Post()
  @UseGuards(BoardMemberGuard)
  async create(@Param("boardId") boardId: string, @Body() body: CreateListDto) {
    return this.listsService.create(boardId, body);
  }

  @Get()
  @UseGuards(BoardMemberGuard)
  async findAll(@Param("boardId") boardId: string) {
    return this.listsService.findByBoard(boardId);
  }

  @Patch("reorder")
  @UseGuards(BoardMemberGuard)
  async reorder(
    @Param("boardId") boardId: string,
    @Body() body: { items: { id: string; position: number }[] },
  ) {
    await this.listsService.reorder(boardId, body.items);
    return { success: true };
  }

  @Patch(":id")
  @UseGuards(BoardMemberGuard)
  async update(@Param("id") id: string, @Body() body: UpdateListDto) {
    return this.listsService.update(id, body);
  }

  @Delete(":id")
  @UseGuards(BoardMemberGuard)
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.listsService.remove(id, user.id);
    return { success: true };
  }
}