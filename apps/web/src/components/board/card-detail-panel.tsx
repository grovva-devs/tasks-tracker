"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { CommentList } from "./comment-list";
import { AttachmentList } from "./attachment-list";

interface CardDetailPanelProps {
  card: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    completedAt: string | null;
    labels: { id: string; name: string; color: string }[];
    comments: any[];
    attachments: any[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
  readOnly: boolean;
  publicView?: boolean;
  onAddComment?: (cardId: string, content: string, visibility: string) => void;
  onDeleteAttachment?: (id: string) => void;
  onUpdateCard?: (id: string, data: any) => void;
}

export function CardDetailPanel({
  card, isOpen, onClose, readOnly, publicView, onAddComment, onDeleteAttachment, onUpdateCard,
}: CardDetailPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("internal");

  if (!card) return null;

  const isCompleted = !!card.completedAt;
  const isOverdue = card.dueDate && !isCompleted && new Date(card.dueDate) < new Date();

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddComment?.(card.id, commentText.trim(), commentVisibility);
    setCommentText("");
  };

  const visibleComments = publicView ? card.comments.filter((c: any) => c.visibility === "client") : card.comments;
  const visibleAttachments = publicView ? card.attachments.filter((a: any) => a.visibility === "client") : card.attachments;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isCompleted && <span className="text-green-500">✓</span>}
            {card.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Labels */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.labels.map((label) => (
                <Badge key={label.id} variant="outline" style={{ borderColor: label.color, color: label.color }}>
                  {label.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          {card.description && (
            <div>
              <h4 className="text-sm font-medium mb-1">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.description}</p>
            </div>
          )}

          {/* Due Date */}
          {card.dueDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className={cn("text-sm", isOverdue && "text-destructive font-medium")}>
                Due: {formatDate(card.dueDate)}
              </span>
            </div>
          )}

          <Separator />

          {/* Tabs: Comments + Attachments */}
          <Tabs defaultValue="comments">
            <TabsList className="w-full">
              <TabsTrigger value="comments" className="flex-1">
                Comments ({visibleComments.length})
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex-1">
                Attachments ({visibleAttachments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-4 space-y-4">
              <CommentList comments={card.comments} publicView={publicView} />

              {!readOnly && !publicView && (
                <div className="space-y-2 border-t pt-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={commentVisibility === "internal" ? "default" : "outline"}
                        onClick={() => setCommentVisibility("internal")}
                      >
                        Internal
                      </Button>
                      <Button
                        size="sm"
                        variant={commentVisibility === "client" ? "default" : "outline"}
                        onClick={() => setCommentVisibility("client")}
                      >
                        Client
                      </Button>
                    </div>
                    <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()}>
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              <AttachmentList attachments={card.attachments} publicView={publicView} onDelete={onDeleteAttachment} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}