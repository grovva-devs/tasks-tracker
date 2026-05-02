import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { CardsService } from "./cards.service";
import { CardsController } from "./cards.controller";

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [CardsService],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}