import { describe, it, expect } from "vitest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { CreateBoardDto, UpdateBoardDto } from "./boards.dto";
import { LoginDto } from "./auth.dto";
import { CreateCardDto, MoveCardDto } from "./cards.dto";
import { CreateListDto } from "./lists.dto";
import { ApplyTemplateDto } from "./templates.dto";
import { UpdateSettingsDto } from "./settings.dto";
import { CreateWebhookDto } from "./webhooks.dto";
import { CreateCommentDto } from "./comments.dto";

describe("DTO Validation", () => {
  // ── Auth ──
  describe("LoginDto", () => {
    it("rejects missing email", async () => {
      const dto = plainToInstance(LoginDto, { password: "123456" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("email");
    });

    it("rejects short password", async () => {
      const dto = plainToInstance(LoginDto, { email: "test@test.com", password: "12" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("password");
    });

    it("accepts valid login", async () => {
      const dto = plainToInstance(LoginDto, { email: "test@test.com", password: "123456" });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  // ── Boards ──
  describe("CreateBoardDto", () => {
    it("accepts valid board", async () => {
      const dto = plainToInstance(CreateBoardDto, { title: "My Board", clientName: "Client", clientEmail: "c@test.com" });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects missing title", async () => {
      const dto = plainToInstance(CreateBoardDto, { clientName: "Client" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects invalid email format", async () => {
      const dto = plainToInstance(CreateBoardDto, { title: "T", clientName: "C", clientEmail: "not-an-email" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateBoardDto", () => {
    it("accepts partial update", async () => {
      const dto = plainToInstance(UpdateBoardDto, { title: "New Title" });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects title exceeding max length", async () => {
      const dto = plainToInstance(UpdateBoardDto, { title: "x".repeat(256) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ── Cards ──
  describe("CreateCardDto", () => {
    it("accepts valid card", async () => {
      const dto = plainToInstance(CreateCardDto, { title: "Card", boardId: "550e8400-e29b-41d4-a716-446655440000" });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects missing title", async () => {
      const dto = plainToInstance(CreateCardDto, { boardId: "550e8400-e29b-41d4-a716-446655440000" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("MoveCardDto", () => {
    it("rejects negative position", async () => {
      const dto = plainToInstance(MoveCardDto, { listId: "550e8400-e29b-41d4-a716-446655440000", position: -1 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("accepts valid move", async () => {
      const dto = plainToInstance(MoveCardDto, { listId: "550e8400-e29b-41d4-a716-446655440000", position: 0 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects invalid UUID for listId", async () => {
      const dto = plainToInstance(MoveCardDto, { listId: "not-a-uuid", position: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ── Lists ──
  describe("CreateListDto", () => {
    it("rejects missing title", async () => {
      const dto = plainToInstance(CreateListDto, { position: 0 });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("title");
    });

    it("accepts valid list", async () => {
      const dto = plainToInstance(CreateListDto, { title: "To Do", position: 0 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  // ── Templates ──
  describe("ApplyTemplateDto", () => {
    it("accepts valid apply", async () => {
      const dto = plainToInstance(ApplyTemplateDto, { clientName: "Test", variables: { key: "val" } });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects missing clientName", async () => {
      const dto = plainToInstance(ApplyTemplateDto, { variables: {} });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ── Settings ──
  describe("UpdateSettingsDto", () => {
    it("accepts partial update", async () => {
      const dto = plainToInstance(UpdateSettingsDto, { companyName: "New Co" });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("validates max length on companyName", async () => {
      const dto = plainToInstance(UpdateSettingsDto, { companyName: "x".repeat(256) });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ── Webhooks ──
  describe("CreateWebhookDto", () => {
    it("accepts valid webhook", async () => {
      const dto = plainToInstance(CreateWebhookDto, { url: "https://example.com/hook", events: ["card.created"] });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects non-URL", async () => {
      const dto = plainToInstance(CreateWebhookDto, { url: "not-a-url", events: ["card.created"] });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects missing events array", async () => {
      const dto = plainToInstance(CreateWebhookDto, { url: "https://example.com/hook" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // ── Comments ──
  describe("CreateCommentDto", () => {
    it("accepts valid comment", async () => {
      const dto = plainToInstance(CreateCommentDto, { content: "Hello", visibility: "internal" });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("rejects invalid visibility", async () => {
      const dto = plainToInstance(CreateCommentDto, { content: "Hello", visibility: "everyone" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects empty content", async () => {
      const dto = plainToInstance(CreateCommentDto, { visibility: "internal" });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});