"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

interface Variable {
  key: string;
  displayName: string;
  defaultValue?: string;
  isRequired: boolean;
}

interface VariableFieldsProps {
  variables: Variable[];
  onChange: (variables: Variable[]) => void;
}

export function VariableFields({ variables, onChange }: VariableFieldsProps) {
  const add = () => {
    onChange([...variables, { key: "", displayName: "", isRequired: true }]);
  };

  const update = (index: number, field: keyof Variable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const remove = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Template Variables</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Variable
        </Button>
      </div>

      {variables.map((v, i) => (
        <div key={i} className="flex items-end gap-2 rounded-md border p-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Key</Label>
            <Input
              placeholder="e.g. client_name"
              value={v.key}
              onChange={(e) => update(i, "key", e.target.value.replace(/\s/g, "_"))}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Display Name</Label>
            <Input
              placeholder="e.g. Client Name"
              value={v.displayName}
              onChange={(e) => update(i, "displayName", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="w-24 space-y-1">
            <Label className="text-xs">Default</Label>
            <Input
              placeholder="Optional"
              value={v.defaultValue ?? ""}
              onChange={(e) => update(i, "defaultValue", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 pb-1">
            <Switch checked={v.isRequired} onCheckedChange={(val) => update(i, "isRequired", val)} />
            <Label className="text-xs">Req</Label>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      {variables.length === 0 && (
        <p className="text-sm text-muted-foreground py-2">
          No variables. Add variables like <code className="text-xs bg-muted px-1 rounded">{"{{client_name}}"}</code> to use in titles.
        </p>
      )}
    </div>
  );
}