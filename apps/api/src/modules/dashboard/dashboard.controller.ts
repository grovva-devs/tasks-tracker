import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

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