"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";

interface Comment {
  id: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  visibility: string;
  createdAt: string;
}

interface CommentListProps {
  comments: Comment[];
  publicView?: boolean;
}

export function CommentList({ comments, publicView }: CommentListProps) {
  const filtered = publicView
    ? comments.filter((c) => c.visibility === "client")
    : comments;

  if (filtered.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No comments yet</p>;
  }

  return (
    <div className="space-y-3">
      {filtered.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{comment.authorName}</span>
              {!publicView && (
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {comment.visibility}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}