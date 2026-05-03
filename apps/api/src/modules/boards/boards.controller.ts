import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PublicBoardGuard } from "../auth/guards/public-board.guard";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";
import { CreateBoardDto, UpdateBoardDto } from "../../common/dto/boards.dto";

@Controller("boards")
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query() query: { status?: string; search?: string }) {
    return this.boardsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() body: CreateBoardDto,
    @CurrentUser() user: any,
  ) {
    return this.boardsService.create({
      ...body,
      createdBy: user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get("stats/dashboard")
  async getDashboard(@CurrentUser() user: any) {
    return this.boardsService.findAll({ status: "active" });
  }

  @UseGuards(JwtAuthGuard, BoardMemberGuard)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.boardsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, BoardMemberGuard)
  @Get(":id/detail")
  async findDetail(@Param("id") id: string) {
    return this.boardsService.findDetail(id);
  }

  @UseGuards(JwtAuthGuard, BoardMemberGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateBoardDto) {
    return this.boardsService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.boardsService.update(id, { status: "archived" });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard, BoardMemberGuard)
  @Patch(":id/regenerate-token")
  async regenerateToken(@Param("id") id: string) {
    const board = await this.boardsService.regenerateToken(id);
    return { publicToken: board.publicToken };
  }

  @UseGuards(JwtAuthGuard, BoardMemberGuard)
  @Get(":id/stats")
  async getStats(@Param("id") id: string) {
    return this.boardsService.getStats(id);
  }

  // PUBLIC ENDPOINT — no JWT required
  @UseGuards(PublicBoardGuard)
  @Get("public/:token")
  async findByPublicToken(@Param("token") token: string, @CurrentUser() user: any) {
    return this.boardsService.findPublicDetail(token);
  }

  // PUBLIC ENDPOINT — single card with client-only content
  @UseGuards(PublicBoardGuard)
  @Get("public/:token/cards/:cardId")
  async findPublicCardDetail(@Param("cardId") cardId: string) {
    return this.boardsService.findPublicCardDetail(cardId);
  }
}