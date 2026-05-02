"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, BookTemplate, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  companyName?: string;
}

const NAV_ITEMS = [
  { href: "/boards", label: "Boards", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: BookTemplate },
  { href: "/members", label: "Members", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ companyName = "Onboarding Tracker" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <Layers className="mr-2 h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">{companyName}</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}