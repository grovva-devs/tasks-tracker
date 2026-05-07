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
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { BoardMembersService } from "./board-members.service";
import { UsersService } from "../users/users.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { PublicBoardGuard } from "../auth/guards/public-board.guard";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";
import { CreateBoardDto, UpdateBoardDto } from "../../common/dto/boards.dto";

@Controller("boards")
export class BoardsController {
  constructor(
    private boardsService: BoardsService,
    private boardMembersService: BoardMembersService,
    private usersService: UsersService,
  ) {}

  @Get()
  async findAll(
    @Query() query: { status?: string; search?: string; page?: string; limit?: string },
  ) {
    return this.boardsService.findAll({
      status: query.status,
      search: query.search,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
  }

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

  @Get("stats/dashboard")
  async getDashboard(@CurrentUser() user: any) {
    return this.boardsService.findAll({ status: "active" });
  }

  @UseGuards(BoardMemberGuard)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.boardsService.findOne(id);
  }

  @UseGuards(BoardMemberGuard)
  @Get(":id/detail")
  async findDetail(@Param("id") id: string) {
    return this.boardsService.findDetail(id);
  }

  @UseGuards(BoardMemberGuard)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() body: UpdateBoardDto,
    @CurrentUser() user: any,
  ) {
    const board = await this.boardsService.findOne(id);
    if (user.role !== "admin" && board.createdBy !== user.id) {
      throw new ForbiddenException("Only admin or board creator can edit this board");
    }
    return this.boardsService.update(id, body);
  }

  @UseGuards(BoardMemberGuard)
  @Patch(":id/archive")
  async archive(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    const board = await this.boardsService.findOne(id);
    if (user.role !== "admin" && board.createdBy !== user.id) {
      throw new ForbiddenException("Only admin or board creator can archive");
    }
    return this.boardsService.archive(id, user.id);
  }

  @UseGuards(BoardMemberGuard)
  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    const board = await this.boardsService.findOne(id);
    if (user.role !== "admin" && board.createdBy !== user.id) {
      throw new ForbiddenException("Only admin or board creator can delete");
    }
    await this.boardsService.softDelete(id, user.id);
    return { success: true };
  }

  @UseGuards(BoardMemberGuard)
  @Patch(":id/regenerate-token")
  async regenerateToken(@Param("id") id: string) {
    const board = await this.boardsService.regenerateToken(id);
    return { publicToken: board.publicToken };
  }

  @UseGuards(BoardMemberGuard)
  @Get(":id/stats")
  async getStats(@Param("id") id: string) {
    return this.boardsService.getStats(id);
  }

  @UseGuards(BoardMemberGuard)
  @Get(":id/members")
  async getMembers(@Param("id") id: string) {
    return this.boardMembersService.findByBoard(id);
  }

  @UseGuards(BoardMemberGuard)
  @Post(":id/members")
  async addMember(
    @Param("id") id: string,
    @Body() body: { userId?: string; email?: string },
    @CurrentUser() user: any,
  ) {
    // Only admin or board creator can add members
    const board = await this.boardsService.findOne(id);
    if (user.role !== "admin" && board.createdBy !== user.id) {
      throw new ForbiddenException("Only admin or board creator can add members");
    }

    let userId = body.userId;
    // If email provided, resolve to userId
    if (!userId && body.email) {
      const targetUser = await this.usersService.findByEmail(body.email);
      if (!targetUser) throw new NotFoundException("User not found");
      userId = targetUser.id;
    }
    if (!userId) throw new BadRequestException("userId or email required");

    return this.boardMembersService.add(id, userId);
  }

  @UseGuards(BoardMemberGuard)
  @Delete(":id/members/:memberUserId")
  async removeMember(
    @Param("id") id: string,
    @Param("memberUserId") memberUserId: string,
    @CurrentUser() user: any,
  ) {
    // Only admin or board creator can remove members
    const board = await this.boardsService.findOne(id);
    if (user.role !== "admin" && board.createdBy !== user.id) {
      throw new ForbiddenException("Only admin or board creator can remove members");
    }

    await this.boardMembersService.remove(id, memberUserId);
    return { success: true };
  }

  // PUBLIC ENDPOINTS — no JWT required
  @Public()
  @UseGuards(PublicBoardGuard)
  @Get("public/:token")
  async findByPublicToken(@Param("token") token: string, @CurrentUser() user: any) {
    return this.boardsService.findPublicDetail(token);
  }

  @Public()
  @UseGuards(PublicBoardGuard)
  @Get("public/:token/cards/:cardId")
  async findPublicCardDetail(@Param("cardId") cardId: string) {
    return this.boardsService.findPublicCardDetail(cardId);
  }
}