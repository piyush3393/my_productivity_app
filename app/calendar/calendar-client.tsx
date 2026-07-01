"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  createCalendarItem,
  deleteCalendarItem,
  rescheduleCalendarItem,
  updateCalendarItem,
} from "@/app/calendar/actions";
import { Button } from "@/components/ui/button";
import type { CalendarItem } from "@/db/schema";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "week";
type CalendarCategory = keyof typeof categoryStyles;

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const categoryStyles = {
  work: {
    label: "Work",
    chip: "bg-sky-100 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
  personal: {
    label: "Personal",
    chip: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-coral-500",
  },
  health: {
    label: "Health",
    chip: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  learning: {
    label: "Learning",
    chip: "bg-violet-100 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  errand: {
    label: "Errand",
    chip: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  idea: {
    label: "Idea",
    chip: "bg-teal-100 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
} as const;

type DialogState = {
  mode: "create" | "edit";
  item?: CalendarItem;
  date?: string;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);

  return next;
}

function getMonthDays(anchor: Date) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(firstOfMonth, -firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function getWeekDays(anchor: Date) {
  const start = addDays(anchor, -anchor.getDay());

  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function formatMonth(anchor: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(anchor);
}

function formatWeekRange(days: Date[]) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  });

  return `${formatter.format(days[0])} - ${formatter.format(days[6])}`;
}

function getCategoryStyle(category: string) {
  return (
    categoryStyles[category as CalendarCategory] ?? categoryStyles.work
  );
}

function CalendarItemCard({
  item,
  compact = false,
  onEdit,
}: {
  item: CalendarItem;
  compact?: boolean;
  onEdit: (item: CalendarItem) => void;
}) {
  const style = getCategoryStyle(item.category);

  return (
    <button
      className={cn(
        "group flex w-full min-w-0 cursor-grab items-start gap-2 rounded-lg border px-2 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        style.chip
      )}
      draggable
      onClick={(event) => {
        event.stopPropagation();
        onEdit(item);
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/calendar-item-id", String(item.id));
        event.dataTransfer.effectAllowed = "move";
      }}
      type="button"
    >
      <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-55" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{item.title}</span>
        {!compact && item.description && (
          <span className="mt-0.5 block line-clamp-2 text-[0.68rem] opacity-75">
            {item.description}
          </span>
        )}
        <span className="mt-1 flex items-center gap-1 text-[0.66rem] opacity-80">
          {item.scheduledTime && (
            <>
              <Clock3 className="h-3 w-3" />
              {item.scheduledTime}
            </>
          )}
          <span className="capitalize">{item.itemType}</span>
        </span>
      </span>
    </button>
  );
}

function ItemDialog({
  state,
  onClose,
}: {
  state: DialogState;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const item = state.item;

  function submit(formData: FormData) {
    startTransition(async () => {
      if (state.mode === "edit" && item) {
        formData.set("id", String(item.id));
        await updateCalendarItem(formData);
      } else {
        await createCalendarItem(formData);
      }

      onClose();
    });
  }

  function saveDraft(formData: FormData) {
    formData.set("scheduledDate", "");

    startTransition(async () => {
      if (state.mode === "edit" && item) {
        formData.set("id", String(item.id));
        await updateCalendarItem(formData);
      } else {
        await createCalendarItem(formData);
      }

      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {state.mode === "edit" ? "Edit calendar item" : "Add calendar item"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a date to schedule it, or leave the date empty for drafts.
            </p>
          </div>
          <Button className="h-8 rounded-lg px-3 text-xs" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <form action={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Task title
            <input
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              defaultValue={item?.title ?? ""}
              name="title"
              placeholder="Plan client review"
              required
            />
          </label>

          <label className="block text-sm font-medium">
            Description
            <textarea
              className="mt-1 min-h-24 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              defaultValue={item?.description ?? ""}
              name="description"
              placeholder="Add the helpful details..."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Date
              <input
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                defaultValue={item?.scheduledDate ?? state.date ?? ""}
                name="scheduledDate"
                type="date"
              />
            </label>

            <label className="block text-sm font-medium">
              Time
              <input
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                defaultValue={item?.scheduledTime ?? ""}
                name="scheduledTime"
                type="time"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Type
              <select
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                defaultValue={item?.itemType ?? "task"}
                name="itemType"
              >
                <option value="task">Task</option>
                <option value="reminder">Reminder</option>
              </select>
            </label>

            <label className="block text-sm font-medium">
              Category
              <select
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                defaultValue={item?.category ?? "work"}
                name="category"
                required
              >
                {Object.entries(categoryStyles).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(categoryStyles).map(([key, value]) => (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                  value.chip
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", value.dot)} />
                {value.label}
              </div>
            ))}
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
            {state.mode === "edit" && item ? (
              <Button
                className="rounded-lg text-xs"
                disabled={isPending}
                type="button"
                variant="destructive"
                onClick={() =>
                  startTransition(async () => {
                    await deleteCalendarItem(item.id);
                    onClose();
                  })
                }
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2 sm:justify-end">
              <Button
                className="flex-1 rounded-lg sm:flex-none"
                disabled={isPending}
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-lg sm:flex-none"
                disabled={isPending}
                formAction={saveDraft}
                type="submit"
                variant="secondary"
              >
                {isPending ? "Saving..." : "Save draft"}
              </Button>
              <Button
                className="flex-1 rounded-lg sm:flex-none"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Saving..." : "Schedule"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CalendarClient({ items }: { items: CalendarItem[] }) {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleDays = useMemo(
    () => (viewMode === "month" ? getMonthDays(anchorDate) : getWeekDays(anchorDate)),
    [anchorDate, viewMode]
  );
  const todayKey = toDateKey(new Date());
  const drafts = items.filter((item) => item.status === "draft" || !item.scheduledDate);

  const itemsByDate = useMemo(() => {
    return items.reduce<Record<string, CalendarItem[]>>((grouped, item) => {
      if (!item.scheduledDate) {
        return grouped;
      }

      grouped[item.scheduledDate] = grouped[item.scheduledDate] ?? [];
      grouped[item.scheduledDate].push(item);

      return grouped;
    }, {});
  }, [items]);

  function move(direction: -1 | 1) {
    setAnchorDate((current) => {
      const next = new Date(current);

      if (viewMode === "month") {
        next.setMonth(next.getMonth() + direction);
      } else {
        next.setDate(next.getDate() + direction * 7);
      }

      return next;
    });
  }

  function handleDrop(dateKey: string, event: React.DragEvent) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/calendar-item-id"));

    if (!Number.isInteger(id)) {
      return;
    }

    startTransition(async () => {
      await rescheduleCalendarItem(id, dateKey);
    });
  }

  return (
    <div className="mx-auto grid max-w-[1480px] gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarDays className="h-4 w-4" />
              Calendar
            </div>
            <h2 className="mt-1 truncate text-2xl font-semibold tracking-normal">
              {viewMode === "month" ? formatMonth(anchorDate) : formatWeekRange(visibleDays)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border bg-background p-1">
              {(["month", "week"] as const).map((mode) => (
                <button
                  key={mode}
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-semibold capitalize transition",
                    viewMode === mode
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  type="button"
                  onClick={() => setViewMode(mode)}
                >
                  {mode} view
                </button>
              ))}
            </div>
            <Button className="h-9 rounded-lg" size="icon" variant="outline" onClick={() => move(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button className="h-9 rounded-lg" size="icon" variant="outline" onClick={() => move(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button className="h-9 rounded-lg px-3 text-xs" onClick={() => setDialog({ mode: "create" })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add task
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 rounded-lg border border-border bg-background text-center text-xs font-semibold uppercase text-muted-foreground">
          {dayLabels.map((day) => (
            <div key={day} className="border-r border-border px-2 py-2 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        <div
          className={cn(
            "mt-2 grid grid-cols-7 overflow-hidden rounded-lg border border-border",
            viewMode === "month" ? "auto-rows-[minmax(118px,1fr)]" : "auto-rows-[minmax(420px,1fr)]"
          )}
        >
          {visibleDays.map((day) => {
            const dateKey = toDateKey(day);
            const isOutsideMonth = day.getMonth() !== anchorDate.getMonth();
            const dayItems = itemsByDate[dateKey] ?? [];

            return (
              <button
                key={dateKey}
                className={cn(
                  "min-w-0 border-r border-t border-border bg-card p-2 text-left align-top transition hover:bg-secondary/35",
                  isOutsideMonth && viewMode === "month" && "bg-muted/30 text-muted-foreground",
                  isPending && "opacity-80"
                )}
                type="button"
                onClick={() => setDialog({ mode: "create", date: dateKey })}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(dateKey, event)}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-sm font-semibold",
                      dateKey === todayKey && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="space-y-1.5">
                  {dayItems.slice(0, viewMode === "month" ? 3 : 8).map((item) => (
                    <CalendarItemCard
                      key={item.id}
                      compact={viewMode === "month"}
                      item={item}
                      onEdit={(nextItem) => setDialog({ mode: "edit", item: nextItem })}
                    />
                  ))}
                  {dayItems.length > (viewMode === "month" ? 3 : 8) && (
                    <div className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground">
                      +{dayItems.length - (viewMode === "month" ? 3 : 8)} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Draft Task Panel</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save now, schedule when the date feels right.
            </p>
          </div>
          <Button
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => setDialog({ mode: "create" })}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create draft
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {drafts.length > 0 ? (
            drafts.map((item) => (
              <CalendarItemCard
                key={item.id}
                item={item}
                onEdit={(nextItem) => setDialog({ mode: "edit", item: nextItem })}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
              Drafts you save without a date will wait here.
            </div>
          )}
        </div>

        <div className="mt-5 rounded-lg bg-secondary/45 p-3 text-xs leading-5 text-secondary-foreground">
          Drag a draft onto any date, or drag a scheduled item to a new day.
          Open an item to edit its title, description, time, and category.
        </div>
      </aside>

      {dialog && <ItemDialog state={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
