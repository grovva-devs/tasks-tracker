import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class S3UploadService {
  private s3Client: S3Client | null = null;
  private bucket: string | null = null;
  private useLocal: boolean;
  private localDir: string;

  constructor(private configService: ConfigService) {
    this.useLocal = this.configService.get("USE_LOCAL_UPLOAD") === "true" || !this.configService.get("AWS_ACCESS_KEY_ID");
    this.localDir = this.configService.get("LOCAL_UPLOAD_DIR") || "./uploads";

    if (!this.useLocal) {
      this.s3Client = new S3Client({
        region: this.configService.get("AWS_REGION") || "us-east-1",
        endpoint: this.configService.get("S3_ENDPOINT") || undefined,
        credentials: {
          accessKeyId: this.configService.get("AWS_ACCESS_KEY_ID")!,
          secretAccessKey: this.configService.get("AWS_SECRET_ACCESS_KEY")!,
        },
      });
      this.bucket = this.configService.get("S3_BUCKET") || "onboarding-tracker";
    } else {
      // Ensure local upload directory exists
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
    }
  }

  async upload(file: UploadedFile, cardId: string): Promise<{ fileUrl: string; fileKey: string }> {
    const uuid = crypto.randomUUID();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `attachments/${cardId}/${uuid}/${safeName}`;

    if (this.useLocal) {
      const filePath = path.join(this.localDir, fileKey);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, file.buffer);
      return {
        fileUrl: `/api/uploads/${fileKey}`,
        fileKey,
      };
    }

    await this.s3Client!.send(
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }),
    );

    const getCommand = new GetObjectCommand({
      Bucket: this.bucket!,
      Key: fileKey,
    });

    const presignedUrl = await getSignedUrl(this.s3Client!, getCommand, { expiresIn: 3600 });

    return { fileUrl: presignedUrl, fileKey };
  }

  isLocal(): boolean {
    return this.useLocal;
  }
}
