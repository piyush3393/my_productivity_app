"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray } from "drizzle-orm";

import {
  calendarItems,
  db,
  kanbanBoards,
  kanbanColumns,
  kanbanTaskLabels,
  kanbanTasks,
} from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

const defaultColumns = ["Todo", "In Progress", "Done"];
const maxColumnsPerBoard = 5;
const boardColors = ["mint", "sky", "coral", "amber", "lavender", "teal"];
const priorities = ["low", "medium", "high"];
const labelColors = ["sky", "coral", "amber", "emerald", "violet", "teal"];

const priorityCalendarMeta = {
  low: { category: "idea", categoryColor: "teal" },
  medium: { category: "work", categoryColor: "sky" },
  high: { category: "errand", categoryColor: "amber" },
} as const;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function cleanOptional(value: string) {
  return value.length > 0 ? value : null;
}

function readId(formData: FormData, key: string) {
  const id = Number(readText(formData, key));

  if (!Number.isInteger(id)) {
    throw new Error(`${key} is required.`);
  }

  return id;
}

function todayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getSyncedUserId() {
  const user = await syncCurrentUserToDatabase();

  if (!user) {
    throw new Error("You must be signed in to update Kanban boards.");
  }

  return user.id;
}

async function getUserBoard(userId: number, boardId: number) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.userId, userId)))
    .limit(1);

  if (!board) {
    throw new Error("Board not found.");
  }

  return board;
}

async function getBoardColumn(boardId: number, columnId: number) {
  const [column] = await db
    .select()
    .from(kanbanColumns)
    .where(
      and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.boardId, boardId))
    )
    .limit(1);

  if (!column) {
    throw new Error("Column not found.");
  }

  return column;
}

async function getUserTask(userId: number, taskId: number) {
  const [task] = await db
    .select({
      id: kanbanTasks.id,
      boardId: kanbanTasks.boardId,
      columnId: kanbanTasks.columnId,
      calendarItemId: kanbanTasks.calendarItemId,
      title: kanbanTasks.title,
      description: kanbanTasks.description,
      dueDate: kanbanTasks.dueDate,
      priority: kanbanTasks.priority,
      calendarSynced: kanbanTasks.calendarSynced,
      notesLinked: kanbanTasks.notesLinked,
      position: kanbanTasks.position,
    })
    .from(kanbanTasks)
    .innerJoin(kanbanBoards, eq(kanbanTasks.boardId, kanbanBoards.id))
    .where(and(eq(kanbanTasks.id, taskId), eq(kanbanBoards.userId, userId)))
    .limit(1);

  if (!task) {
    throw new Error("Task not found.");
  }

  return task;
}

function readTaskPayload(formData: FormData) {
  const title = readText(formData, "title");
  const description = cleanOptional(readText(formData, "description"));
  const dueDate = readText(formData, "dueDate") || todayKey();
  const priority = readText(formData, "priority").toLowerCase();
  const calendarSynced = readBoolean(formData, "calendarSynced");
  const notesLinked = readBoolean(formData, "notesLinked");

  if (!title) {
    throw new Error("Task title is required.");
  }

  if (!priorities.includes(priority)) {
    throw new Error("Choose a valid priority.");
  }

  return {
    title,
    description,
    dueDate,
    priority,
    calendarSynced,
    notesLinked,
  };
}

function readLabels(formData: FormData) {
  const names = formData.getAll("labelName");
  const colors = formData.getAll("labelColor");

  return names
    .map((name, index) => {
      const cleanName = typeof name === "string" ? name.trim() : "";
      const colorValue = colors[index];
      const color = typeof colorValue === "string" ? colorValue.trim() : "teal";

      return {
        name: cleanName,
        color: labelColors.includes(color) ? color : "teal",
      };
    })
    .filter((label) => label.name.length > 0)
    .slice(0, 6);
}

