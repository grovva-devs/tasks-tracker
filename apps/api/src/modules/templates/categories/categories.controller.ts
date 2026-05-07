import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";

@UseGuards(JwtAuthGuard)
@Controller("template-categories")
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async findAll() {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("admin")
  async create(@Body() body: { name: string; description?: string; position?: number }) {
    return this.categoriesService.create(body);
  }

  @Patch("reorder")
  @UseGuards(RolesGuard)
  @Roles("admin")
  async reorder(@Body() body: { items: { id: string; position: number }[] }) {
    await this.categoriesService.reorder(body.items);
    return { success: true };
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  async update(
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string; position?: number },
  ) {
    return this.categoriesService.update(id, body);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles("admin")
  async remove(@Param("id") id: string, @CurrentUser() user: any) {
    await this.categoriesService.remove(id, user.id);
    return { success: true };
  }
}