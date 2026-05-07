import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { AttachmentsModule } from "../attachments/attachments.module";
import { EmailSender } from "../notifications/email.sender";

@Module({
  imports: [AttachmentsModule],
  providers: [SettingsService, EmailSender],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}