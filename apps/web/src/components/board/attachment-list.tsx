"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileIcon, Download, Trash2 } from "lucide-react";

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  visibility: string;
  uploadedBy: string;
  createdAt: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  publicView?: boolean;
  onDelete?: (id: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ attachments, publicView, onDelete }: AttachmentListProps) {
  const filtered = publicView
    ? attachments.filter((a) => a.visibility === "client")
    : attachments;

  if (filtered.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No attachments</p>;
  }

  return (
    <div className="space-y-2">
      {filtered.map((att) => (
        <div key={att.id} className="flex items-center gap-3 rounded-md border p-2">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <a href={att.fileUrl} target="_blank" className="text-sm font-medium hover:underline truncate block" rel="noreferrer">
              {att.fileName}
            </a>
            <span className="text-xs text-muted-foreground">{formatFileSize(att.fileSize)}</span>
          </div>
          {!publicView && (
            <Badge variant="outline" className="text-[10px]">{att.visibility}</Badge>
          )}
          <a href={att.fileUrl} target="_blank" download rel="noreferrer">
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Download className="h-3.5 w-3.5" />
            </Button>
          </a>
          {!publicView && onDelete && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(att.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}