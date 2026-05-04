import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const DRIZZLE = Symbol("DRIZZLE");

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>("DATABASE_URL")!;
        const client = postgres(connectionString, {
          max: 20,
          idle_timeout: 20,
          connect_timeout: 10,
        });
        return drizzle(client, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}