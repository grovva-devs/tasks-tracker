"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

interface BoardData {
  id: string;
  title: string;
  description: string | null;
  clientName: string;
  clientEmail: string | null;
  status: string;
}

interface EditBoardModalProps {
  board: BoardData;
  onUpdate: (data: { title?: string; description?: string; clientName?: string; clientEmail?: string }) => void;
}

export function EditBoardModal({ board, onUpdate }: EditBoardModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(board.title);
  const [description, setDescription] = useState(board.description ?? "");
  const [clientName, setClientName] = useState(board.clientName);
  const [clientEmail, setClientEmail] = useState(board.clientEmail ?? "");

  // Sync state when board prop changes (e.g., after update)
  useEffect(() => {
    setTitle(board.title);
    setDescription(board.description ?? "");
    setClientName(board.clientName);
    setClientEmail(board.clientEmail ?? "");
  }, [board.id, board.title, board.description, board.clientName, board.clientEmail]);

  const handleSave = () => {
    const changes: Record<string, string> = {};
    if (title !== board.title) changes.title = title;
    if (description !== (board.description ?? "")) changes.description = description;
    if (clientName !== board.clientName) changes.clientName = clientName;
    if (clientEmail !== (board.clientEmail ?? "")) changes.clientEmail = clientEmail;

    if (Object.keys(changes).length > 0) {
      onUpdate(changes);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="sm"><Pencil className="mr-2 h-3.5 w-3.5" /> Edit</Button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Board</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Name</label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Client Email</label>
            <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
