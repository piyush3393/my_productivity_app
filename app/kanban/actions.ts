"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import {
  calendarItems,
  db,
  kanbanBoardCollaborators,
  kanbanBoards,
  kanbanColumns,
  kanbanTaskLabels,
  kanbanTasks,
  users,
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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

async function getSyncedUser() {
  const user = await syncCurrentUserToDatabase();

  if (!user) {
    throw new Error("You must be signed in to update Kanban boards.");
  }

  await activatePendingInvites(user.id, user.email);

  return user;
}

async function activatePendingInvites(userId: number, email: string) {
  await db
    .update(kanbanBoardCollaborators)
    .set({
      userId,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(kanbanBoardCollaborators.email, normalizeEmail(email)));
}

async function getOwnedBoard(userId: number, boardId: number) {
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

async function getEditableBoard(
  user: Awaited<ReturnType<typeof getSyncedUser>>,
  boardId: number
) {
  const [board] = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.id, boardId))
    .limit(1);

  if (!board) {
    throw new Error("Board not found.");
  }

  if (board.userId === user.id) {
    return board;
  }

  const [collaborator] = await db
    .select({ id: kanbanBoardCollaborators.id })
    .from(kanbanBoardCollaborators)
    .where(
      and(
        eq(kanbanBoardCollaborators.boardId, boardId),
        eq(kanbanBoardCollaborators.email, normalizeEmail(user.email)),
        eq(kanbanBoardCollaborators.status, "active")
      )
    )
    .limit(1);

  if (!collaborator) {
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

async function getEditableTask(
  user: Awaited<ReturnType<typeof getSyncedUser>>,
  taskId: number
) {
  const [task] = await db
    .select()
    .from(kanbanTasks)
    .where(eq(kanbanTasks.id, taskId))
    .limit(1);

  if (!task) {
    throw new Error("Task not found.");
  }

  await getEditableBoard(user, task.boardId);

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
  const user = await getSyncedUser();
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
    .values({ userId: user.id, name, color })
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
  const user = await getSyncedUser();
  const boardId = readId(formData, "boardId");
  const name = readText(formData, "name");
  await getEditableBoard(user, boardId);

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
  const user = await getSyncedUser();
  const boardId = readId(formData, "boardId");
  const columnId = readId(formData, "columnId");
  const name = readText(formData, "name");
  await getEditableBoard(user, boardId);
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
  const user = await getSyncedUser();
  const boardId = readId(formData, "boardId");
  const columnId = readId(formData, "columnId");
  const board = await getEditableBoard(user, boardId);
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
        and(inArray(calendarItems.id, calendarIds), eq(calendarItems.userId, board.userId))
      );
  }

  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, columnId));

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function createTask(formData: FormData) {
  const user = await getSyncedUser();
  const boardId = readId(formData, "boardId");
  const columnId = readId(formData, "columnId");
  const payload = readTaskPayload(formData);
  const labels = readLabels(formData);
  const board = await getEditableBoard(user, boardId);
  await getBoardColumn(boardId, columnId);

  const existingTasks = await db
    .select({ id: kanbanTasks.id })
    .from(kanbanTasks)
    .where(eq(kanbanTasks.columnId, columnId));
  const calendarItemId = payload.calendarSynced
    ? await createLinkedCalendarItem(board.userId, payload)
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
  const user = await getSyncedUser();
  const taskId = readId(formData, "taskId");
  const payload = readTaskPayload(formData);
  const labels = readLabels(formData);
  const currentTask = await getEditableTask(user, taskId);
  const board = await getEditableBoard(user, currentTask.boardId);
  const calendarItemId = await syncCalendarLink(board.userId, {
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
  const user = await getSyncedUser();
  const taskId = readId(formData, "taskId");
  const task = await getEditableTask(user, taskId);
  const board = await getEditableBoard(user, task.boardId);

  await db.delete(kanbanTaskLabels).where(eq(kanbanTaskLabels.taskId, taskId));
  await db.delete(kanbanTasks).where(eq(kanbanTasks.id, taskId));

  if (task.calendarItemId) {
    await db
      .delete(calendarItems)
      .where(
        and(eq(calendarItems.id, task.calendarItemId), eq(calendarItems.userId, board.userId))
      );
  }

  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function moveTask(formData: FormData) {
  const user = await getSyncedUser();
  const taskId = readId(formData, "taskId");
  const targetColumnId = readId(formData, "targetColumnId");
  const task = await getEditableTask(user, taskId);
  await getEditableBoard(user, task.boardId);
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

export async function inviteBoardCollaborator(formData: FormData) {
  const user = await getSyncedUser();
  const boardId = readId(formData, "boardId");
  const email = normalizeEmail(readText(formData, "email"));
  await getOwnedBoard(user.id, boardId);

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (email === normalizeEmail(user.email)) {
    throw new Error("You already own this board.");
  }

  const [invitedUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  await db
    .insert(kanbanBoardCollaborators)
    .values({
      boardId,
      email,
      userId: invitedUser?.id ?? null,
      status: invitedUser ? "active" : "pending",
      invitedByUserId: user.id,
    })
    .onConflictDoUpdate({
      target: [
        kanbanBoardCollaborators.boardId,
        kanbanBoardCollaborators.email,
      ],
      set: {
        userId: invitedUser?.id ?? null,
        status: invitedUser ? "active" : "pending",
        invitedByUserId: user.id,
        updatedAt: sql`now()`,
      },
    });

  revalidatePath("/kanban");
}

export async function removeBoardCollaborator(formData: FormData) {
  const user = await getSyncedUser();
  const boardId = readId(formData, "boardId");
  const collaboratorId = readId(formData, "collaboratorId");
  await getOwnedBoard(user.id, boardId);

  await db
    .delete(kanbanBoardCollaborators)
    .where(
      and(
        eq(kanbanBoardCollaborators.id, collaboratorId),
        eq(kanbanBoardCollaborators.boardId, boardId)
      )
    );

  revalidatePath("/kanban");
}
