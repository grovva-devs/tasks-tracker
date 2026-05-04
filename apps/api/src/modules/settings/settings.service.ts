import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { settings } from "../../database/schema";

@Injectable()
export class SettingsService {
  // Simple in-memory cache for settings (singleton service, safe to cache)
  private cachedSettings: any = null;
  private cacheExpiry = 0;
  private readonly CACHE_TTL_MS = 60_000; // 1 minute

  private async getOrCreate() {
    // Return cached settings if still valid
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
    return this.getOrCreate();
  }

  async update(data: Partial<typeof settings.$inferInsert>) {
    const s = await this.getOrCreate();
    const [updated] = await db
      .update(settings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(settings.id, s.id))
      .returning();
    // Invalidate cache on update
    this.cachedSettings = null;
    this.cacheExpiry = 0;
    return updated;
  }
}