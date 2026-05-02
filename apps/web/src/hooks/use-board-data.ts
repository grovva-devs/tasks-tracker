"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface ListData {
  id: string;
  title: string;
  position: number;
  color: string | null;
  cards: CardData[];
  createdAt: string;
}

interface CardData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  labels: { id: string; name: string; color: string }[];
  commentCount: number;
  clientCommentCount: number;
}

export interface BoardDetail {
  id: string;
  title: string;
  description: string | null;
  clientName: string;
  status: string;
  publicToken: string;
  lists: ListData[];
  stats?: {
    totalCards: number;
    completedCards: number;
    completionPercentage: number;
  };
}

export function useBoardData(boardId: string, token?: string | null) {
  return useQuery({
    queryKey: ["board", boardId],
    queryFn: () => apiClient<BoardDetail>(`/boards/${boardId}`, { token: token ?? undefined }),
    enabled: !!boardId,
  });
}

export function usePublicBoardData(publicToken: string) {
  return useQuery({
    queryKey: ["public-board", publicToken],
    queryFn: () => apiClient<BoardDetail>(`/boards/public/${publicToken}`),
    enabled: !!publicToken,
  });
}