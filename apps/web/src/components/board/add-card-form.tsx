"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface AddCardFormProps {
  onAdd: (title: string) => void;
}

export function AddCardForm({ onAdd }: AddCardFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setIsOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add card
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Card title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) {
            onAdd(title.trim());
            setTitle("");
            setIsOpen(false);
          }
          if (e.key === "Escape") {
            setTitle("");
            setIsOpen(false);
          }
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