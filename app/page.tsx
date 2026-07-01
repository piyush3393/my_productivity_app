"use client";

import {
  Clock3,
  Columns3,
  MessageCircle,
  Sparkles,
  StickyNote,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <AppShell eyebrow="Dashboard" title="Good morning, let's shape the day.">
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
    </AppShell>
  );
}
