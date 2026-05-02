"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, BookTemplate } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

export default function TemplatesPage() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiClient<Template[]>("/templates", { token: token! }),
  });

  const duplicate = useMutation({
    mutationFn: (id: string) => apiClient(`/templates/${id}/duplicate`, { method: "POST", token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient(`/templates/${id}`, { method: "DELETE", token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-muted-foreground">Create and manage onboarding templates</p>
        </div>
        <Link href="/templates/new">
          <Button><Plus className="mr-2 h-4 w-4" /> New Template</Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <BookTemplate className="h-12 w-12 mb-4" />
          <p className="text-lg font-medium">No templates yet</p>
          <p className="text-sm">Create your first template to streamline onboarding</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Link href={`/templates/${tpl.id}`}>
                    <CardTitle className="text-base hover:underline cursor-pointer">{tpl.name}</CardTitle>
                  </Link>
                  {tpl.isDefault && <Badge variant="secondary">Default</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {tpl.description && <p className="text-sm text-muted-foreground mb-3">{tpl.description}</p>}
                <div className="flex gap-2">
                  <Link href={`/templates/${tpl.id}`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => duplicate.mutate(tpl.id)}>Duplicate</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { if (confirm("Delete this template?")) remove.mutate(tpl.id); }}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}