async function createLinkedCalendarItem(
  userId: number,
  task: {
    title: string;
    description: string | null;
    dueDate: string;
    priority: string;
  }
) {
  const meta =
    priorityCalendarMeta[task.priority as keyof typeof priorityCalendarMeta] ??
    priorityCalendarMeta.medium;
  const [item] = await db
    .insert(calendarItems)
    .values({
      userId,
      title: task.title,
      description: task.description,
      scheduledDate: task.dueDate,
      scheduledTime: null,
      category: meta.category,
      categoryColor: meta.categoryColor,
      itemType: "task",
      status: "scheduled",
    })
    .returning({ id: calendarItems.id });

  return item.id;
}

async function syncCalendarLink(
  userId: number,
  task: {
    calendarItemId: number | null;
    title: string;
    description: string | null;
    dueDate: string;
    priority: string;
    calendarSynced: boolean;
  }
) {
  if (!task.calendarSynced) {
    if (task.calendarItemId) {
      await db
        .delete(calendarItems)
        .where(
          and(
            eq(calendarItems.id, task.calendarItemId),
            eq(calendarItems.userId, userId)
          )
        );
    }

    return null;
  }

  const meta =
    priorityCalendarMeta[task.priority as keyof typeof priorityCalendarMeta] ??
    priorityCalendarMeta.medium;

  if (task.calendarItemId) {
    await db
      .update(calendarItems)
      .set({
        title: task.title,
        description: task.description,
        scheduledDate: task.dueDate,
        category: meta.category,
        categoryColor: meta.categoryColor,
        status: "scheduled",
        updatedAt: new Date(),
      })
      .where(
        and(eq(calendarItems.id, task.calendarItemId), eq(calendarItems.userId, userId))
      );

    return task.calendarItemId;
  }

  return createLinkedCalendarItem(userId, task);
}

export async function createBoard(formData: FormData) {
  const userId = await getSyncedUserId();
  const name = readText(formData, "name");
  const color = readText(formData, "color") || "mint";

  if (!name) {
    throw new Error("Board name is required.");
  }

  if (!boardColors.includes(color)) {
    throw new Error("Choose a valid board color.");
  }

  const [board] = await db
    .insert(kanbanBoards)
    .values({ userId, name, color })
    .returning({ id: kanbanBoards.id });

  await db.insert(kanbanColumns).values(
    defaultColumns.map((columnName, index) => ({
      boardId: board.id,
      name: columnName,
      position: index,
    }))
  );

  revalidatePath("/kanban");

  return board.id;
}

export async function createColumn(formData: FormData) {
  const userId = await getSyncedUserId();
  const boardId = readId(formData, "boardId");
  const name = readText(formData, "name");
  await getUserBoard(userId, boardId);

  if (!name) {
    throw new Error("Column name is required.");
  }

  const columns = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.boardId, boardId))
    .orderBy(asc(kanbanColumns.position));

  if (columns.length >= maxColumnsPerBoard) {
    throw new Error("Boards can have up to 5 columns.");
  }

  await db.insert(kanbanColumns).values({
    boardId,
    name,
    position: columns.length,
  });

  revalidatePath("/kanban");
}

export async function updateColumn(formData: FormData) {
  const userId = await getSyncedUserId();
  const boardId = readId(formData, "boardId");
  const columnId = readId(formData, "columnId");
  const name = readText(formData, "name");
  await getUserBoard(userId, boardId);
  await getBoardColumn(boardId, columnId);

  if (!name) {
    throw new Error("Column name is required.");
  }

  await db
    .update(kanbanColumns)
    .set({ name, updatedAt: new Date() })
    .where(eq(kanbanColumns.id, columnId));

  revalidatePath("/kanban");
}

