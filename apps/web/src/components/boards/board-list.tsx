"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { BoardCard } from "./board-card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Board {
  id: string;
  title: string;
  clientName: string;
  status: string;
  publicToken: string;
  createdAt: string;
}

const TABS = [
  { label: "All", value: undefined },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

export function BoardList() {
  const token = useAuthStore((s) => s.token);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const { data: response, isLoading } = useQuery({
    queryKey: ["boards", search, activeTab],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (activeTab) params.status = activeTab;
      return apiClient<{ data: Board[]; total: number }>("/boards", {
        token: token!,
        ...(Object.keys(params).length > 0 ? { params } : {}),
      });
    },
  });

  const boards = response?.data ?? [];

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
      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Input
        placeholder="Search boards by client name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No boards found</p>
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
