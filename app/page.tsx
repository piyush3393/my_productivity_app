"use client";

import {
  Bot,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Clock3,
  Columns3,
  FileText,
  LayoutDashboard,
  Leaf,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigationGroups = [
  {
    label: "Workspace",
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        color: "text-sky-500",
        active: true,
      },
      {
        label: "Pages / Spaces",
        icon: Columns3,
        color: "text-violet-500",
      },
      {
        label: "Notes",
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
        icon: ClipboardList,
        color: "text-emerald-500",
      },
      {
        label: "AI Template Builder",
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
        icon: CalendarDays,
        color: "text-coral-500",
      },
      {
        label: "Task / Kanban",
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
        icon: Settings,
        color: "text-slate-500",
      },
    ],
  },
];

const focusCards = [
  {
    title: "Today",
    value: "7",
    detail: "tasks ready",
    icon: Clock3,
    tone: "bg-sky-100 text-sky-600",
  },
  {
    title: "Ideas",
    value: "18",
    detail: "notes captured",
    icon: StickyNote,
    tone: "bg-amber-100 text-amber-600",
  },
  {
    title: "Boards",
    value: "4",
    detail: "active spaces",
    icon: Columns3,
    tone: "bg-emerald-100 text-emerald-600",
  },
];

const taskList = [
  "Outline launch planning board",
  "Review weekly notes summary",
  "Draft AI template prompt set",
];

export default function Home() {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

                    return (
                      <button
                        key={item.label}
                        className={cn(
                          "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                          item.active &&
                            "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(26,151,132,0.18)]",
                          isCollapsed && "justify-center px-0"
                        )}
                        title={isCollapsed ? item.label : undefined}
                        type="button"
                      >
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
                      </button>
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
                Dashboard
              </p>
              <h1 className="truncate text-xl font-semibold">
                Good morning, let&apos;s shape the day.
              </h1>
            </div>
            <div className="hidden min-w-[220px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground sm:flex">
              <Search className="h-4 w-4 text-sky-500" />
              <span className="truncate">Search notes, boards, tasks...</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
              <section className="grid gap-4 md:grid-cols-3">
                {focusCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <article
                      key={card.title}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {card.title}
                          </p>
                          <p className="mt-2 text-3xl font-semibold tracking-normal">
                            {card.value}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg",
                            card.tone
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {card.detail}
                      </p>
                    </article>
                  );
                })}
              </section>

              <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">Focus board</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        A light planning lane for the next useful moves.
                      </p>
                    </div>
                    <Button className="h-8 rounded-lg px-3 text-xs">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Ask AI
                    </Button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {["To plan", "In motion", "Ready"].map((column, index) => (
                      <div
                        key={column}
                        className="min-h-[178px] rounded-lg border border-border bg-secondary/45 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">
                            {column}
                          </p>
                          <span className="rounded-full bg-card px-2 py-0.5 text-[0.68rem] text-muted-foreground">
                            {index + 2}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="rounded-lg bg-card p-3 text-sm shadow-sm">
                            {taskList[index]}
                          </div>
                          <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                            Drop idea here
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">AI note pulse</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fresh summaries from your workspace.
                      </p>
                    </div>
                    <MessageCircle className="h-5 w-5 text-indigo-500" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      "Turn whiteboard clusters into a launch checklist.",
                      "Create a weekly review template from recent notes.",
                      "Schedule quiet blocks around the calendar load.",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-lg bg-secondary/45 px-3 py-3 text-sm leading-5"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
