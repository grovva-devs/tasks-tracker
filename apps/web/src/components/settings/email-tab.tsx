"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, TestTube } from "lucide-react";

interface EmailSettings {
  emailFrom?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
}

export function EmailTab() {
  const token = useAuthStore((s) => s.token);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings-full"],
    queryFn: () => apiClient<EmailSettings>("/settings", { token: token! }),
    enabled: !!token,
  });

  const [form, setForm] = useState<{
    emailFrom: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
    smtpPassword: string;
  }>({
    emailFrom: "",
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPassword: "",
  });

  useState(() => {
    if (settings) {
      setForm({
        emailFrom: settings.emailFrom ?? "",
        smtpHost: settings.smtpHost ?? "",
        smtpPort: settings.smtpPort?.toString() ?? "",
        smtpUser: settings.smtpUser ?? "",
        smtpPassword: "",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<typeof form>) =>
      apiClient("/settings", { method: "PATCH", token: token!, body: data }),
    onSuccess: () => toast.success("Email settings saved"),
    onError: (err: any) => toast.error(err?.message || "Failed to save"),
  });

  const testMutation = useMutation({
    mutationFn: () =>
      apiClient("/settings/test-email", { method: "POST", token: token! }),
    onSuccess: () => toast.success("Test email sent"),
    onError: (err: any) => toast.error(err?.message || "Failed to send test email"),
  });

  const handleSave = () => {
    const payload: any = {};
    if (form.emailFrom) payload.emailFrom = form.emailFrom;
    if (form.smtpHost) payload.smtpHost = form.smtpHost;
    if (form.smtpPort) payload.smtpPort = parseInt(form.smtpPort, 10);
    if (form.smtpUser) payload.smtpUser = form.smtpUser;
    if (form.smtpPassword) payload.smtpPassword = form.smtpPassword;
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emailFrom">From Address</Label>
          <Input
            id="emailFrom"
            placeholder="noreply@example.com"
            value={form.emailFrom}
            onChange={(e) => setForm((f) => ({ ...f, emailFrom: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtpHost">SMTP Host</Label>
          <Input
            id="smtpHost"
            placeholder="smtp.example.com"
            value={form.smtpHost}
            onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtpPort">SMTP Port</Label>
          <Input
            id="smtpPort"
            type="number"
            placeholder="587"
            value={form.smtpPort}
            onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtpUser">SMTP User</Label>
          <Input
            id="smtpUser"
            placeholder="user@example.com"
            value={form.smtpUser}
            onChange={(e) => setForm((f) => ({ ...f, smtpUser: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtpPassword">SMTP Password</Label>
          <Input
            id="smtpPassword"
            type="password"
            placeholder="••••••••"
            value={form.smtpPassword}
            onChange={(e) => setForm((f) => ({ ...f, smtpPassword: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Leave empty to keep current password.</p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
          >
            <TestTube className="mr-2 h-4 w-4" />
            Send Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