export async function deleteColumn(formData: FormData) {
  const userId = await getSyncedUserId();
  const boardId = readId(formData, "boardId");
  const columnId = readId(formData, "columnId");
  await getUserBoard(userId, boardId);
  await getBoardColumn(boardId, columnId);

  const tasks = await db
    .select({
      id: kanbanTasks.id,
      calendarItemId: kanbanTasks.calendarItemId,
    })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId));
  const taskIds = tasks.map((task) => task.id);
  const calendarIds = tasks
    .map((task) => task.calendarItemId)
    .filter((id): id is number => id !== null);

  if (taskIds.length > 0) {
    await db.delete(kanbanTaskLabels).where(inArray(kanbanTaskLabels.taskId, taskIds));
    await db.delete(kanbanTasks).where(inArray(kanbanTasks.id, taskIds));
  }

  if (calendarIds.length > 0) {
    await db
      .delete(calendarItems)
      .where(
        and(inArray(calendarItems.id, calendarIds), eq(calendarItems.userId, userId))
      );
  }

  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, columnId));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function createTask(formData: FormData) {
  const userId = await getSyncedUserId();
  const boardId = readId(formData, "boardId");
  const columnId = readId(formData, "columnId");
  const payload = readTaskPayload(formData);
  const labels = readLabels(formData);
  await getUserBoard(userId, boardId);
  await getBoardColumn(boardId, columnId);

  const existingTasks = await db
    .select({ id: kanbanTasks.id })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId));
  const calendarItemId = payload.calendarSynced
    ? await createLinkedCalendarItem(userId, payload)
    : null;
  const [task] = await db
    .insert(kanbanTasks)
    .values({
      ...payload,
      boardId,
      columnId,
      calendarItemId,
      position: existingTasks.length,
    })
    .returning({ id: kanbanTasks.id });

  if (labels.length > 0) {
    await db.insert(kanbanTaskLabels).values(
      labels.map((label) => ({
        taskId: task.id,
        name: label.name,
        color: label.color,
      }))
    );
  }

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function updateTask(formData: FormData) {
  const userId = await getSyncedUserId();
  const taskId = readId(formData, "taskId");
  const payload = readTaskPayload(formData);
  const labels = readLabels(formData);
  const currentTask = await getUserTask(userId, taskId);
  const calendarItemId = await syncCalendarLink(userId, {
    calendarItemId: currentTask.calendarItemId,
    ...payload,
  });

  await db
    .update(kanbanTasks)
    .set({
      ...payload,
      calendarItemId,
      updatedAt: new Date(),
    })
    .where(eq(kanbanTasks.id, taskId));

  await db.delete(kanbanTaskLabels).where(eq(kanbanTaskLabels.taskId, taskId));

  if (labels.length > 0) {
    await db.insert(kanbanTaskLabels).values(
      labels.map((label) => ({
        taskId,
        name: label.name,
        color: label.color,
      }))
    );
  }

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function deleteTask(formData: FormData) {
  const userId = await getSyncedUserId();
  const taskId = readId(formData, "taskId");
  const task = await getUserTask(userId, taskId);

  await db.delete(kanbanTaskLabels).where(eq(kanbanTaskLabels.taskId, taskId));
  await db.delete(kanbanTasks).where(eq(kanbanTasks.id, taskId));

  if (task.calendarItemId) {
    await db
      .delete(calendarItems)
      .where(
        and(eq(calendarItems.id, task.calendarItemId), eq(calendarItems.userId, userId))
      );
  }

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function moveTask(formData: FormData) {
  const userId = await getSyncedUserId();
  const taskId = readId(formData, "taskId");
  const targetColumnId = readId(formData, "targetColumnId");
  const task = await getUserTask(userId, taskId);
  await getUserBoard(userId, task.boardId);
  await getBoardColumn(task.boardId, targetColumnId);

  const tasksInTarget = await db
    .select({ id: kanbanTasks.id })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, targetColumnId));

  await db
    .update(kanbanTasks)
    .set({
      columnId: targetColumnId,
      position: tasksInTarget.length,
      updatedAt: new Date(),
    })
    .where(eq(kanbanTasks.id, taskId));

  revalidatePath("/kanban");
}
