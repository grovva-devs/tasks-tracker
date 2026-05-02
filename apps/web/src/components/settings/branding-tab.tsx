"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function BrandingTab() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiClient<any>("/settings", { token: token! }),
  });

  const update = useMutation({
    mutationFn: (data: any) => apiClient("/settings", { method: "PATCH", token: token!, body: data }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved!"); },
  });

  const [companyName, setCompanyName] = useState(settings?.companyName ?? "");
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(settings?.primaryColor ?? "#3B82F6");

  // Sync when data loads
  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName ?? "");
      setLogoUrl(settings.logoUrl ?? "");
      setPrimaryColor(settings.primaryColor ?? "#3B82F6");
    }
  }, [settings]);

  return (
    <div className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label>Company Name</Label>
        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Logo URL</Label>
        <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label>Primary Color</Label>
        <div className="flex gap-2">
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border" />
          <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
        </div>
      </div>
      <Button onClick={() => update.mutate({ companyName, logoUrl, primaryColor })} disabled={update.isPending}>
        {update.isPending ? "Saving..." : "Save Branding"}
      </Button>
    </div>
  );
}