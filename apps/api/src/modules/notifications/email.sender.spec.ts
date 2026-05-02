import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailSender } from "./email.sender";
import { ConfigService } from "@nestjs/config";

// Mock nodemailer
const mockSendMail = vi.fn();
vi.mock("nodemailer", () => ({
  createTransport: vi.fn(() => ({
    sendMail: mockSendMail,
    verify: vi.fn().mockResolvedValue(true),
  })),
}));

describe("EmailSender", () => {
  let sender: EmailSender;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: "msg-1" });

    const configService = {
      get: (key: string) => {
        const map: Record<string, string | undefined> = {
          SMTP_HOST: "smtp.test.com",
          SMTP_PORT: "465",
          SMTP_USER: "u",
          SMTP_PASSWORD: "p",
          EMAIL_FROM: "noreply@co.com",
        };
        return map[key];
      },
    };

    // @ts-expect-error - testing constructor injection
    sender = new EmailSender(configService as ConfigService);
  });

  describe("sendBoardCompletionEmail", () => {
    it("sends completion email to client", async () => {
      await sender.sendBoardCompletionEmail("client@acme.com", "Acme Corp", "Acme Onboarding");
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe("client@acme.com");
      expect(opts.from).toBe("noreply@co.com");
      expect(opts.subject).toContain("Complete");
      expect(opts.html).toContain("Acme Corp");
    });

    it("includes public board link when token provided", async () => {
      await sender.sendBoardCompletionEmail("c@a.com", "Acme", "Board", "tok123");
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain("/b/tok123");
    });
  });

  describe("sendCardAssignedEmail", () => {
    it("sends assignment email", async () => {
      await sender.sendCardAssignedEmail("m@co.com", "John", "Setup", "Board");
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe("m@co.com");
      expect(opts.html).toContain("Setup");
    });
  });

  describe("sendOverdueNotificationEmail", () => {
    it("sends overdue email", async () => {
      await sender.sendOverdueNotificationEmail("m@co.com", "John", "Task", "Board", "2025-04-15");
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.subject).toContain("Overdue");
      expect(opts.html).toContain("2025-04-15");
    });
  });
});