"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db, calendarItems } from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

const categoryColors = {
  work: "sky",
  personal: "coral",
  health: "emerald",
  learning: "lavender",
  errand: "amber",
  idea: "teal",
} as const;

const itemTypes = ["task", "reminder"] as const;
const categories = Object.keys(categoryColors);

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function cleanOptional(value: string) {
  return value.length > 0 ? value : null;
}

function readItemPayload(formData: FormData) {
  const title = readText(formData, "title");
  const description = cleanOptional(readText(formData, "description"));
  const scheduledDate = cleanOptional(readText(formData, "scheduledDate"));
  const scheduledTime = cleanOptional(readText(formData, "scheduledTime"));
  const category = readText(formData, "category");
  const itemType = readText(formData, "itemType");

  if (!title) {
    throw new Error("Task title is required.");
  }

  if (!categories.includes(category)) {
    throw new Error("Choose a valid category.");
  }

  if (!itemTypes.includes(itemType as (typeof itemTypes)[number])) {
    throw new Error("Choose a valid item type.");
  }

  return {
    title,
    description,
    scheduledDate,
    scheduledTime,
    category,
    categoryColor: categoryColors[category as keyof typeof categoryColors],
    itemType,
    status: scheduledDate ? "scheduled" : "draft",
  };
}

async function getSyncedUserId() {
  const user = await syncCurrentUserToDatabase();

  if (!user) {
    throw new Error("You must be signed in to update calendar items.");
  }

  return user.id;
}

export async function createCalendarItem(formData: FormData) {
  const userId = await getSyncedUserId();
  const payload = readItemPayload(formData);

  await db.insert(calendarItems).values({
    ...payload,
    userId,
  });

  revalidatePath("/calendar");
}

export async function updateCalendarItem(formData: FormData) {
  const userId = await getSyncedUserId();
  const id = Number(readText(formData, "id"));
  const payload = readItemPayload(formData);

  if (!Number.isInteger(id)) {
    throw new Error("Calendar item id is required.");
  }

  await db
    .update(calendarItems)
    .set({
      ...payload,
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, id), eq(calendarItems.userId, userId)));

  revalidatePath("/calendar");
}

export async function rescheduleCalendarItem(id: number, scheduledDate: string) {
  const userId = await getSyncedUserId();
  const cleanDate = scheduledDate.trim();

  if (!Number.isInteger(id) || !cleanDate) {
    throw new Error("A calendar item and date are required.");
  }

  await db
    .update(calendarItems)
    .set({
      scheduledDate: cleanDate,
      status: "scheduled",
      updatedAt: new Date(),
    })
    .where(and(eq(calendarItems.id, id), eq(calendarItems.userId, userId)));

  revalidatePath("/calendar");
}

export async function deleteCalendarItem(id: number) {
  const userId = await getSyncedUserId();

  if (!Number.isInteger(id)) {
    throw new Error("Calendar item id is required.");
  }

  await db
    .delete(calendarItems)
    .where(and(eq(calendarItems.id, id), eq(calendarItems.userId, userId)));

  revalidatePath("/calendar");
}
