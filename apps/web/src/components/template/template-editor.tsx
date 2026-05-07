"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { VariableFields } from "./variable-fields";
import { KanbanPreview } from "./kanban-preview";

interface TemplateEditorProps {
  initialData?: {
    name: string;
    description?: string;
    variables: { key: string; displayName: string; defaultValue?: string; isRequired: boolean }[];
    lists: { title: string; position: number; color: string | null; cards: { title: string; position: number }[] }[];
  };
  onSave: (data: any) => void;
  onCancel: () => void;
}

interface ListState {
  id: string;
  title: string;
  position: number;
  color: string | null;
  cards: { id: string; title: string; description?: string; position: number; dueDateOffsetDays: number | null }[];
}

export function TemplateEditor({ initialData, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [variables, setVariables] = useState(initialData?.variables ?? []);
  const [lists, setLists] = useState<ListState[]>(
    initialData?.lists.map((l, i) => ({
      id: `list-${i}`,
      title: l.title,
      position: l.position,
      color: l.color,
      cards: l.cards.map((c, ci) => ({
        id: `card-${i}-${ci}`,
        title: c.title,
        description: (c as any).description ?? "",
        position: c.position,
        dueDateOffsetDays: null,
      })),
    })) ?? [],
  );

  const addList = () => {
    setLists([...lists, {
      id: `list-${Date.now()}`,
      title: "",
      position: lists.length,
      color: null,
      cards: [],
    }]);
  };

  const updateList = (id: string, data: Partial<ListState>) => {
    setLists(lists.map((l) => (l.id === id ? { ...l, ...data } : l)));
  };

  const removeList = (id: string) => {
    setLists(lists.filter((l) => l.id !== id).map((l, i) => ({ ...l, position: i })));
  };

  const addCard = (listId: string) => {
    setLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, cards: [...l.cards, { id: `card-${Date.now()}`, title: "", description: "", position: l.cards.length, dueDateOffsetDays: null }] }
          : l,
      ),
    );
  };

  const updateCard = (listId: string, cardId: string, data: any) => {
    setLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, cards: l.cards.map((c) => (c.id === cardId ? { ...c, ...data } : c)) }
          : l,
      ),
    );
  };

  const removeCard = (listId: string, cardId: string) => {
    setLists(
      lists.map((l) =>
        l.id === listId
          ? { ...l, cards: l.cards.filter((c) => c.id !== cardId).map((c, i) => ({ ...c, position: i })) }
          : l,
      ),
    );
  };

  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      variables: variables.filter((v) => v.key && v.displayName),
      lists: lists.map((l) => ({
        title: l.title,
        position: l.position,
        color: l.color,
        cards: l.cards
          .filter((c) => c.title)
          .map((c) => ({
            title: c.title,
            description: c.description || undefined,
            position: c.position,
            dueDateOffsetDays: c.dueDateOffsetDays,
          })),
      })),
    });
  };

  // Build preview data from current state
  const previewLists = lists.map((l) => ({
    title: l.title,
    position: l.position,
    color: l.color,
    cards: l.cards.map((c) => ({ title: c.title, description: c.description, position: c.position })),
  }));

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tpl-name">Template Name</Label>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. SaaS Onboarding" />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this template..." rows={2} />
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6 mt-4">
          {/* Variables */}
          <VariableFields variables={variables} onChange={setVariables} />

          <Separator />

          {/* Lists + Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Lists & Cards</Label>
              <Button type="button" variant="outline" size="sm" onClick={addList}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add List
              </Button>
            </div>

            {lists.map((list) => (
              <div key={list.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={list.title}
                    onChange={(e) => updateList(list.id, { title: e.target.value })}
                    placeholder="List title (use {{variable}})"
                    className="h-8 text-sm font-medium"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeList(list.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>

                {list.cards.map((card) => (
                  <div key={card.id} className="pl-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={card.title}
                        onChange={(e) => updateCard(list.id, card.id, { title: e.target.value })}
                        placeholder="Card title"
                        className="h-7 text-sm"
                      />
                      <Input
                        type="number"
                        value={card.dueDateOffsetDays ?? ""}
                        onChange={(e) => updateCard(list.id, card.id, { dueDateOffsetDays: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="Due offset (days)"
                        className="h-7 w-28 text-sm"
                      />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCard(list.id, card.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      value={card.description ?? ""}
                      onChange={(e) => updateCard(list.id, card.id, { description: e.target.value })}
                      placeholder="Card description..."
                      className="text-xs min-h-[2.5rem]"
                      rows={2}
                    />
                  </div>
                ))}

                <Button type="button" variant="ghost" size="sm" onClick={() => addCard(list.id)} className="ml-4">
                  <Plus className="mr-1 h-3 w-3" /> Add Card
                </Button>
              </div>
            ))}

            {lists.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">No lists yet. Add lists to structure your template.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <KanbanPreview lists={previewLists} variables={variables} />
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!name}>Save Template</Button>
      </div>
    </div>
  );
}