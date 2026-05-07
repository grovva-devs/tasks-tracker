"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, FileIcon } from "lucide-react";

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
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", visibility);

    try {
      const res = await fetch(`/api/cards/${cardId}/attachments/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }

      const attachment = await res.json();
      setProgress(100);
      onUploaded(attachment);
      setFile(null);
      setVisibility("internal");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err: any) {
      alert(err.message || "Upload failed");
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
