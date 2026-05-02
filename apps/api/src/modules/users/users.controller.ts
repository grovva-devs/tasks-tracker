import { Controller, Get, Post, UseGuards, Body, Param, Delete, Patch } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UsersService } from "./users.service";
import * as bcrypt from "bcrypt";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @Roles("admin")
  async create(
    @Body() body: { email: string; displayName: string; role: string; password?: string },
  ) {
    const passwordHash = await bcrypt.hash(body.password ?? "changeme123", 10);
    return this.usersService.create({
      email: body.email,
      passwordHash,
      displayName: body.displayName,
      role: body.role,
    });
  }

  @Patch(":id/role")
  @Roles("admin")
  async updateRole(@Param("id") id: string, @Body() body: { role: string }) {
    return this.usersService.updateRole(id, body.role);
  }

  @Delete(":id")
  @Roles("admin")
  async remove(@Param("id") id: string) {
    await this.usersService.remove(id);
    return { success: true };
  }
}