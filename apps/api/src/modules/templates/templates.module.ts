import { Module } from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { TemplatesController } from "./templates.controller";
import { CategoriesModule } from "./categories/categories.module";
import { BoardsModule } from "../boards/boards.module";
import { ListsModule } from "../lists/lists.module";
import { CardsModule } from "../cards/cards.module";

@Module({
  imports: [CategoriesModule, BoardsModule, ListsModule, CardsModule],
  providers: [TemplatesService],
  controllers: [TemplatesController],
  exports: [TemplatesService],
})
export class TemplatesModule {}