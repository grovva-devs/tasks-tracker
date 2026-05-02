import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  let usersService: {
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    usersService = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
    };
    jwtService = {
      sign: vi.fn().mockReturnValue("test-jwt-token"),
    };
    service = new AuthService(
      usersService as any,
      jwtService as any,
    );
  });

  describe("validateUser", () => {
    it("returns user without password when credentials valid", async () => {
      const hash = await bcrypt.hash("password123", 10);
      usersService.findByEmail.mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: hash,
        displayName: "Test",
        role: "admin",
      });

      const result = await service.validateUser("test@test.com", "password123");
      expect(result).toMatchObject({
        id: "1",
        email: "test@test.com",
        displayName: "Test",
        role: "admin",
      });
      expect(result).not.toHaveProperty("passwordHash");
    });

    it("throws Unauthorized when password wrong", async () => {
      const hash = await bcrypt.hash("password123", 10);
      usersService.findByEmail.mockResolvedValue({
        id: "1",
        email: "test@test.com",
        passwordHash: hash,
        displayName: "Test",
        role: "admin",
      });

      await expect(
        service.validateUser("test@test.com", "wrong"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws Unauthorized when user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser("no@user.com", "pass"),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("login", () => {
    it("returns access token with user payload", async () => {
      const user = { id: "1", email: "test@test.com", role: "admin" };
      const result = await service.login(user as any);

      expect(result.access_token).toBe("test-jwt-token");
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: "1",
        email: "test@test.com",
        role: "admin",
      });
    });
  });
});