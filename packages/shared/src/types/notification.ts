export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  boardId: string | null;
  cardId: string | null;
  isRead: boolean;
  createdAt: string;
}