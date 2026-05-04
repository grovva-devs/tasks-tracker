import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { HealthController } from "./health.controller";
import { validationSchema } from "./config/validation";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { BoardsModule } from "./modules/boards/boards.module";
import { ListsModule } from "./modules/lists/lists.module";
import { CardsModule } from "./modules/cards/cards.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { AttachmentsModule } from "./modules/attachments/attachments.module";
import { LabelsModule } from "./modules/labels/labels.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: "short",
          ttl: parseInt(configService.get("THROTTLE_TTL") ?? "1000", 10),
          limit: parseInt(configService.get("THROTTLE_LIMIT") ?? "3", 10),
        },
        {
          name: "medium",
          ttl: parseInt(configService.get("THROTTLE_MEDIUM_TTL") ?? "10000", 10),
          limit: parseInt(configService.get("THROTTLE_MEDIUM_LIMIT") ?? "20", 10),
        },
        {
          name: "long",
          ttl: parseInt(configService.get("THROTTLE_LONG_TTL") ?? "60000", 10),
          limit: parseInt(configService.get("THROTTLE_LONG_LIMIT") ?? "100", 10),
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    TerminusModule,
    AuthModule,
    UsersModule,
    BoardsModule,
    ListsModule,
    CardsModule,
    CommentsModule,
    AttachmentsModule,
    LabelsModule,
    TemplatesModule,
    NotificationsModule,
    DashboardModule,
    SettingsModule,
    WebhooksModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}