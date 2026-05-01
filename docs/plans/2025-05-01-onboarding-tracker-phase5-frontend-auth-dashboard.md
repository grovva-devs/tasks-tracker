# Phase 5: Frontend — Auth + Dashboard Layout + Board List — Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build the Next.js frontend: login page with JWT auth, dashboard layout with sidebar navigation, board list page with stats and filters, and "New Board" modal (from blank or template).

**Architecture:** Next.js 15 App Router with route groups: `(auth)` for login, `(dashboard)` for all authenticated pages. Zustand for auth token persistence. React Query (`@tanstack/react-query`) for data fetching. Shadcn/ui components. Middleware redirects unauthenticated users to `/login`.

**Tech Stack:** Next.js 15, Tailwind CSS, Shadcn/ui, Zustand, @tanstack/react-query, lucide-react, date-fns

**Depends on:** Phase 1 + Phase 2 + Phase 3 + Phase 4 backend complete
**Rules Hub:** `docs/plans/IMPLEMENTATION-HUB.md`
**Style Guide:** `docs/plans/STYLE-GUIDE.md` (paleta, tipografia, tom de voz)
**Kan+Focalboard UI/UX:** `docs/plans/REFERENCE-kan-focalboard-ui-ux.md` — drag-to-scroll, scroll restore, empty states, sidebar colapsível, onboarding tour, filtros, toasts

---

## 🏛️ REGRAS DE FRONTEND — OBRIGATÓRIO NESTA PHASE

> Frontend phases envolvem menos banco de dados, mas as rules de segurança e API ainda se aplicam.
> **O frontend DEVE seguir o Grovva Style Guide:** cores, tipografia, grid 8px, motion, tom de voz.
> Referência completa: `docs/plans/IMPLEMENTATION-HUB.md` e `rules/`

```
1. NUNCA exponha tokens JWT em localStorage sem proteção — use httpOnly cookies quando possível
2. NUNCA faça fetch sem tratar erros — use try/catch ou React Query onError
3. SEMPRE valide input no frontend com zod — nunca confie em server-only
4. Os endpoints da API já validam com zod — não duplique, complemente
5. NUNCA exponha dados sensíveis no client (passwordHash, internalNotes)
6. SEMPRE trate loading/error/empty states nas páginas
7. SEMPRE use paginação nas listagens (o API já pagina)
8. Middleware redireciona unauthenticated para /login
```

**Rules relevantes:**
- `rules/security-auth-jwt.md` → JWT curto + refresh token
- `rules/security-use-guards.md` → Guards no backend protegem as rotas
- `rules/security-validate-all-input.md` → Validação no frontend complementa o backend
- `rules/api-use-dto-serialization.md` → Response DTOs do backend já excluem campos sensíveis
- `rules/arch-feature-modules.md` → Organizar por feature no frontend também

---

### Task 1: Auth Middleware + Login Page

**TDD scenario:** Component test with React Testing Library

**Files:**
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/components/auth/login-form.tsx`
- Create: `apps/web/src/providers/query-provider.tsx`
- Test: `apps/web/src/components/auth/login-form.test.tsx`

**Step 1: Install testing dependencies**

```bash
cd apps/web && pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom vitest @vitejs/plugin-react
```

Create `apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `apps/web/src/test-setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

Add to `apps/web/package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 2: Create React Query provider**

Create `apps/web/src/providers/query-provider.tsx`:

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

**Step 3: Create auth middleware**

Create `apps/web/src/middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/b/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const authToken = request.cookies.get("onboarding-tracker-auth")?.value;

  if (!authToken && !pathname.startsWith("/login")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 4: Write failing test for LoginForm**

Create `apps/web/src/components/auth/login-form.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  apiClient: vi.fn().mockResolvedValue({ access_token: "test-token", user: { id: "1", email: "test@test.com", role: "admin" } }),
}));

// Mock the auth store
const mockSetAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  useAuthStore: () => ({ setAuth: mockSetAuth }),
}));

