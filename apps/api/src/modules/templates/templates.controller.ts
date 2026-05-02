import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TemplatesService } from "./templates.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
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

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Query("categoryId") categoryId?: string) {
    return this.templatesService.findAll(categoryId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.templatesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: CreateTemplateDto, @CurrentUser() user: any) {
    return this.templatesService.create({
      ...body,
      createdBy: user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/apply")
  async applyTemplate(@Param("id") id: string, @Body() body: ApplyTemplateDto, @CurrentUser() user: any) {
    return this.templatesService.applyTemplate(id, {
      ...body,
      createdBy: user.id,
    }, this.boardsService, this.listsService, this.cardsService);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: UpdateTemplateDto) {
    return this.templatesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":id/duplicate")
  async duplicate(@Param("id") id: string) {
    return this.templatesService.duplicate(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete(":id")
  async remove(@Param("id") id: string) {
    await this.templatesService.remove(id);
    return { success: true };
  }
}