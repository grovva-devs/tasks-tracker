"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface AddListFormProps {
  onAdd: (title: string) => void;
}

export function AddListForm({ onAdd }: AddListFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!isOpen) {
    return (
      <Button variant="outline" className="w-72 flex-shrink-0" onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add list
      </Button>
    );
  }

  return (
    <div className="w-72 flex-shrink-0 rounded-lg border bg-muted/50 p-3 space-y-2">
      <Input
        placeholder="List title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onAdd(title.trim());
            setTitle("");
            setIsOpen(false);
          }
          if (e.key === "Escape") { setTitle(""); setIsOpen(false); }
        }}
        autoFocus
      />
      <div className="flex gap-1">
        <Button size="sm" onClick={() => { if (title.trim()) { onAdd(title.trim()); setTitle(""); setIsOpen(false); } }} disabled={!title.trim()}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setTitle(""); setIsOpen(false); }}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}