import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthController } from "./health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { BoardsModule } from "./modules/boards/boards.module";
import { ListsModule } from "./modules/lists/lists.module";
import { CardsModule } from "./modules/cards/cards.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { AttachmentsModule } from "./modules/attachments/attachments.module";
import { LabelsModule } from "./modules/labels/labels.module";
import { TemplatesModule } from "./modules/templates/templates.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    BoardsModule,
    ListsModule,
    CardsModule,
    CommentsModule,
    AttachmentsModule,
    LabelsModule,
    TemplatesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}