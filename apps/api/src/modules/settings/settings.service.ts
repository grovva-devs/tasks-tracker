import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { settings } from "../../database/schema";
import * as crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "default-key-not-secure";
const KEY_BUFFER = Buffer.alloc(32);
KEY_BUFFER.write(ENCRYPTION_KEY, 0, 32, "utf8");

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = (crypto as any).createCipheriv("aes-256-cbc", KEY_BUFFER, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(":");
  const decipher = (crypto as any).createDecipheriv("aes-256-cbc", KEY_BUFFER, Buffer.from(ivHex as any, "hex" as any));
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

@Injectable()
export class SettingsService {
  // Simple in-memory cache for settings (singleton service, safe to cache)
  private cachedSettings: any = null;
  private cacheExpiry = 0;
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  private async getOrCreate() {
    const now = Date.now();
    if (this.cachedSettings && now < this.cacheExpiry) {
      return this.cachedSettings;
    }

    const [existing] = await db
      .select({
        id: settings.id,
        companyName: settings.companyName,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        emailFrom: settings.emailFrom,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPassword: settings.smtpPassword,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      })
      .from(settings)
      .limit(1);

    if (existing) {
      this.cachedSettings = existing;
      this.cacheExpiry = now + this.CACHE_TTL_MS;
      return existing;
    }

    const [created] = await db.insert(settings).values({}).returning();
    this.cachedSettings = created;
    this.cacheExpiry = now + this.CACHE_TTL_MS;
    return created;
  }

  async getPublic() {
    const s = await this.getOrCreate();
    return { companyName: s.companyName, logoUrl: s.logoUrl, primaryColor: s.primaryColor };
  }

  async getFull() {
    const s = await this.getOrCreate();
    return { ...s, smtpPassword: s.smtpPassword ? decrypt(s.smtpPassword) : undefined };
  }

  async update(data: Partial<typeof settings.$inferInsert> & { smtpPassword?: string }) {
    const s = await this.getOrCreate();
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.smtpPassword) {
      updateData.smtpPassword = encrypt(data.smtpPassword);
    } else if (data.smtpPassword === null || data.smtpPassword === "") {
      updateData.smtpPassword = null;
    }
    const [updated] = await db
      .update(settings)
      .set(updateData)
      .where(eq(settings.id, s.id))
      .returning();
    this.cachedSettings = null;
    this.cacheExpiry = 0;
    return updated;
  }
}