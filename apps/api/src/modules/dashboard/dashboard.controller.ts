import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";

@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get("stats")
  async getStats() {
    return this.dashboardService.getOverview();
  }

  @Get("recent-activity")
  async getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }
}