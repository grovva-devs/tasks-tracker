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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tag, X, Pencil, Plus } from "lucide-react";

interface Label {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

interface LabelsManagerProps {
  boardId: string;
}

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#6b7280",
];

export function LabelsManager({ boardId }: LabelsManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data: labels = [] } = useQuery({
    queryKey: ["board-labels", boardId],
    queryFn: () => apiClient<Label[]>(`/boards/${boardId}/labels`, { token: token! }),
    enabled: !!boardId && open,
  });

  const createLabel = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      apiClient(`/boards/${boardId}/labels`, { method: "POST", token: token!, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-labels", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setNewName("");
      setNewColor("#3b82f6");
    },
  });

  const updateLabel = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      apiClient(`/boards/${boardId}/labels/${id}`, { method: "PATCH", token: token!, body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-labels", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setEditingId(null);
      setNewName("");
    },
  });

  const deleteLabel = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/boards/${boardId}/labels/${id}`, { method: "DELETE", token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-labels", boardId] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createLabel.mutate({ name: newName.trim(), color: newColor });
  };

  const handleUpdate = (id: string) => {
    if (!newName.trim()) return;
    updateLabel.mutate({ id, name: newName.trim(), color: newColor });
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setNewName(label.name);
    setNewColor(label.color);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm"><Tag className="mr-2 h-3.5 w-3.5" /> Labels</Button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create / Edit Form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Label name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
              />
              {editingId ? (
                <Button size="sm" onClick={() => handleUpdate(editingId)} disabled={!newName.trim()}>Save</Button>
              ) : (
                <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || createLabel.isPending}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-6 h-6 rounded-full border-2 ${newColor === c ? "border-black" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {labels.map((label) => (
              <div key={label.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" style={{ borderColor: label.color, color: label.color }}>
                    {label.name}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(label)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteLabel.mutate(label.id)}
                    disabled={deleteLabel.isPending}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {labels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No labels yet</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
