import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookSender } from "./webhook.sender";
import * as crypto from "crypto";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("WebhookSender", () => {
  let sender: WebhookSender;

  beforeEach(() => {
    sender = new WebhookSender();
    vi.clearAllMocks();
  });

  describe("send", () => {
    it("sends POST with HMAC-SHA256 signature header", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      const payload = { event: "card.completed", timestamp: "2025-01-01T00:00:00Z" };

      await sender.send("https://example.com/webhook", "my-secret", payload);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://example.com/webhook");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");

      const body = JSON.stringify(payload);
      const expectedSig = "sha256=" + crypto.createHmac("sha256", "my-secret").update(body).digest("hex");
      expect(options.headers["X-Webhook-Signature"]).toBe(expectedSig);
    });

    it("throws when response is not ok", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      await expect(sender.send("https://example.com/webhook", "secret", {})).rejects.toThrow("Webhook delivery failed: 500");
    });

    it("throws on network error", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
      await expect(sender.send("https://example.com/webhook", "secret", {})).rejects.toThrow("ECONNREFUSED");
    });

    it("sends payload as JSON body", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      const payload = { event: "board.completed", boardId: "b1" };
      await sender.send("https://example.com/webhook", "secret", payload);
      const options = mockFetch.mock.calls[0][1];
      const parsedBody = JSON.parse(options.body);
      expect(parsedBody.event).toBe("board.completed");
    });
  });

  describe("sendWithRetry", () => {
    it("retries up to maxRetries on failure then succeeds", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("timeout"))
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValue({ ok: true, status: 200 });

      const result = await sender.sendWithRetry("https://example.com/webhook", "secret", {}, 3);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("returns true on first attempt success", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      const result = await sender.sendWithRetry("https://example.com/webhook", "secret", {}, 3);
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws after all retries exhausted", async () => {
      mockFetch.mockRejectedValue(new Error("persistent failure"));
      // Use short delays for testing by mocking retries
      await expect(sender.sendWithRetry("https://example.com/webhook", "secret", {}, 2)).rejects.toThrow("persistent failure");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("deliverToActiveWebhooks", () => {
    it("delivers only to active webhooks subscribing to the event", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      const webhooks = [
        { id: "wh-1", url: "https://a.com/hook", secret: "s-a", events: ["card.completed", "board.completed"], isActive: true },
        { id: "wh-2", url: "https://b.com/hook", secret: "s-b", events: ["card.assigned"], isActive: true },
        { id: "wh-3", url: "https://c.com/hook", secret: "s-c", events: ["card.completed"], isActive: false },
      ];
      const result = await sender.deliverToActiveWebhooks(webhooks as any, "card.completed", { cardId: "c1" });
      expect(result.delivered).toBe(1);
      expect(result.failed).toBe(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("counts failures separately", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error("timeout"));
      const webhooks = [
        { id: "wh-1", url: "https://a.com/hook", secret: "s-a", events: ["card.completed"], isActive: true },
        { id: "wh-2", url: "https://b.com/hook", secret: "s-b", events: ["card.completed"], isActive: true },
      ];
      const result = await sender.deliverToActiveWebhooks(webhooks as any, "card.completed", {});
      expect(result.delivered).toBe(1);
      expect(result.failed).toBe(1);
    });

    it("returns zeros when no webhooks match", async () => {
      const webhooks = [{ id: "wh-1", url: "https://a.com/hook", secret: "s", events: ["board.completed"], isActive: true }];
      const result = await sender.deliverToActiveWebhooks(webhooks as any, "card.assigned", {});
      expect(result.delivered).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});