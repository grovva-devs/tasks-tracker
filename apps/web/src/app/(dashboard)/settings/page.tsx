"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandingTab } from "@/components/settings/branding-tab";
import { WebhooksTab } from "@/components/settings/webhooks-tab";
import { EmailTab } from "@/components/settings/email-tab";
import { Palette, Webhook, Mail } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage organization settings</p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding"><Palette className="mr-2 h-3.5 w-3.5" /> Branding</TabsTrigger>
          <TabsTrigger value="email"><Mail className="mr-2 h-3.5 w-3.5" /> Email</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="mr-2 h-3.5 w-3.5" /> Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="mt-4">
          <BrandingTab />
        </TabsContent>

        <TabsContent value="email" className="mt-4">
          <EmailTab />
        </TabsContent>

        <TabsContent value="webhooks" className="mt-4">
          <WebhooksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}