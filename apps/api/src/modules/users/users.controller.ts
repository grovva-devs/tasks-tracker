import { Controller, Get, Post, Body, Param, Delete, Patch, UnauthorizedException } from "@nestjs/common";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import * as bcrypt from "bcrypt";

@Controller("users")
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

  @Patch("me")
  async updateMe(
    @CurrentUser() user: any,
    @Body() body: { displayName?: string; avatarUrl?: string },
  ) {
    return this.usersService.update(user.id, body);
  }

  @Patch("me/password")
  async updatePassword(
    @CurrentUser() user: any,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    const dbUser = await this.usersService.findById(user.id);
    if (!dbUser) throw new UnauthorizedException("User not found");

    const isValid = await bcrypt.compare(body.oldPassword, dbUser.passwordHash);
    if (!isValid) throw new UnauthorizedException("Invalid old password");

    const newPasswordHash = await bcrypt.hash(body.newPassword, 10);
    await this.usersService.update(user.id, { passwordHash: newPasswordHash });
    return { success: true };
  }
}