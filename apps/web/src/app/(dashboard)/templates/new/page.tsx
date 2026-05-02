"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { TemplateEditor } from "@/components/template/template-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewTemplatePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const createTemplate = useMutation({
    mutationFn: (data: any) => apiClient("/templates", { method: "POST", token: token!, body: data }),
    onSuccess: () => router.push("/templates"),
  });

  return (
    <div>
      <Card>
        <CardHeader><CardTitle>Create Template</CardTitle></CardHeader>
        <CardContent>
          <TemplateEditor
            onSave={(data) => createTemplate.mutate(data)}
            onCancel={() => router.push("/templates")}
          />
        </CardContent>
      </Card>
    </div>
  );
}