import { IsString, IsOptional, IsBoolean, IsArray, IsEmail, IsInt, MaxLength } from "class-validator";

export class VariableDto {
  @IsString()
  @MaxLength(100)
  key!: string;

  @IsString()
  @MaxLength(255)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  defaultValue?: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

export class TemplateCardDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsInt()
  dueDateOffsetDays?: number;
}

export class TemplateListDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @IsInt()
  position!: number;

  @IsOptional()
  @IsArray()
  cards?: any[];
}

export class CreateTemplateDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  variables?: VariableDto[];

  @IsOptional()
  @IsArray()
  lists?: TemplateListDto[];
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class ApplyTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  boardTitle?: string;

  @IsString()
  @MaxLength(255)
  clientName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  clientEmail?: string;

  @IsOptional()
  variables?: Record<string, string>;
}