"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Columns3,
  FileText,
  LayoutDashboard,
  Leaf,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  WandSparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationGroups = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        color: "text-sky-500",
      },
      {
        label: "Pages / Spaces",
        href: "#",
        icon: Columns3,
        color: "text-violet-500",
      },
      {
        label: "Notes",
        href: "#",
        icon: StickyNote,
        color: "text-amber-500",
      },
    ],
  },
  {
    label: "Create",
    items: [
      {
        label: "Whiteboard",
        href: "#",
        icon: ClipboardList,
        color: "text-emerald-500",
      },
      {
        label: "AI Template Builder",
        href: "#",
        icon: WandSparkles,
        color: "text-fuchsia-500",
      },
    ],
  },
  {
    label: "Plan",
    items: [
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        color: "text-coral-500",
      },
      {
        label: "Task / Kanban",
        href: "/kanban",
        icon: FileText,
        color: "text-teal-500",
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "AI Assistant",
        href: "#",
        icon: Bot,
        color: "text-indigo-500",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "#",
        icon: Settings,
        color: "text-slate-500",
      },
    ],
  },
];

type AppShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  searchPlaceholder?: string;
};

export function AppShell({
  children,
  eyebrow,
  title,
  searchPlaceholder = "Search notes, boards, tasks...",
}: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen overflow-hidden">
        <aside
          className={cn(
            "flex min-h-screen shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4 shadow-[8px_0_30px_rgba(63,79,68,0.06)] transition-all duration-300",
            isCollapsed ? "w-[76px]" : "w-[248px]"
          )}
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Leaf className="h-5 w-5" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-5">
                    Canvasly
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Focus workspace
                  </p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <Button
                aria-label="Collapse sidebar"
                className="h-8 w-8 shrink-0 rounded-lg"
                size="icon"
                variant="ghost"
                onClick={() => setIsCollapsed(true)}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isCollapsed && (
            <Button
              aria-label="Expand sidebar"
              className="mt-4 h-8 w-full rounded-lg"
              size="icon"
              variant="ghost"
              onClick={() => setIsCollapsed(false)}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}

          <nav className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto">
            {navigationGroups.map((group) => (
              <section
                key={group.label}
                aria-labelledby={`sidebar-group-${group.label
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
                className={cn(
                  "rounded-lg transition-colors",
                  isCollapsed
                    ? "border-t border-border/70 pt-3 first:border-t-0 first:pt-0"
                    : "border border-border/70 bg-sidebar-accent/35 p-1.5"
                )}
                title={isCollapsed ? group.label : undefined}
              >
                <p
                  id={`sidebar-group-${group.label
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  className={cn(
                    "px-2 pb-1 text-[0.65rem] font-semibold uppercase text-muted-foreground",
                    isCollapsed && "sr-only"
                  )}
                >
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href);
                    const content = (
                      <>
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-105",
                            item.color
                          )}
                        />
                        {!isCollapsed && (
                          <span className="min-w-0 truncate">
                            {item.label}
                          </span>
                        )}
                      </>
                    );
                    const className = cn(
                      "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                      isActive &&
                        "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(26,151,132,0.18)]",
                      isCollapsed && "justify-center px-0"
                    );

                    if (item.href === "#") {
                      return (
                        <button
                          key={item.label}
                          className={className}
                          title={isCollapsed ? item.label : undefined}
                          type="button"
                        >
                          {content}
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={item.label}
                        className={className}
                        href={item.href}
                        title={isCollapsed ? item.label : undefined}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div
            className={cn(
              "mt-4 rounded-lg border border-border bg-background/70 p-2",
              isCollapsed && "flex justify-center border-transparent bg-transparent p-0"
            )}
          >
            {isCollapsed ? (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint-100 text-mint-700"
                title="Personal workspace"
              >
                <Sparkles className="h-4 w-4" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mint-100 text-mint-700">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    Personal workspace
                  </p>
                  <p className="truncate text-[0.7rem] text-muted-foreground">
                    Synced and calm
                  </p>
                </div>
                <CircleHelp className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-5 backdrop-blur">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {eyebrow}
              </p>
              <h1 className="truncate text-xl font-semibold">{title}</h1>
            </div>
            <div className="hidden min-w-[220px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground sm:flex">
              <Search className="h-4 w-4 text-sky-500" />
              <span className="truncate">{searchPlaceholder}</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
