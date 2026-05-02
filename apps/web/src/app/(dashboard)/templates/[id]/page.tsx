"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { TemplateEditor } from "@/components/template/template-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const templateId = params.id as string;

  const { data: template, isLoading } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => apiClient<any>(`/templates/${templateId}`, { token: token! }),
  });

  const updateTemplate = useMutation({
    mutationFn: (data: any) => apiClient(`/templates/${templateId}`, { method: "PATCH", token: token!, body: data }),
    onSuccess: () => router.push("/templates"),
  });

  if (isLoading) return <div className="animate-pulse h-96 bg-muted rounded-lg" />;

  return (
    <Card>
      <CardHeader><CardTitle>Edit Template</CardTitle></CardHeader>
      <CardContent>
        <TemplateEditor
          initialData={template}
          onSave={(data) => updateTemplate.mutate(data)}
          onCancel={() => router.push("/templates")}
        />
      </CardContent>
    </Card>
  );
}