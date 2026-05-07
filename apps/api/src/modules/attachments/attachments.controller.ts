import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CardMemberGuard } from "../../common/guards/card-member.guard";
import { AttachmentsService } from "./attachments.service";
import { S3UploadService } from "./s3-upload.service";

@Controller("cards/:cardId/attachments")
@UseGuards(CardMemberGuard)
export class AttachmentsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private s3UploadService: S3UploadService,
  ) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Param("cardId") cardId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024, message: "File too large (max 10MB)" }),
          new FileTypeValidator({ fileType: /^(image|application|text)\/.+/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: { visibility?: string },
    @CurrentUser() user: any,
  ) {
    const blockedTypes = [
      "application/x-msdownload",
      "application/x-executable",
      "application/x-dosexec",
    ];
    if (blockedTypes.includes(file.mimetype)) {
      throw new BadRequestException("Executable files not allowed");
    }

    const { fileUrl } = await this.s3UploadService.upload(
      {
        originalname: file.originalname,
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
      cardId,
    );

    return this.attachmentsService.create({
      cardId,
      fileName: file.originalname,
      fileUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: user.id,
      visibility: body.visibility || "internal",
    });
  }

  @Post()
  async create(
    @Param("cardId") cardId: string,
    @Body() body: { fileName: string; fileUrl: string; fileSize: number; mimeType: string; visibility: string },
    @CurrentUser() user: any,
  ) {
    return this.attachmentsService.create({
      cardId,
      ...body,
      uploadedBy: user.id,
    });
  }

  @Get()
  async findAll(@Param("cardId") cardId: string) {
    return this.attachmentsService.findByCard(cardId);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.attachmentsService.remove(id, user.id, user.role);
    return { success: true };
  }
}
