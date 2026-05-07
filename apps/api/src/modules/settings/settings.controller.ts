import { Controller, Get, Patch, Post, Body, UploadedFile, UseInterceptors, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SettingsService } from "./settings.service";
import { S3UploadService } from "../attachments/s3-upload.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UpdateSettingsDto } from "../../common/dto/settings.dto";

@Controller("settings")
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private s3UploadService: S3UploadService,
  ) {}

  @Public()
  @Get("public")
  async getPublic() {
    return this.settingsService.getPublic();
  }

  @Roles("admin")
  @Get()
  async getFull() {
    return this.settingsService.getFull();
  }

  @Roles("admin")
  @Patch()
  async update(@Body() body: UpdateSettingsDto) {
    return this.settingsService.update(body);
  }

  @Roles("admin")
  @Post("upload-logo")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file provided");

    const allowedMimeTypes = ["image/png", "image/jpeg", "image/svg+xml"];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("Invalid file type. Only PNG, JPEG, and SVG are allowed.");
    }

    // For logo uploads, we use the S3UploadService but with a custom path
    const fileKey = `branding/logo-${Date.now()}.${file.originalname.split(".").pop()}`;

    const result = await this.s3UploadService.uploadLogo(file, fileKey);

    await this.settingsService.update({ logoUrl: result.fileUrl });

    return { logoUrl: result.fileUrl };
  }
}