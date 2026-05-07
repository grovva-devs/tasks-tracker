"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, FolderOpen } from "lucide-react";

interface TemplateCategory {
  id: string;
  name: string;
  description?: string | null;
  position: number;
}

interface CategoryManagerProps {
  onSelect?: (categoryId: string | undefined) => void;
  selectedId?: string;
}

export function CategoryManager({ onSelect, selectedId }: CategoryManagerProps) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [isAdmin] = useState(() => {
    const user = useAuthStore.getState().user;
    return user?.role === "admin";
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["template-categories"],
    queryFn: () => apiClient<TemplateCategory[]>("/template-categories", { token: token! }),
    enabled: !!token,
  });

  const create = useMutation({
    mutationFn: () =>
      apiClient("/template-categories", { method: "POST", token: token!, body: { name, description } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-categories"] });
      setName("");
      setDescription("");
      setDialogOpen(false);
      toast.success("Category created");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create"),
  });

  const update = useMutation({
    mutationFn: (data: { id: string; name: string; description?: string }) =>
      apiClient(`/template-categories/${data.id}`, { method: "PATCH", token: token!, body: { name: data.name, description: data.description } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-categories"] });
      setEditing(null);
      setName("");
      setDescription("");
      setDialogOpen(false);
      toast.success("Category updated");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update"),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/template-categories/${id}`, { method: "DELETE", token: token! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-categories"] });
      toast.success("Category deleted");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete"),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (cat: TemplateCategory) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description ?? "");
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      update.mutate({ id: editing.id, name, description: description || undefined });
    } else {
      create.mutate();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FolderOpen className="h-4 w-4" /> Categories
        </h3>
        {isAdmin && (
          <Button variant="ghost" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedId === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect?.(undefined)}
        >
          All
        </Button>
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1">
            <Button
              variant={selectedId === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSelect?.(cat.id)}
            >
              {cat.name}
            </Button>
            {isAdmin && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(cat)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(cat.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!name}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
