import { Module } from "@nestjs/common";
import { AttachmentsService } from "./attachments.service";
import { AttachmentsController } from "./attachments.controller";
import { S3UploadService } from "./s3-upload.service";

@Module({
  providers: [AttachmentsService, S3UploadService],
  controllers: [AttachmentsController],
  exports: [AttachmentsService, S3UploadService],
})
export class AttachmentsModule {}