import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../database/connection";
import { templates, templateVariables, templateLists, templateCards } from "../../database/schema";
import { resolveTemplateVariables } from "@onboarding-tracker/shared";
import { validateRequiredVariables } from "./validators/template-variables.validator";

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
    // Wrap entire template creation in a transaction for atomicity
    return db.transaction(async (tx) => {
      const [template] = await tx
        .insert(templates)
        .values({
          name: data.name,
          description: data.description ?? null,
          categoryId: data.categoryId ?? null,
          isDefault: data.isDefault ?? false,
          createdBy: data.createdBy,
        })
        .returning();

      if (!template) throw new BadRequestException("Failed to create template");

      // Insert variables
      if (data.variables && data.variables.length > 0) {
        await tx.insert(templateVariables).values(
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
          const [list] = await tx
            .insert(templateLists)
            .values({
              templateId: template.id,
              title: listData.title,
              color: listData.color ?? null,
              position: listData.position,
            })
            .returning();

          if (!list) continue;

          if (listData.cards && listData.cards.length > 0) {
            await tx.insert(templateCards).values(
              listData.cards.map((cardData) => ({
                templateListId: list.id,
                title: cardData.title,
                description: cardData.description ?? null,
                position: cardData.position,
                dueDateOffsetDays: cardData.dueDateOffsetDays ?? null,
              })),
            ).returning();
          }
        }
      }

      // Fetch the complete template within the same transaction
      return this.findOneInner(tx, template.id);
    });
  }

  async findAll(categoryId?: string) {
    if (categoryId) {
      return db
        .select({
          id: templates.id, name: templates.name, description: templates.description,
          categoryId: templates.categoryId, isDefault: templates.isDefault,
          createdBy: templates.createdBy, createdAt: templates.createdAt, updatedAt: templates.updatedAt,
        })
        .from(templates)
        .where(eq(templates.categoryId, categoryId))
        .orderBy(templates.createdAt);
    }

    return db
      .select({
        id: templates.id, name: templates.name, description: templates.description,
        categoryId: templates.categoryId, isDefault: templates.isDefault,
        createdBy: templates.createdBy, createdAt: templates.createdAt, updatedAt: templates.updatedAt,
      })
      .from(templates)
      .orderBy(templates.createdAt);
  }

  async findOne(id: string) {
    return this.findOneInner(db, id);
  }

  /** Inner method that works with both db and tx for transaction support */
  private async findOneInner(queryDb: any, id: string) {
    const [template] = await queryDb
      .select({
        id: templates.id, name: templates.name, description: templates.description,
        categoryId: templates.categoryId, isDefault: templates.isDefault,
        createdBy: templates.createdBy, createdAt: templates.createdAt, updatedAt: templates.updatedAt,
      })
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    if (!template) throw new NotFoundException("Template not found");

    const variables = await queryDb
      .select({
        id: templateVariables.id, templateId: templateVariables.templateId,
        key: templateVariables.key, displayName: templateVariables.displayName,
        defaultValue: templateVariables.defaultValue, isRequired: templateVariables.isRequired,
      })
      .from(templateVariables)
      .where(eq(templateVariables.templateId, id));

    const fetchedLists = await queryDb
      .select({
        id: templateLists.id, templateId: templateLists.templateId,
        title: templateLists.title, color: templateLists.color,
        position: templateLists.position,
      })
      .from(templateLists)
      .where(eq(templateLists.templateId, id))
      .orderBy(templateLists.position);

    // Fix N+1: batch fetch all cards for all lists at once
    const listIds = fetchedLists.map((l: any) => l.id);
    const allCards = listIds.length > 0
      ? await queryDb
          .select({
            id: templateCards.id, templateListId: templateCards.templateListId,
            title: templateCards.title, description: templateCards.description,
            position: templateCards.position, dueDateOffsetDays: templateCards.dueDateOffsetDays,
          })
          .from(templateCards)
          .where(inArray(templateCards.templateListId, listIds))
          .orderBy(templateCards.position)
      : [];

    // Map cards to their lists in memory
    const cardsByList = new Map<string, any[]>();
    for (const card of allCards) {
      const listCards = cardsByList.get(card.templateListId) ?? [];
      listCards.push(card);
      cardsByList.set(card.templateListId, listCards);
    }

    const listsWithCards = fetchedLists.map((list: any) => ({
      ...list,
      cards: cardsByList.get(list.id) ?? [],
    }));

    return { ...template, variables, lists: listsWithCards };
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

  async remove(id: string, userId: string) {
    await db.update(templates).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(templates.id, id));
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