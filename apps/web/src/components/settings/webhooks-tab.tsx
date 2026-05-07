"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: string;
  httpStatus: number | null;
  errorMessage: string | null;
  attempt: number;
  createdAt: string;
}

const AVAILABLE_EVENTS = [
  "board.created", "board.completed",
  "card.created", "card.completed", "card.assigned", "card.overdue",
];

export function WebhooksTab() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: webhooks = [] } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => apiClient<Webhook[]>("/webhooks", { token: token! }),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["webhook-deliveries", expandedId],
    queryFn: () =>
      apiClient<WebhookDelivery[]>(`/webhooks/${expandedId}/deliveries`, { token: token! }),
    enabled: !!expandedId,
  });

  const create = useMutation({
    mutationFn: () => apiClient("/webhooks", { method: "POST", token: token!, body: { url: newUrl, events: selectedEvents } }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["webhooks"] }); setNewUrl(""); setSelectedEvents([]); toast.success("Webhook created!"); },
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient(`/webhooks/${id}`, { method: "PATCH", token: token!, body: { isActive } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiClient(`/webhooks/${id}`, { method: "DELETE", token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const test = useMutation({
    mutationFn: (id: string) => apiClient(`/webhooks/${id}/test`, { method: "POST", token: token! }),
    onSuccess: () => toast.success("Test webhook sent!"),
    onError: () => toast.error("Test failed"),
  });

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  };

  const statusColors: Record<string, string> = {
    delivered: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    pending: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="space-y-4">
      {/* Create new webhook */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-medium">Add Webhook</Label>
          <Input placeholder="https://example.com/webhook" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_EVENTS.map((event) => (
              <Badge
                key={event}
                variant={selectedEvents.includes(event) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleEvent(event)}
              >
                {event}
              </Badge>
            ))}
          </div>
          <Button onClick={() => create.mutate()} disabled={!newUrl || selectedEvents.length === 0}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Webhook list */}
      {webhooks.map((wh) => (
        <Card key={wh.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono truncate">{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {wh.events.map((e) => (
                    <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Switch checked={wh.isActive} onCheckedChange={(val) => toggle.mutate({ id: wh.id, isActive: val })} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => test.mutate(wh.id)}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(expandedId === wh.id ? null : wh.id)}>
                  {expandedId === wh.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete?")) remove.mutate(wh.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {expandedId === wh.id && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium mb-2">Recent Deliveries</h4>
                {deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deliveries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {deliveries.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColors[d.status] ?? ""}>{d.status}</Badge>
                          <span className="text-muted-foreground">{d.event}</span>
                          {d.httpStatus && <span className="text-xs">HTTP {d.httpStatus}</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
