import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ListsService } from "./lists.service";

@UseGuards(JwtAuthGuard)
@Controller("boards/:boardId/lists")
export class ListsController {
  constructor(private listsService: ListsService) {}

  @Post()
  async create(@Param("boardId") boardId: string, @Body() body: any) {
    return this.listsService.create(boardId, body);
  }

  @Get()
  async findAll(@Param("boardId") boardId: string) {
    return this.listsService.findByBoard(boardId);
  }

  @Patch("reorder")
  async reorder(
    @Param("boardId") boardId: string,
    @Body() body: { items: { id: string; position: number }[] },
  ) {
    await this.listsService.reorder(boardId, body.items);
    return { success: true };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: any) {
    return this.listsService.update(id, body);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.listsService.remove(id);
    return { success: true };
  }
}