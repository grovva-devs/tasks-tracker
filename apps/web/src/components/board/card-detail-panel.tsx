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
import { Calendar, UserPlus, Tag, X } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { CommentList } from "./comment-list";
import { AttachmentList } from "./attachment-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface CardDetailPanelProps {
  card: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    completedAt: string | null;
    labels: { id: string; name: string; color: string }[];
    assignees: { userId: string; displayName: string; email: string; avatarUrl?: string | null }[];
    comments: any[];
    attachments: any[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
  readOnly: boolean;
  publicView?: boolean;
  boardMembers?: { userId: string; userDisplayName: string; userEmail: string; userAvatarUrl?: string | null }[];
  boardLabels?: { id: string; name: string; color: string }[];
  onAddComment?: (cardId: string, content: string, visibility: string) => void;
  onDeleteAttachment?: (id: string) => void;
  onUpdateCard?: (id: string, data: any) => void;
  onAddAssignee?: (cardId: string, userId: string) => void;
  onRemoveAssignee?: (cardId: string, userId: string) => void;
  onAddLabel?: (cardId: string, labelId: string) => void;
  onRemoveLabel?: (cardId: string, labelId: string) => void;
}

export function CardDetailPanel({
  card, isOpen, onClose, readOnly, publicView,
  boardMembers = [], boardLabels = [],
  onAddComment, onDeleteAttachment, onUpdateCard,
  onAddAssignee, onRemoveAssignee, onAddLabel, onRemoveLabel,
}: CardDetailPanelProps) {
  const [commentText, setCommentText] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("internal");
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);

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

  // Filter out already assigned members / labels
  const assignedUserIds = new Set(card.assignees.map((a) => a.userId));
  const availableMembers = boardMembers.filter((m) => !assignedUserIds.has(m.userId));

  const assignedLabelIds = new Set(card.labels.map((l) => l.id));
  const availableLabels = boardLabels.filter((l) => !assignedLabelIds.has(l.id));

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
          <div className="flex flex-wrap items-center gap-1">
            {card.labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                className="cursor-pointer"
                style={{ borderColor: label.color, color: label.color }}
                onClick={() => !readOnly && onRemoveLabel?.(card.id, label.id)}
              >
                {label.name}
                {!readOnly && <X className="ml-1 h-2.5 w-2.5 inline" />}
              </Badge>
            ))}
            {!readOnly && availableLabels.length > 0 && (
              <div className="relative">
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowLabelDropdown(!showLabelDropdown)}>
                  <Tag className="h-3 w-3 mr-1" /> Add
                </Button>
                {showLabelDropdown && (
                  <div className="absolute z-10 mt-1 w-48 rounded-md border bg-popover shadow-md">
                    {availableLabels.map((label) => (
                      <button
                        key={label.id}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                        onClick={() => { onAddLabel?.(card.id, label.id); setShowLabelDropdown(false); }}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                        {label.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assignees */}
          {!publicView && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Assignees:</span>
              {card.assignees.map((assignee) => (
                <div key={assignee.userId} className="flex items-center gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{assignee.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignee.displayName}</span>
                  {!readOnly && (
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onRemoveAssignee?.(card.id, assignee.userId)}>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              ))}
              {!readOnly && availableMembers.length > 0 && (
                <div className="relative">
                  <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}>
                    <UserPlus className="h-3 w-3 mr-1" /> Assign
                  </Button>
                  {showAssigneeDropdown && (
                    <div className="absolute z-10 mt-1 w-56 rounded-md border bg-popover shadow-md">
                      {availableMembers.map((member) => (
                        <button
                          key={member.userId}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
                          onClick={() => { onAddAssignee?.(card.id, member.userId); setShowAssigneeDropdown(false); }}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarFallback>{member.userDisplayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {member.userDisplayName} ({member.userEmail})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
