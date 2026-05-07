"use client";

import { useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, UserPlus, Tag, X, Pencil, Save } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { CommentList } from "./comment-list";
import { AttachmentList } from "./attachment-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useClickOutside } from "@/hooks/use-click-outside";

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
  boardMembers?: { userId: string; displayName: string; email: string; avatarUrl?: string | null }[];
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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const labelDropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(assigneeDropdownRef, () => setShowAssigneeDropdown(false));
  useClickOutside(labelDropdownRef, () => setShowLabelDropdown(false));

  if (!card) return null;

  const isCompleted = !!card.completedAt;
  const isOverdue = card.dueDate && !isCompleted && new Date(card.dueDate) < new Date();

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    onAddComment?.(card.id, commentText.trim(), commentVisibility);
    setCommentText("");
  };

  const startEditing = () => {
    setEditTitle(card.title);
    setEditDescription(card.description ?? "");
    setEditDueDate(card.dueDate ?? "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const changes: Record<string, string | null> = {};
    if (editTitle !== card.title) changes.title = editTitle;
    if (editDescription !== (card.description ?? "")) changes.description = editDescription;
    if (editDueDate !== (card.dueDate ?? "")) changes.dueDate = editDueDate || null;

    if (Object.keys(changes).length > 0) {
      setIsSaving(true);
      onUpdateCard?.(card.id, changes);
      // Keep editing mode until parent re-renders with updated card (or timeout)
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
      }, 500);
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const visibleComments = publicView ? card.comments.filter((c: any) => c.visibility === "client") : card.comments;
  const visibleAttachments = publicView ? card.attachments.filter((a: any) => a.visibility === "client") : card.attachments;

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
            {isEditing ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1"
              />
            ) : (
              card.title
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Edit/Save Controls */}
          {!readOnly && !publicView && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-1 h-3.5 w-3.5" /> {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" onClick={startEditing}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>
          )}

          {/* Labels */}
          <div className="flex flex-wrap items-center gap-1">
            {card.labels.map((label) => (
              <div key={label.id} className="flex items-center gap-0.5">
                <Badge
                  variant="outline"
                  style={{ borderColor: label.color, color: label.color }}
                >
                  {label.name}
                </Badge>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4"
                    onClick={() => onRemoveLabel?.(card.id, label.id)}
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                )}
              </div>
            ))}
            {!readOnly && availableLabels.length > 0 && (
              <div className="relative" ref={labelDropdownRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                >
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Assignees:</span>
              {card.assignees.map((assignee) => (
                <div key={assignee.userId} className="flex items-center gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{assignee.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignee.displayName}</span>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onRemoveAssignee?.(card.id, assignee.userId)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  )}
                </div>
              ))}
              {!readOnly && availableMembers.length > 0 && (
                <div className="relative" ref={assigneeDropdownRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  >
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
                            <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {member.displayName} ({member.email})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium mb-1">Description</h4>
            {isEditing ? (
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
              />
            ) : card.description ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{card.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description</p>
            )}
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {isEditing ? (
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              />
            ) : card.dueDate ? (
              <span className={cn("text-sm", isOverdue && "text-destructive font-medium")}>
                Due: {formatDate(card.dueDate)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">No due date</span>
            )}
          </div>

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
