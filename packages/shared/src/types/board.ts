export interface Board {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  publicToken: string;
  clientName: string;
  clientEmail: string | null;
  status: "active" | "completed" | "archived";
  templateId: string | null;
  createdBy: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardWithDetails extends Board {
  lists: List[];
  stats: BoardStats;
}

export interface BoardStats {
  totalCards: number;
  completedCards: number;
  completionPercentage: number;
}

export interface List {
  id: string;
  boardId: string;
  title: string;
  position: number;
  color: string | null;
  cards: Card[];
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  assignees: CardAssignee[];
  labels: CardLabel[];
  attachments: CardAttachment[];
  commentCount: number;
  clientCommentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CardDetail extends Card {
  comments: CardComment[];
}

export interface CardAssignee {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CardLabel {
  id: string;
  name: string;
  color: string;
}

export interface CardAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  visibility: "internal" | "client";
  uploadedBy: string;
  createdAt: string;
}

export interface CardComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  content: string;
  visibility: "internal" | "client";
  createdAt: string;
  updatedAt: string;
}