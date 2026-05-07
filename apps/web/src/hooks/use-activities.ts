"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Activity {
  id: string;
  boardId: string;
  cardId: string | null;
  userId: string;
  action: string;
  description: string | null;
  createdAt: string;
}

export function useActivities(boardId: string, limit = 50) {
  return useQuery({
    queryKey: ["activities", boardId, limit],
    queryFn: () =>
      apiClient<Activity[]>(`/boards/${boardId}/activities?limit=${limit}`),
    enabled: !!boardId,
  });
}
