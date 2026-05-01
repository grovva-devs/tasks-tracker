export interface Template {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lists: TemplateList[];
  variables: TemplateVariable[];
}

export interface TemplateList {
  id: string;
  templateId: string;
  title: string;
  position: number;
  color: string | null;
  cards: TemplateCard[];
}

export interface TemplateCard {
  id: string;
  templateListId: string;
  title: string;
  description: string | null;
  position: number;
  dueDateOffsetDays: number | null;
}

export interface TemplateVariable {
  id: string;
  templateId: string;
  key: string;
  displayName: string;
  defaultValue: string | null;
  isRequired: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string | null;
  position: number;
  createdAt: string;
}