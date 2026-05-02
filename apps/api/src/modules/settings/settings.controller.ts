import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UpdateSettingsDto } from "../../common/dto/settings.dto";

@Controller("settings")
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get("public")
  async getPublic() {
    return this.settingsService.getPublic();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Get()
  async getFull() {
    return this.settingsService.getFull();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Patch()
  async update(@Body() body: UpdateSettingsDto) {
    return this.settingsService.update(body);
  }
}