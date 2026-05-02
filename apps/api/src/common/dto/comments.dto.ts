import { IsString, IsIn, MaxLength } from "class-validator";

export class CreateCommentDto {
  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsIn(["internal", "client"])
  visibility!: string;
}

export class UpdateCommentDto {
  @IsString()
  @MaxLength(5000)
  content!: string;
}