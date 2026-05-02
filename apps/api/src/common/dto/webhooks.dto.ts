import { IsString, IsOptional, IsArray, IsBoolean, IsUrl } from "class-validator";

export class CreateWebhookDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsArray()
  @IsString({ each: true })
  events!: string[];
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}