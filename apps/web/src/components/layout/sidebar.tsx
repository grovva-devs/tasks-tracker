"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, BookTemplate, Users, Settings, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <div className="fixed top-4 left-4 z-50 lg:hidden">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card">
        <SidebarContent companyName={companyName} pathname={pathname} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 flex h-full w-64 flex-col border-r bg-card animate-in slide-in-from-left duration-200">
            <SidebarContent companyName={companyName} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({
  companyName,
  pathname,
  onNavigate,
}: {
  companyName: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center px-6 border-b">
        <Layers className="mr-2 h-6 w-6 text-primary" />
        <span className="text-lg font-semibold truncate">{companyName}</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
    </>
  );
}
