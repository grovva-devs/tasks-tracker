"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
  boardId: string | null;
  cardId: string | null;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    apiClient<{ count: number }>("/notifications/unread-count", { token })
      .then((data) => setUnreadCount(data.count))
      .catch(() => {});
  }, [token]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await apiClient<Notification[]>("/notifications?unreadOnly=true", { token });
      setNotifications(data);
    } catch {
      // silently fail
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    await apiClient(`/notifications/${id}/read`, { method: "PATCH", token });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!token) return;
    await apiClient("/notifications/mark-all-read", { method: "POST", token });
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleNotificationClick = async (n: Notification) => {
    await markAsRead(n.id);
    if (n.boardId) {
      const cardQuery = n.cardId ? `?cardId=${n.cardId}` : "";
      router.push(`/boards/${n.boardId}${cardQuery}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />} onClick={fetchNotifications}>
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No unread notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="flex cursor-pointer items-start gap-2 border-b p-2 last:border-0 hover:bg-accent/50"
                onClick={() => handleNotificationClick(n)}
              >
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground">{n.message}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}