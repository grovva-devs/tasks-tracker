import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { Public } from "./modules/auth/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Check heap memory usage < 150MB
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
      // Check RSS memory usage < 150MB
      () => this.memory.checkRSS("memory_rss", 150 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get("live")
  liveness() {
    // Liveness probe: if this fails, restart the pod
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}