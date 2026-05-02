import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { BoardsService } from "./boards.service";
import { BoardsController } from "./boards.controller";

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [BoardsService],
})
export class BoardsModule {}