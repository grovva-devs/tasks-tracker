"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { BoardCard } from "./board-card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Board {
  id: string;
  title: string;
  clientName: string;
  status: string;
  publicToken: string;
  createdAt: string;
}

export function BoardList() {
  const token = useAuthStore((s) => s.token);
  const [search, setSearch] = useState("");

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["boards", search],
    queryFn: () =>
      apiClient<Board[]>("/boards", {
        token: token!,
        ...(search ? { params: { search } } : {}),
      }),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search boards by client name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No boards yet</p>
          <p className="text-sm">Create your first board to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}