"use client";

import {
  CalendarCheck,
  Check,
  Circle,
  Columns3,
  FileText,
  GripVertical,
  Link2,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  createBoard,
  createColumn,
  createTask,
  deleteColumn,
  deleteTask,
  moveTask,
  updateColumn,
  updateTask,
} from "@/app/kanban/actions";
import { Button } from "@/components/ui/button";
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanTask,
  KanbanTaskLabel,
} from "@/db/schema";
import { cn } from "@/lib/utils";

type TaskWithLabels = KanbanTask & {
  labels: KanbanTaskLabel[];
};

type TaskDialogState =
  | {
      mode: "create";
      boardId: number;
      columnId: number;
    }
  | {
      mode: "edit";
      task: TaskWithLabels;
    };

const boardColorStyles = {
  mint: "bg-primary",
  sky: "bg-sky-500",
  coral: "bg-coral-500",
  amber: "bg-amber-500",
  lavender: "bg-violet-500",
  teal: "bg-teal-500",
} as const;

const boardColorSoftStyles = {
  mint: "bg-secondary text-secondary-foreground border-primary/20",
  sky: "bg-sky-100 text-sky-700 border-sky-200",
  coral: "bg-rose-100 text-rose-700 border-rose-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  lavender: "bg-violet-100 text-violet-700 border-violet-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
} as const;

const priorityStyles = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-sky-100 text-sky-700 border-sky-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
} as const;

const labelStyles = {
  sky: "bg-sky-100 text-sky-700 border-sky-200",
  coral: "bg-rose-100 text-rose-700 border-rose-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
} as const;

const colorOptions = [
  { value: "mint", label: "Mint" },
  { value: "sky", label: "Sky" },
  { value: "coral", label: "Coral" },
  { value: "amber", label: "Amber" },
  { value: "lavender", label: "Lavender" },
  { value: "teal", label: "Teal" },
];

const labelColorOptions = [
  { value: "sky", label: "Sky" },
  { value: "coral", label: "Coral" },
  { value: "amber", label: "Amber" },
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "teal", label: "Teal" },
];

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getBoardColor(color: string) {
  return boardColorStyles[color as keyof typeof boardColorStyles] ?? "bg-primary";
}

function getBoardSoftColor(color: string) {
  return (
    boardColorSoftStyles[color as keyof typeof boardColorSoftStyles] ??
    boardColorSoftStyles.mint
  );
}

function getPriorityStyle(priority: string) {
  return (
    priorityStyles[priority as keyof typeof priorityStyles] ??
    priorityStyles.medium
  );
}

function getLabelStyle(color: string) {
  return labelStyles[color as keyof typeof labelStyles] ?? labelStyles.teal;
}

function BoardDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedColor, setSelectedColor] = useState("mint");
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("color", selectedColor);

    startTransition(async () => {
      const boardId = await createBoard(formData);
      onClose();
      router.push(`/kanban?board=${boardId}`);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Create Kanban board</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Name the space and give it a small color cue.
            </p>
          </div>
          <Button className="h-8 w-8 rounded-lg" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form action={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Board name
            <input
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              name="name"
              placeholder="Launch plan"
              required
            />
          </label>

          <div>
            <p className="text-sm font-medium">Board color</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm",
                    getBoardSoftColor(option.value),
                    selectedColor === option.value && "ring-1 ring-ring"
                  )}
                  type="button"
                  onClick={() => setSelectedColor(option.value)}
                >
                  <span className={cn("h-3 w-3 rounded-full", getBoardColor(option.value))} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button className="rounded-lg" type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="rounded-lg" disabled={isPending} type="submit">
              {isPending ? "Creating..." : "Create board"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ColumnDialog({
  boardId,
  onClose,
}: {
  boardId: number;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    formData.set("boardId", String(boardId));

    startTransition(async () => {
      await createColumn(formData);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Add column</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Boards can hold up to five columns.
            </p>
          </div>
          <Button className="h-8 w-8 rounded-lg" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form action={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Column name
            <input
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              name="name"
              placeholder="Review"
              required
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button className="rounded-lg" type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button className="rounded-lg" disabled={isPending} type="submit">
              {isPending ? "Adding..." : "Add column"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskDialog({
  state,
  onClose,
}: {
  state: TaskDialogState;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const task = state.mode === "edit" ? state.task : null;
  const [labels, setLabels] = useState(
    task?.labels.length
      ? task.labels.map((label) => ({ name: label.name, color: label.color }))
      : [{ name: "", color: "teal" }]
  );

  function submit(formData: FormData) {
    if (state.mode === "edit") {
      formData.set("taskId", String(state.task.id));
    } else {
      formData.set("boardId", String(state.boardId));
      formData.set("columnId", String(state.columnId));
    }

    startTransition(async () => {
      if (state.mode === "edit") {
        await updateTask(formData);
      } else {
        await createTask(formData);
      }

      onClose();
    });
  }

  function removeTask() {
    if (state.mode !== "edit" || !confirm("Delete this task?")) {
      return;
    }

    const formData = new FormData();
    formData.set("taskId", String(state.task.id));
    startTransition(async () => {
      await deleteTask(formData);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {state.mode === "edit" ? "Edit task" : "Add task"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add the details that make the next move clear.
            </p>
          </div>
          <Button className="h-8 w-8 rounded-lg" size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form action={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium">
            Title
            <input
              className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              defaultValue={task?.title ?? ""}
              name="title"
              placeholder="Draft project outline"
              required
            />
          </label>

          <label className="block text-sm font-medium">
            Description
            <textarea
              className="mt-1 min-h-24 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              defaultValue={task?.description ?? ""}
              name="description"
              placeholder="Add useful context..."
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Due date
              <input
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                defaultValue={task?.dueDate ?? todayKey()}
                name="dueDate"
                required
                type="date"
              />
            </label>

            <label className="block text-sm font-medium">
              Priority
              <select
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm capitalize outline-none focus:ring-1 focus:ring-ring"
                defaultValue={task?.priority ?? "medium"}
                name="priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Labels</p>
              <Button
                className="h-8 rounded-lg px-3 text-xs"
                disabled={labels.length >= 6}
                type="button"
                variant="outline"
                onClick={() => setLabels((current) => [...current, { name: "", color: "teal" }])}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Label
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {labels.map((label, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_36px]">
                  <input
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                    name="labelName"
                    placeholder="Design"
                    value={label.name}
                    onChange={(event) =>
                      setLabels((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: event.target.value } : item
                        )
                      )
                    }
                  />
                  <select
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                    name="labelColor"
                    value={label.color}
                    onChange={(event) =>
                      setLabels((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, color: event.target.value } : item
                        )
                      )
                    }
                  >
                    {labelColorOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="h-10 rounded-lg"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setLabels((current) =>
                        current.length === 1
                          ? [{ name: "", color: "teal" }]
                          : current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/35 px-3 py-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-sky-500" />
                Sync with Calendar
              </span>
              <input
                className="h-4 w-4 accent-primary"
                defaultChecked={task?.calendarSynced ?? false}
                name="calendarSynced"
                type="checkbox"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/35 px-3 py-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <NotebookPen className="h-4 w-4 text-amber-500" />
                Link with Notes
              </span>
              <input
                className="h-4 w-4 accent-primary"
                defaultChecked={task?.notesLinked ?? false}
                name="notesLinked"
                type="checkbox"
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
            {state.mode === "edit" ? (
              <Button
                className="rounded-lg text-xs"
                disabled={isPending}
                type="button"
                variant="destructive"
                onClick={removeTask}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2 sm:justify-end">
              <Button className="flex-1 rounded-lg sm:flex-none" type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1 rounded-lg sm:flex-none" disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save task"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
}: {
  task: TaskWithLabels;
  onEdit: (task: TaskWithLabels) => void;
}) {
  return (
    <button
      className="group w-full cursor-grab rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      draggable
      type="button"
      onClick={() => onEdit(task)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/kanban-task-id", String(task.id));
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-55 transition group-hover:opacity-90" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold">{task.title}</p>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold capitalize",
            getPriorityStyle(task.priority)
          )}
        >
          {task.priority}
        </span>
        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[0.68rem] text-muted-foreground">
          {task.dueDate}
        </span>
      </div>

      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[0.66rem] font-medium",
                getLabelStyle(label.color)
              )}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-muted-foreground">
        {task.calendarSynced && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-600" title="Synced with Calendar">
            <CalendarCheck className="h-3.5 w-3.5" />
          </span>
        )}
        {task.notesLinked && (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-600" title="Linked with Notes">
            <Link2 className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </button>
  );
}

function KanbanColumnView({
  boardId,
  column,
  tasks,
  onAddTask,
  onEditTask,
}: {
  boardId: number;
  column: KanbanColumn;
  tasks: TaskWithLabels[];
  onAddTask: (columnId: number) => void;
  onEditTask: (task: TaskWithLabels) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [columnName, setColumnName] = useState(column.name);
  const [isPending, startTransition] = useTransition();

  function saveColumn() {
    const formData = new FormData();
    formData.set("boardId", String(boardId));
    formData.set("columnId", String(column.id));
    formData.set("name", columnName);
    startTransition(async () => {
      await updateColumn(formData);
      setIsEditing(false);
    });
  }

  function removeColumn() {
    if (!confirm(`Delete "${column.name}" and its tasks?`)) {
      return;
    }

    const formData = new FormData();
    formData.set("boardId", String(boardId));
    formData.set("columnId", String(column.id));
    startTransition(async () => {
      await deleteColumn(formData);
    });
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/kanban-task-id");

    if (!taskId) {
      return;
    }

    const formData = new FormData();
    formData.set("taskId", taskId);
    formData.set("targetColumnId", String(column.id));
    startTransition(async () => {
      await moveTask(formData);
    });
  }

  return (
    <section
      className={cn(
        "flex min-h-[460px] w-[286px] shrink-0 flex-col rounded-lg border border-border bg-secondary/40 p-3 shadow-sm transition",
        isPending && "opacity-80"
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-2">
        {isEditing ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <input
              className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm font-semibold outline-none focus:ring-1 focus:ring-ring"
              value={columnName}
              onChange={(event) => setColumnName(event.target.value)}
            />
            <Button className="h-8 w-8 rounded-lg" size="icon" variant="ghost" onClick={saveColumn}>
              <Check className="h-4 w-4 text-primary" />
            </Button>
          </div>
        ) : (
          <div className="flex min-w-0 items-center gap-2">
            <Circle className="h-3 w-3 shrink-0 fill-primary text-primary" />
            <h2 className="truncate text-sm font-semibold">{column.name}</h2>
            <span className="rounded-full bg-card px-2 py-0.5 text-[0.68rem] text-muted-foreground">
              {tasks.length}
            </span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <Button className="h-8 w-8 rounded-lg" size="icon" variant="ghost" onClick={() => onAddTask(column.id)}>
            <Plus className="h-4 w-4 text-teal-500" />
          </Button>
          <Button className="h-8 w-8 rounded-lg" size="icon" variant="ghost" onClick={() => setIsEditing((value) => !value)}>
            <Pencil className="h-4 w-4 text-sky-500" />
          </Button>
          <Button className="h-8 w-8 rounded-lg" size="icon" variant="ghost" onClick={removeColumn}>
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))
        ) : (
          <button
            className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-card/55 px-3 text-center text-sm text-muted-foreground transition hover:bg-card"
            type="button"
            onClick={() => onAddTask(column.id)}
          >
            Drop a task here or add a new one.
          </button>
        )}
      </div>
    </section>
  );
}

export function KanbanClient({
  boards,
  columns,
  tasks,
  labels,
  activeBoardId,
}: {
  boards: KanbanBoard[];
  columns: KanbanColumn[];
  tasks: KanbanTask[];
  labels: KanbanTaskLabel[];
  activeBoardId: number | null;
}) {
  const router = useRouter();
  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [taskDialog, setTaskDialog] = useState<TaskDialogState | null>(null);
  const activeBoard = boards.find((board) => board.id === activeBoardId) ?? null;
  const activeColumns = columns.filter((column) => column.boardId === activeBoardId);

  const tasksWithLabels = useMemo(() => {
    return tasks.map((task) => ({
      ...task,
      labels: labels.filter((label) => label.taskId === task.id),
    }));
  }, [labels, tasks]);

  const tasksByColumn = useMemo(() => {
    return tasksWithLabels.reduce<Record<number, TaskWithLabels[]>>((grouped, task) => {
      grouped[task.columnId] = grouped[task.columnId] ?? [];
      grouped[task.columnId].push(task);

      return grouped;
    }, {});
  }, [tasksWithLabels]);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Columns3 className="h-4 w-4" />
              Boards
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Switch spaces without losing the thread.
            </p>
          </div>
          <Button className="h-8 w-8 rounded-lg" size="icon" onClick={() => setBoardDialogOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {boards.length > 0 ? (
            boards.map((board) => (
              <button
                key={board.id}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm",
                  board.id === activeBoardId
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-accent"
                )}
                type="button"
                onClick={() => router.push(`/kanban?board=${board.id}`)}
              >
                <span className={cn("h-3 w-3 shrink-0 rounded-full", getBoardColor(board.color))} />
                <span className="min-w-0 flex-1 truncate font-medium">{board.name}</span>
                {board.id === activeBoardId && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
              Create your first board to start arranging tasks.
            </div>
          )}
        </div>

        <Button
          className="mt-4 w-full rounded-lg"
          type="button"
          variant="outline"
          onClick={() => setBoardDialogOpen(true)}
        >
          <Plus className="mr-1.5 h-4 w-4 text-teal-500" />
          New board
        </Button>
      </aside>

      <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm">
        {activeBoard ? (
          <>
            <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-3 w-3 rounded-full", getBoardColor(activeBoard.color))} />
                  <p className="text-sm font-semibold text-primary">Kanban board</p>
                </div>
                <h2 className="mt-1 truncate text-2xl font-semibold tracking-normal">
                  {activeBoard.name}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                  {activeColumns.length}/5 columns
                </span>
                <Button
                  className="h-9 rounded-lg px-3 text-xs"
                  disabled={activeColumns.length >= 5}
                  type="button"
                  variant="outline"
                  onClick={() => setColumnDialogOpen(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5 text-teal-500" />
                  Add column
                </Button>
              </div>
            </div>

            {activeColumns.length >= 5 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-sm text-amber-800">
                This board has the maximum of five columns.
              </div>
            )}

            <div className="mt-4 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-3">
                {activeColumns.map((column) => (
                  <KanbanColumnView
                    key={column.id}
                    boardId={activeBoard.id}
                    column={column}
                    tasks={tasksByColumn[column.id] ?? []}
                    onAddTask={(columnId) =>
                      setTaskDialog({
                        mode: "create",
                        boardId: activeBoard.id,
                        columnId,
                      })
                    }
                    onEditTask={(task) => setTaskDialog({ mode: "edit", task })}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[520px] items-center justify-center rounded-lg border border-dashed border-border bg-secondary/35 p-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-mint-100 text-mint-700">
                <FileText className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Create a board</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start with Todo, In Progress, and Done, then shape the flow from there.
              </p>
              <Button className="mt-4 rounded-lg" onClick={() => setBoardDialogOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                New board
              </Button>
            </div>
          </div>
        )}
      </section>

      {boardDialogOpen && <BoardDialog onClose={() => setBoardDialogOpen(false)} />}
      {columnDialogOpen && activeBoard && (
        <ColumnDialog boardId={activeBoard.id} onClose={() => setColumnDialogOpen(false)} />
      )}
      {taskDialog && <TaskDialog state={taskDialog} onClose={() => setTaskDialog(null)} />}
    </div>
  );
}
