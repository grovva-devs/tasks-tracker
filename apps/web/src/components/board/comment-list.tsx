"use client";

import { CommentItem } from "./comment-item";

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

interface CommentListProps {
  comments: Comment[];
  currentUserId?: string;
  currentUserRole?: string;
  publicView?: boolean;
  onUpdateComment?: (id: string, content: string) => void;
  onDeleteComment?: (id: string) => void;
}

export function CommentList({
  comments,
  currentUserId,
  currentUserRole,
  publicView,
  onUpdateComment,
  onDeleteComment,
}: CommentListProps) {
  const filtered = publicView
    ? comments.filter((c) => c.visibility === "client")
    : comments;

  if (filtered.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No comments yet</p>;
  }

  return (
    <div className="space-y-3">
      {filtered.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          publicView={publicView}
          onUpdate={onUpdateComment}
          onDelete={onDeleteComment}
        />
      ))}
    </div>
  );
}
