import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { BoardsService } from "../boards/boards.service";
import { ListsService } from "../lists/lists.service";
import { CardsService } from "../cards/cards.service";
import { CreateTemplateDto, UpdateTemplateDto, ApplyTemplateDto } from "../../common/dto/templates.dto";

@Controller("templates")
export class TemplatesController {
  constructor(
    private templatesService: TemplatesService,
    private boardsService: BoardsService,
    private listsService: ListsService,
    private cardsService: CardsService,
  ) {}

  @Get()
  async findAll(@Query("categoryId") categoryId?: string) {
    return this.templatesService.findAll(categoryId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateTemplateDto, @CurrentUser() user: any) {
    return this.templatesService.create({
      ...body,
      createdBy: user.id,
    });
  }

  @Post(":id/apply")
  async applyTemplate(@Param("id") id: string, @Body() body: ApplyTemplateDto, @CurrentUser() user: any) {
    return this.templatesService.applyTemplate(id, {
      ...body,
      variables: body.variables ?? {},
      createdBy: user.id,
    }, this.boardsService, this.listsService, this.cardsService);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateTemplateDto) {
    return this.templatesService.update(id, body);
  }

  @Post(":id/duplicate")
  async duplicate(@Param("id") id: string) {
    return this.templatesService.duplicate(id);
  }

  @Roles("admin")
  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.templatesService.remove(id);
    return { success: true };
  }
}