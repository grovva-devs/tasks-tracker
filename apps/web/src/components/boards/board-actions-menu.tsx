"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface BoardActionsMenuProps {
  boardId: string;
  boardTitle: string;
  onArchive: () => void;
  onDelete: () => void;
}

export function BoardActionsMenu({ boardId, boardTitle, onArchive, onDelete }: BoardActionsMenuProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [action, setAction] = useState<"archive" | "delete" | null>(null);

  const handleArchive = () => {
    onArchive();
    setConfirmOpen(false);
  };

  const handleDelete = () => {
    if (confirmText !== boardTitle) return;
    onDelete();
    setConfirmOpen(false);
    router.push("/boards");
  };

  const openConfirm = (type: "archive" | "delete") => {
    setAction(type);
    setConfirmText("");
    setConfirmOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>} />
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => openConfirm("archive")}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openConfirm("delete")} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {action === "archive" ? "Archive Board" : "Delete Board"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {action === "archive" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to archive <strong>{boardTitle}</strong>?
                  Archived boards can still be viewed but won't appear in the active list.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                  <Button variant="default" onClick={handleArchive}>Archive</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This will archive and hide <strong>{boardTitle}</strong>.
                  Only admins can restore it later.
                  Type the board title below to confirm:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={`Type "${boardTitle}" to confirm`}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={confirmText !== boardTitle}
                  >
                    Delete
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
