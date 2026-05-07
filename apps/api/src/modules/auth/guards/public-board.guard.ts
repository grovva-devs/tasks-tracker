import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Request } from "express";
import { db } from "../../../database/connection";
import { boards } from "../../../database/schema";
import { eq, and, sql } from "drizzle-orm";

@Injectable()
export class PublicBoardGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.params.token as string;

    if (!token) {
      throw new NotFoundException("Board not found");
    }

    const result = await db
      .select({
        id: boards.id,
        title: boards.title,
        slug: boards.slug,
        publicToken: boards.publicToken,
        clientName: boards.clientName,
        clientEmail: boards.clientEmail,
        status: boards.status,
      })
      .from(boards)
      .where(and(eq(boards.publicToken, token), sql`${boards.deletedAt} IS NULL`))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException("Board not found");
    }

    (request as any).publicBoard = result[0];
    return true;
  }
}