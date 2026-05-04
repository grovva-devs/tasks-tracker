import { Controller, Get, Patch, Body } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { UpdateSettingsDto } from "../../common/dto/settings.dto";

@Controller("settings")
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Public()
  @Get("public")
  async getPublic() {
    return this.settingsService.getPublic();
  }

  @Roles("admin")
  @Get()
  async getFull() {
    return this.settingsService.getFull();
  }

  @Roles("admin")
  @Patch()
  async update(@Body() body: UpdateSettingsDto) {
    return this.settingsService.update(body);
  }
}