describe("LoginForm", () => {
  it("renders email and password inputs and submit button", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls setAuth on successful login", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({ email: "test@test.com" })
      );
    });
  });

  it("shows error message on failed login", async () => {
    const { apiClient } = await import("@/lib/api-client");
    (apiClient as any).mockRejectedValueOnce(new Error("Invalid credentials"));

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "bad@test.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it("disables submit button while loading", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@test.com");
    await user.type(screen.getByLabelText(/password/i), "password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Button should be disabled during loading
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
  });
});
```

**Step 5: Run test to verify it fails**

```bash
cd apps/web && pnpm test login-form.test
```

Expected: FAIL — `Cannot find module './login-form'`

**Step 6: Implement LoginForm**

Create `apps/web/src/components/auth/login-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiClient<{
        access_token: string;
        user: { id: string; email: string; role: string; displayName: string };
      }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      setAuth(result.access_token, result.user as any);
      // Set cookie for middleware
      document.cookie = `onboarding-tracker-auth=${result.access_token}; path=/; max-age=86400`;
      window.location.href = "/boards";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Onboarding Tracker</CardTitle>
        <CardDescription>Sign in to manage your client onboarding</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 7: Create login page + layout**

Create `apps/web/src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      {children}
    </div>
  );
}
```

Create `apps/web/src/app/(auth)/login/page.tsx`:

```typescript
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

**Step 8: Run test to verify it passes**

```bash
cd apps/web && pnpm test login-form.test
```

Expected: 4 tests PASS

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: add login page with JWT auth, middleware, and form tests"
```

---

### Task 2: Dashboard Layout — Sidebar + Header + Navigation

**TDD scenario:** Component test for layout rendering

**Files:**
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Create: `apps/web/src/components/layout/sidebar.tsx`
- Create: `apps/web/src/components/layout/header.tsx`
- Create: `apps/web/src/components/layout/notification-bell.tsx`
- Test: `apps/web/src/components/layout/sidebar.test.tsx`

**Step 1: Write failing test for Sidebar**

Create `apps/web/src/components/layout/sidebar.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "./sidebar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/boards",
}));

describe("Sidebar", () => {
  it("renders all navigation items", () => {
    render(<Sidebar />);

    expect(screen.getByText("Boards")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("highlights the active navigation item", () => {
    render(<Sidebar />);

    const boardsLink = screen.getByText("Boards").closest("a");
    expect(boardsLink).toHaveClass("bg-accent");
  });

  it("renders company name from settings", () => {
    render(<Sidebar companyName="Test Co" />);
    expect(screen.getByText("Test Co")).toBeInTheDocument();
  });
});
```

**Step 2: Run test — fails**

**Step 3: Implement Sidebar**

Create `apps/web/src/components/layout/sidebar.tsx`:

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  FileTemplate,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  companyName?: string;
}

const NAV_ITEMS = [
  { href: "/boards", label: "Boards", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FileTemplate },
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
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
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
```

**Step 4: Implement Header + NotificationBell**

Create `apps/web/src/components/layout/header.tsx`:

```typescript
"use client";

import { useAuthStore } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { NotificationBell } from "./notification-bell";

export function Header() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    document.cookie = "onboarding-tracker-auth=; path=/; max-age=0";
    window.location.href = "/login";
  };

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.displayName?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <User className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

