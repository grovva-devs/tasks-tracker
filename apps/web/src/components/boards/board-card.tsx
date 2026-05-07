"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPercent } from "@/lib/utils";
import { Calendar, User } from "lucide-react";

interface BoardCardProps {
  board: {
    id: string;
    title: string;
    clientName: string;
    status: string;
    publicToken: string;
    createdAt: string;
    description?: string | null;
  };
  stats?: {
    totalCards: number;
    completedCards: number;
    completionPercentage: number;
  };
}

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-800",
};

export function BoardCard({ board, stats }: BoardCardProps) {
  return (
    <Link href={`/boards/${board.id}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{board.title}</CardTitle>
            <Badge variant="secondary" className={statusColors[board.status]}>
              {board.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            {board.description && (
              <p className="line-clamp-1 text-xs">{board.description}</p>
            )}
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              <span>{board.clientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(board.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
            {stats && stats.totalCards > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>{stats.completedCards}/{stats.totalCards} cards</span>
                  <span className="font-medium">{formatPercent(stats.completionPercentage)}</span>
                </div>
                <Progress value={stats.completionPercentage} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}