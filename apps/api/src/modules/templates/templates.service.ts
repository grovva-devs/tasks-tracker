import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../../database/connection";
import { templates, templateVariables, templateLists, templateCards } from "../../database/schema";
import { resolveTemplateVariables } from "@onboarding-tracker/shared";
import { validateRequiredVariables } from "./validators/template-variables.validator";
import * as crypto from "crypto";

@Injectable()
export class TemplatesService {
  async create(data: {
    name: string;
    description?: string;
    categoryId?: string;
    isDefault?: boolean;
    createdBy: string;
    variables?: { key: string; displayName: string; defaultValue?: string; isRequired?: boolean }[];
    lists?: { title: string; color?: string; position: number; cards?: { title: string; description?: string; position: number; dueDateOffsetDays?: number }[] }[];
  }) {
    const [template] = await db
      .insert(templates)
      .values({
        name: data.name,
        description: data.description ?? null,
        categoryId: data.categoryId ?? null,
        isDefault: data.isDefault ?? false,
        createdBy: data.createdBy,
      })
      .returning();

    // Insert variables
    if (data.variables && data.variables.length > 0) {
      await db.insert(templateVariables).values(
        data.variables.map((v) => ({
          templateId: template.id,
          key: v.key,
          displayName: v.displayName,
          defaultValue: v.defaultValue ?? null,
          isRequired: v.isRequired ?? true,
        })),
      ).returning();
    }

    // Insert lists and cards
    if (data.lists && data.lists.length > 0) {
      for (const listData of data.lists) {
        const [list] = await db
          .insert(templateLists)
          .values({
            templateId: template.id,
            title: listData.title,
            color: listData.color ?? null,
            position: listData.position,
          })
          .returning();

        if (listData.cards && listData.cards.length > 0) {
          await db.insert(templateCards).values(
            listData.cards.map((cardData) => ({
              templateListId: list.id,
              title: cardData.title,
              description: cardData.description ?? null,
              position: cardData.position,
              dueDateOffsetDays: cardData.dueDateOffsetDays ?? null,
            })),
          );
        }
      }
    }

    return this.findOne(template.id);
  }

  async findAll(categoryId?: string) {
    const conditions = [];
    if (categoryId) {
      conditions.push(eq(templates.categoryId, categoryId));
    }

    let query = db
      .select({
        id: templates.id,
        name: templates.name,
        description: templates.description,
        categoryId: templates.categoryId,
        isDefault: templates.isDefault,
        createdBy: templates.createdBy,
        createdAt: templates.createdAt,
        updatedAt: templates.updatedAt,
      })
      .from(templates)
      .orderBy(templates.createdAt);

    if (conditions.length > 0) {
      query = query.where(eq(templates.categoryId, categoryId!));
    }

    return query;
  }

  async findOne(id: string) {
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) throw new NotFoundException("Template not found");

    const variables = await db
      .select()
      .from(templateVariables)
      .where(eq(templateVariables.templateId, id));

    const lists = await db
      .select()
      .from(templateLists)
      .where(eq(templateLists.templateId, id))
      .orderBy(templateLists.position);

    for (const list of lists) {
      const cards = await db
        .select()
        .from(templateCards)
        .where(eq(templateCards.templateListId, list.id))
        .orderBy(templateCards.position);
      (list as any).cards = cards;
    }

    return { ...template, variables, lists };
  }

  async update(id: string, data: { name?: string; description?: string; categoryId?: string; isDefault?: boolean }) {
    const [template] = await db
      .update(templates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();

    if (!template) throw new NotFoundException("Template not found");
    return template;
  }

  async duplicate(id: string) {
    const template = await this.findOne(id);

    return this.create({
      name: `${template.name} (Copy)`,
      description: template.description ?? undefined,
      categoryId: template.categoryId ?? undefined,
      createdBy: template.createdBy,
      variables: template.variables.map((v: any) => ({
        key: v.key,
        displayName: v.displayName,
        defaultValue: v.defaultValue ?? undefined,
        isRequired: v.isRequired,
      })),
      lists: template.lists.map((l: any) => ({
        title: l.title,
        color: l.color ?? undefined,
        position: l.position,
        cards: (l.cards ?? []).map((c: any) => ({
          title: c.title,
          description: c.description ?? undefined,
          position: c.position,
          dueDateOffsetDays: c.dueDateOffsetDays ?? undefined,
        })),
      })),
    });
  }

  async remove(id: string) {
    await db.delete(templates).where(eq(templates.id, id));
  }

  async applyTemplate(
    templateId: string,
    input: {
      boardTitle?: string;
      clientName: string;
      clientEmail?: string;
      variables: Record<string, string>;
      createdBy: string;
    },
    boardsService: any,
    listsService: any,
    cardsService: any,
  ) {
    const template = await this.findOne(templateId);

    // Validate required variables
    const missingVars = validateRequiredVariables(
      template.variables.map((v: any) => ({ key: v.key, isRequired: v.isRequired })),
      input.variables,
    );

    if (missingVars.length > 0) {
      throw new BadRequestException(
        `Missing required template variables: ${missingVars.join(", ")}`,
      );
    }

    // 1. Create board with resolved title
    const resolvedBoardTitle =
      input.boardTitle ?? resolveTemplateVariables(template.name, input.variables);

    const board = await boardsService.create({
      title: resolvedBoardTitle,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      createdBy: input.createdBy,
      templateId,
    });

    // 2. Create each list with resolved title
    for (const tplList of template.lists as any[]) {
      const list = await listsService.create(board.id, {
        title: resolveTemplateVariables(tplList.title, input.variables),
        color: tplList.color ?? undefined,
        position: tplList.position,
      });

      // 3. Create each card with resolved title/description and computed due date
      for (const tplCard of (tplList.cards ?? []) as any[]) {
        let dueDate: string | undefined;

        if (tplCard.dueDateOffsetDays != null) {
          const boardCreatedDate = new Date(board.createdAt);
          boardCreatedDate.setDate(boardCreatedDate.getDate() + tplCard.dueDateOffsetDays);
          dueDate = boardCreatedDate.toISOString().split("T")[0];
        }

        await cardsService.create(list.id, board.id, {
          title: resolveTemplateVariables(tplCard.title, input.variables),
          description: tplCard.description
            ? resolveTemplateVariables(tplCard.description, input.variables)
            : undefined,
          dueDate,
        });
      }
    }

    return boardsService.findDetail(board.id);
  }
}