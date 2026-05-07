import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";
import { BoardMemberGuard } from "../../common/guards/board-member.guard";

@Controller("boards/:boardId/activities")
@UseGuards(BoardMemberGuard)
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Get()
  async findByBoard(
    @Param("boardId") boardId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.activitiesService.findByBoard(boardId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
