import { Module } from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { BoardsController } from "./boards.controller";
import { BoardMembersService } from "./board-members.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  providers: [BoardsService, BoardMembersService],
  controllers: [BoardsController],
  exports: [BoardsService, BoardMembersService],
})
export class BoardsModule {}