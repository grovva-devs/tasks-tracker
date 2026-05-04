import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid credentials");
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: "7d",
      secret: this.configService.get<string>("JWT_REFRESH_SECRET") ?? this.configService.get<string>("JWT_SECRET"),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET") ?? this.configService.get<string>("JWT_SECRET");
      const payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }
      const newPayload = { sub: user.id, email: user.email, role: user.role };
      const accessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: "7d",
        secret: refreshSecret,
      });
      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }
}