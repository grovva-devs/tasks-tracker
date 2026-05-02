import { IsString, IsOptional, IsEmail, MaxLength } from "class-validator";

export class CreateBoardDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(255)
  clientName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  clientEmail?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}