"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { StatsCards } from "@/components/boards/stats-cards";
import { BoardList } from "@/components/boards/board-list";
import { NewBoardModal } from "@/components/boards/new-board-modal";

interface DashboardStats {
  totalBoards: number;
  activeBoards: number;
  completedBoards: number;
  archivedBoards: number;
  avgCompletionPercentage: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  variables: any[];
}

export default function BoardsPage() {
  const token = useAuthStore((s) => s.token);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiClient<DashboardStats>("/dashboard/stats", { token: token! }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiClient<Template[]>("/templates", { token: token! }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Boards</h1>
          <p className="text-muted-foreground">Manage your client onboarding boards</p>
        </div>
        <NewBoardModal templates={templates} />
      </div>

      {stats && <StatsCards stats={stats} />}
      <BoardList />
    </div>
  );
}