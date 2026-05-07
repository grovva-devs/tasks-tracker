"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { Pencil, Trash2, X, Check } from "lucide-react";

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  currentUserRole?: string;
  publicView?: boolean;
  onUpdate?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

export function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  publicView,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = currentUserId === comment.authorId;
  const canDelete = currentUserId === comment.authorId || currentUserRole === "admin";
  const wasEdited = comment.updatedAt !== comment.createdAt;

  const handleSave = () => {
    if (editContent.trim() !== comment.content) {
      onUpdate?.(comment.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    onDelete?.(comment.id);
  };

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{comment.authorName}</span>
          {!publicView && (
            <>
              <Badge variant="outline" className="text-[10px] px-1.5">
                {comment.visibility}
              </Badge>
              {wasEdited && <span className="text-[10px] text-muted-foreground">(edited)</span>}
            </>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
          {!publicView && canEdit && !isEditing && (
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {!publicView && canDelete && !isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}><Check className="mr-1 h-3.5 w-3.5" /> Save</Button>
              <Button size="sm" variant="outline" onClick={handleCancel}><X className="mr-1 h-3.5 w-3.5" /> Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
        )}
      </div>
    </div>
  );
}
