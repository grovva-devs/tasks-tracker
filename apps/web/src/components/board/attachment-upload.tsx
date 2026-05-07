"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileIcon } from "lucide-react";
import { toast } from "sonner";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/", "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument", "text/",
];

interface AttachmentUploadProps {
  cardId: string;
  token: string;
  onUploaded: (attachment: any) => void;
}

export function AttachmentUpload({ cardId, token, onUploaded }: AttachmentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState("internal");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Frontend validation
    if (selected.size > MAX_SIZE) {
      toast.error(`File too large (max ${MAX_SIZE / 1024 / 1024}MB)`);
      return;
    }
    const isAllowed = ALLOWED_TYPES.some((t) => selected.type.startsWith(t));
    if (!isAllowed) {
      toast.error("File type not allowed. Use images, PDF, Office, or text files.");
      return;
    }

    setFile(selected);
    setProgress(0);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", visibility);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/cards/${cardId}/attachments/upload`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setProgress(pct);
        }
      };

      const attachment = await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.message || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      toast.success("Attachment uploaded");
      onUploaded(attachment);
      setFile(null);
      setVisibility("internal");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {!file ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-2 h-3.5 w-3.5" /> Upload Attachment
        </Button>
      ) : (
        <div className="rounded-md border p-2 space-y-2">
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => { setFile(null); }} disabled={uploading}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              disabled={uploading}
            >
              <option value="internal">Internal</option>
              <option value="client">Client</option>
            </select>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {uploading && <Progress value={progress} className="h-1.5" />}
        </div>
      )}
    </div>
  );
}
