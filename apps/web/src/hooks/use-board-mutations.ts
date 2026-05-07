"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";

export function useBoardMutations(boardId: string) {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  const invalidateBoard = () => {
    queryClient.invalidateQueries({ queryKey: ["board", boardId] });
  };

  const addList = useMutation({
    mutationFn: (data: { title: string; color?: string }) =>
      apiClient(`/boards/${boardId}/lists`, { method: "POST", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const updateList = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; color?: string; position?: number }) =>
      apiClient(`/boards/${boardId}/lists/${id}`, { method: "PATCH", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const deleteList = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/boards/${boardId}/lists/${id}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const addCard = useMutation({
    mutationFn: ({ listId, ...data }: { listId: string; title: string; description?: string; dueDate?: string }) =>
      apiClient(`/lists/${listId}/cards`, { method: "POST", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const updateCard = useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; dueDate?: string | null }) =>
      apiClient(`/cards/${id}`, { method: "PATCH", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const moveCard = useMutation({
    mutationFn: ({ id, listId, position }: { id: string; listId: string; position: number }) =>
      apiClient(`/cards/${id}/move`, { method: "PATCH", token: token!, body: { listId, position } }),
    onSuccess: invalidateBoard,
  });

  const deleteCard = useMutation({
    mutationFn: (id: string) => apiClient(`/cards/${id}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const addComment = useMutation({
    mutationFn: ({ cardId, content, visibility }: { cardId: string; content: string; visibility: string }) =>
      apiClient(`/cards/${cardId}/comments`, { method: "POST", token: token!, body: { content, visibility } }),
    onSuccess: invalidateBoard,
  });

  const addAssignee = useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: string }) =>
      apiClient(`/cards/${cardId}/assignees`, { method: "POST", token: token!, body: { userId } }),
    onSuccess: invalidateBoard,
  });

  const removeAssignee = useMutation({
    mutationFn: ({ cardId, userId }: { cardId: string; userId: string }) =>
      apiClient(`/cards/${cardId}/assignees/${userId}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const addLabel = useMutation({
    mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      apiClient(`/boards/${boardId}/labels/cards/${cardId}/labels/${labelId}`, { method: "POST", token: token! }),
    onSuccess: invalidateBoard,
  });

  const removeLabel = useMutation({
    mutationFn: ({ cardId, labelId }: { cardId: string; labelId: string }) =>
      apiClient(`/boards/${boardId}/labels/cards/${cardId}/labels/${labelId}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const createLabel = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      apiClient(`/boards/${boardId}/labels`, { method: "POST", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const updateLabel = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      apiClient(`/boards/${boardId}/labels/${id}`, { method: "PATCH", token: token!, body: data }),
    onSuccess: invalidateBoard,
  });

  const deleteLabel = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/boards/${boardId}/labels/${id}`, { method: "DELETE", token: token! }),
    onSuccess: invalidateBoard,
  });

  const reorderLists = useMutation({
    mutationFn: (items: { id: string; position: number }[]) =>
      apiClient(`/boards/${boardId}/lists/reorder`, { method: "PATCH", token: token!, body: { items } }),
    onSuccess: invalidateBoard,
  });

  return {
    addList, updateList, deleteList,
    addCard, updateCard, moveCard, deleteCard,
    addComment,
    addAssignee, removeAssignee,
    createLabel, updateLabel, deleteLabel,
    addLabel, removeLabel,
    reorderLists,
  };
}