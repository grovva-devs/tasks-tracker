"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, X, UserPlus } from "lucide-react";

interface Member {
  boardId: string;
  userId: string;
  addedAt: string;
  userEmail: string;
  userDisplayName: string;
  userAvatarUrl?: string | null;
}

interface SystemUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface BoardMembersModalProps {
  boardId: string;
}

export function BoardMembersModal({ boardId }: BoardMembersModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: members = [] } = useQuery({
    queryKey: ["board-members", boardId],
    queryFn: () => apiClient<Member[]>(`/boards/${boardId}/members`, { token: token! }),
    enabled: !!boardId && open,
  });

  const { data: systemUsers = [] } = useQuery({
    queryKey: ["system-users"],
    queryFn: () => apiClient<SystemUser[]>("/users", { token: token! }),
    enabled: open,
  });

  const addMember = useMutation({
    mutationFn: (userId: string) =>
      apiClient(`/boards/${boardId}/members`, { method: "POST", token: token!, body: { userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-members", boardId] });
      setSelectedUserId("");
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      apiClient(`/boards/${boardId}/members/${userId}`, { method: "DELETE", token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["board-members", boardId] }),
  });

  // Filter out users already in the board
  const existingMemberIds = new Set(members.map((m) => m.userId));
  const availableUsers = systemUsers.filter((u) => !existingMemberIds.has(u.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm"><Users className="mr-2 h-3.5 w-3.5" /> Members</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Board Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Select a user...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName} ({user.email})
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={() => { if (selectedUserId) { addMember.mutate(selectedUserId); } }}
              disabled={!selectedUserId || addMember.isPending}
            >
              <UserPlus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map((member) => (
              <div key={member.userId} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{member.userDisplayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.userDisplayName}</p>
                    <p className="text-xs text-muted-foreground">{member.userEmail}</p>
                  </div>
                  {member.userId === currentUser?.id && (
                    <span className="text-[10px] text-muted-foreground">(You)</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeMember.mutate(member.userId)}
                  disabled={removeMember.isPending}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No members yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