Create `apps/web/src/components/layout/notification-bell.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    apiClient<{ count: number }>("/notifications/unread-count", { token })
      .then((data) => setUnreadCount(data.count))
      .catch(() => {});
  }, [token]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const data = await apiClient<Notification[]>("/notifications?unreadOnly=true", { token });
      setNotifications(data);
    } catch {}
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    await apiClient(`/notifications/${id}/read`, { method: "PATCH", token });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!token) return;
    await apiClient("/notifications/mark-all-read", { method: "POST", token });
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" onClick={fetchNotifications}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No unread notifications</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="flex cursor-pointer items-start gap-2 border-b p-2 last:border-0 hover:bg-accent/50"
                onClick={() => markAsRead(n.id)}
              >
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && (
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Step 5: Create dashboard layout**

Create `apps/web/src/app/(dashboard)/layout.tsx`:

```typescript
"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { QueryProvider } from "@/providers/query-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </QueryProvider>
  );
}
```

**Step 6: Run test — passes**

```bash
cd apps/web && pnpm test sidebar.test
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat: add dashboard layout with sidebar, header, and notification bell"
```

---

### Task 3: Board List Page — Stats + Filters + Board Cards

**TDD scenario:** Component test for board list

**Files:**
- Create: `apps/web/src/app/(dashboard)/boards/page.tsx`
- Create: `apps/web/src/components/boards/board-list.tsx`
- Create: `apps/web/src/components/boards/board-card.tsx`
- Create: `apps/web/src/components/boards/stats-cards.tsx`
- Create: `apps/web/src/components/boards/new-board-modal.tsx`
- Test: `apps/web/src/components/boards/board-card.test.tsx`
- Test: `apps/web/src/components/boards/stats-cards.test.tsx`

**Step 1: Write failing test for BoardCard**

Create `apps/web/src/components/boards/board-card.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardCard } from "./board-card";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("BoardCard", () => {
  const board = {
    id: "b1",
    title: "Acme Onboarding",
    clientName: "Acme Corp",
    status: "active" as const,
    slug: "acme-onboarding",
    publicToken: "tok123",
    createdAt: "2025-04-30T10:00:00Z",
  };

  it("renders board title and client name", () => {
    render(<BoardCard board={board} />);

    expect(screen.getByText("Acme Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("shows active status badge", () => {
    render(<BoardCard board={board} />);

    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows completion percentage when stats provided", () => {
    render(<BoardCard board={board} stats={{ totalCards: 10, completedCards: 7, completionPercentage: 70 }} />);

    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("renders a link to the board detail page", () => {
    render(<BoardCard board={board} />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/boards/b1");
  });
});
```

**Step 2: Run test — fails**

**Step 3: Implement BoardCard**

Create `apps/web/src/components/boards/board-card.tsx`:

```typescript
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPercent } from "@/lib/utils";
import { Calendar, User } from "lucide-react";

interface BoardCardProps {
  board: {
    id: string;
    title: string;
    clientName: string;
    status: string;
    publicToken: string;
    createdAt: string;
    description?: string | null;
  };
  stats?: {
    totalCards: number;
    completedCards: number;
    completionPercentage: number;
  };
}

const statusColors: Record<string, string> = {
  active: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-800",
};

export function BoardCard({ board, stats }: BoardCardProps) {
  return (
    <Link href={`/boards/${board.id}`}>
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base">{board.title}</CardTitle>
            <Badge variant="secondary" className={statusColors[board.status]}>
              {board.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              <span>{board.clientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(board.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
            {stats && stats.totalCards > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>{stats.completedCards}/{stats.totalCards} cards</span>
                  <span className="font-medium">{formatPercent(stats.completionPercentage)}</span>
                </div>
                <Progress value={stats.completionPercentage} className="h-2" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

**Step 4: Implement StatsCards**

Create `apps/web/src/components/boards/stats-cards.tsx`:

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalBoards: number;
  activeBoards: number;
  completedBoards: number;
  archivedBoards: number;
  avgCompletionPercentage: number;
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const items = [
    { title: "Total Boards", value: stats.totalBoards, icon: Layers, color: "text-blue-600" },
    { title: "Active", value: stats.activeBoards, icon: Clock, color: "text-orange-600" },
    { title: "Completed", value: stats.completedBoards, icon: CheckCircle2, color: "text-green-600" },
    { title: "Avg Completion", value: `${stats.avgCompletionPercentage}%`, icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <Icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

**Step 5: Implement NewBoardModal**

Create `apps/web/src/components/boards/new-board-modal.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { Plus } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  variables: { key: string; displayName: string; defaultValue?: string | isRequired: boolean }[];
}

interface NewBoardModalProps {
  templates?: Template[];
  onBoardCreated?: () => void;
}

export function NewBoardModal({ templates = [], onBoardCreated }: NewBoardModalProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((s) => s.token);

  const handleCreateBlank = async () => {
    setLoading(true);
    try {
      await apiClient("/boards", { method: "POST", token: token!, body: { title, clientName, clientEmail } });
      setOpen(false);
      onBoardCreated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    try {
      await apiClient(`/templates/${selectedTemplate}/apply`, {
        method: "POST",
        token: token!,
        body: { boardTitle: title, clientName, clientEmail, variables },
      });
      setOpen(false);
      onBoardCreated?.();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedTpl = templates.find((t) => t.id === selectedTemplate);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Board
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Board</DialogTitle>
          <DialogDescription>Start from scratch or use a template</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="blank">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank">Blank Board</TabsTrigger>
            <TabsTrigger value="template">From Template</TabsTrigger>
          </TabsList>

          <TabsContent value="blank" className="space-y-4">
            <div className="space-y-2">
              <Label>Board Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Acme Onboarding" />
            </div>
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. Acme Corp" required />
            </div>
            <div className="space-y-2">
              <Label>Client Email (optional)</Label>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@acme.com" />
            </div>
            <Button onClick={handleCreateBlank} disabled={!title || !clientName || loading} className="w-full">
              {loading ? "Creating..." : "Create Board"}
            </Button>
          </TabsContent>

          <TabsContent value="template" className="space-y-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => { setSelectedTemplate(tpl.id); setVariables({}); }}
                    className={`cursor-pointer rounded-md border p-3 text-sm transition-colors ${selectedTemplate === tpl.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"}`}
                  >
                    <p className="font-medium">{tpl.name}</p>
                    {tpl.description && <p className="text-muted-foreground text-xs">{tpl.description}</p>}
                  </div>
                ))}
              </div>
            </div>

            {selectedTpl?.variables && selectedTpl.variables.length > 0 && (
              <div className="space-y-2">
                <Label>Template Variables</Label>
                {selectedTpl.variables.map((v) => (
                  <div key={v.key} className="space-y-1">
                    <Label className="text-xs">
                      {v.displayName} {v.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      value={variables[v.key] ?? v.defaultValue ?? ""}
                      onChange={(e) => setVariables((prev) => ({ ...prev, [v.key]: e.target.value }))}
                      placeholder={`{{${v.key}}}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>

            <Button onClick={handleCreateFromTemplate} disabled={!selectedTemplate || !clientName || loading} className="w-full">
              {loading ? "Creating..." : "Create from Template"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 6: Implement BoardList + Board page**

Create `apps/web/src/components/boards/board-list.tsx`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { BoardCard } from "./board-card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Board {
  id: string;
  title: string;
  clientName: string;
  status: string;
  publicToken: string;
  createdAt: string;
  description?: string | null;
}

export function BoardList() {
  const token = useAuthStore((s) => s.token);
  const [search, setSearch] = useState("");

  const { data: boards = [], isLoading } = useQuery({
    queryKey: ["boards", search],
    queryFn: () =>
      apiClient<Board[]>("/boards", {
        token: token!,
        ...(search ? { search } : {}),
      }),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search boards by client name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">No boards yet</p>
          <p className="text-sm">Create your first board to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}
    </div>
  );
}
```

Create `apps/web/src/app/(dashboard)/boards/page.tsx`:

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth";
import { StatsCards } from "@/components/boards/stats-cards";
import { BoardList } from "@/components/boards/board-list";
import { NewBoardModal } from "@/components/boards/new-board-modal";

interface DashboardStats {
  totalBoards: number;
  activeBoards: number;
  completedBoards: number;
  archivedBoards: number;
  avgCompletionPercentage: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  variables: any[];
}

export default function BoardsPage() {
  const token = useAuthStore((s) => s.token);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => apiClient<DashboardStats>("/dashboard/stats", { token: token! }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => apiClient<Template[]>("/templates", { token: token! }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Boards</h1>
          <p className="text-muted-foreground">Manage your client onboarding boards</p>
        </div>
        <NewBoardModal templates={templates} />
      </div>

      {stats && <StatsCards stats={stats} />}
      <BoardList />
    </div>
  );
}
```

**Step 7: Run all tests**

```bash
cd apps/web && pnpm test
```

Expected: BoardCard + StatsCards + Sidebar + LoginForm tests PASS

**Step 8: Commit**

```bash
git add -A && git commit -m "feat: add board list page with stats, search, and new board modal (blank + template)"
```

---

**Phase 5 checkpoint:** At this point you have:
- ✅ Login page with JWT auth + form validation + error handling
- ✅ Auth middleware redirecting unauthenticated users
- ✅ Dashboard layout with sidebar navigation and notification bell
- ✅ Board list page with stats cards, search filter, board cards
- ✅ New board modal with blank + template creation paths
- ✅ React Query + Zustand + Shadcn/ui fully wired