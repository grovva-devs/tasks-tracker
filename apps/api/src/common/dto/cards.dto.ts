import { IsString, IsOptional, IsUUID, IsInt, Min } from "class-validator";

export class CreateCardDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsUUID()
  boardId!: string;

  @IsOptional()
  @IsString()
  createdBy?: string;
}

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  dueDate?: string | null;
}

export class MoveCardDto {
  @IsUUID()
  listId!: string;

  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderCardsDto {
  items!: { id: string; position: number }[];
}