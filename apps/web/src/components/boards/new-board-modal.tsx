"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Plus } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  variables: { key: string; displayName: string; defaultValue?: string; isRequired: boolean }[];
}

interface NewBoardModalProps {
  templates?: Template[];
  onBoardCreated?: () => void;
}

export function NewBoardModal({ templates = [], onBoardCreated }: NewBoardModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);

  const handleCreateBlank = async () => {
    setLoading(true);
    try {
      await apiClient("/boards", { method: "POST", token: token!, body: { title, clientName, clientEmail } });
      setOpen(false);
      onBoardCreated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      await apiClient(`/templates/${selectedTemplate}/apply`, {
        method: "POST",
        token: token!,
        body: { boardTitle: title, clientName, clientEmail, variables },
      });
      setOpen(false);
      onBoardCreated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTpl = templates.find((t) => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="mr-2 h-4 w-4" />
        New Board
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>Start from scratch or use a template</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="blank">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank">Blank Board</TabsTrigger>
            <TabsTrigger value="template">From Template</TabsTrigger>
          </TabsList>

          <TabsContent value="blank" className="space-y-4">
            <div className="space-y-2">
              <Label>Board Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Acme Onboarding" />
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Corp" required />
            </div>
            <div className="space-y-2">
              <Label>Client Email (optional)</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@acme.com" />
            </div>
            <Button onClick={handleCreateBlank} disabled={!title || !clientName || loading} className="w-full">
              {loading ? "Creating..." : "Create Board"}
            </Button>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => { setSelectedTemplate(tpl.id); setVariables({}); }}
                    className={`cursor-pointer rounded-md border p-3 text-sm transition-colors ${selectedTemplate === tpl.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"}`}
                  >
                    <p className="font-medium">{tpl.name}</p>
                    {tpl.description && <p className="text-xs text-muted-foreground">{tpl.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            {selectedTpl?.variables && selectedTpl.variables.length > 0 && (
              <div className="space-y-2">
                <Label>Template Variables</Label>
                {selectedTpl.variables.map((v) => (
                  <div key={v.key} className="space-y-1">
                    <Label className="text-xs">
                      {v.displayName} {v.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={variables[v.key] ?? v.defaultValue ?? ""}
                      onChange={(e) => setVariables((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={`{{${v.key}}}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>

            <Button onClick={handleCreateFromTemplate} disabled={!selectedTemplate || !clientName || loading} className="w-full">
              {loading ? "Creating..." : "Create from Template"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}