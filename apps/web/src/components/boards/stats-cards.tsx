import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalBoards: number;
  activeBoards: number;
  completedBoards: number;
  archivedBoards: number;
  avgCompletionPercentage: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    { title: "Total Boards", value: stats.totalBoards, icon: Layers, color: "text-blue-600" },
    { title: "Active", value: stats.activeBoards, icon: Clock, color: "text-orange-600" },
    { title: "Completed", value: stats.completedBoards, icon: CheckCircle2, color: "text-green-600" },
    { title: "Avg Completion", value: `${stats.avgCompletionPercentage}%`, icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <Icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}