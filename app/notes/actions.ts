"use server";

import { GoogleGenAI } from "@google/genai";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db, notes } from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

const noteColors = ["mint", "sky", "coral", "amber", "lavender", "teal"] as const;
const refineModes = [
  "improve-grammar",
  "rephrase",
  "make-shorter",
  "make-longer",
  "simplify",
  "change-tone",
] as const;
const tones = ["professional", "friendly", "confident", "casual"] as const;

export type RefineMode = (typeof refineModes)[number];
export type RefineTone = (typeof tones)[number];

const emptyNoteContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function readText(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readId(formData: FormData, key: string) {
  const id = Number(readText(formData, key));

  if (!Number.isInteger(id)) {
    throw new Error(`${key} is required.`);
  }

  return id;
}

function normalizeTitle(title: string) {
  return title.trim() || "Untitled";
}

function normalizeWordCount(value: string) {
  const count = Number(value);

  return Number.isInteger(count) && count >= 0 ? count : 0;
}

function normalizeColor(color: string) {
  return noteColors.includes(color as (typeof noteColors)[number])
    ? color
    : "amber";
}

async function getSyncedUser() {
  const user = await syncCurrentUserToDatabase();

  if (!user) {
    throw new Error("You must be signed in to update notes.");
  }

  return user;
}

async function getOwnedNote(userId: number, noteId: number) {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);

  if (!note) {
    throw new Error("Note not found.");
  }

  return note;
}

export async function createNote() {
  const user = await getSyncedUser();
  const [note] = await db
    .insert(notes)
    .values({
      userId: user.id,
      title: "Untitled",
      contentJson: emptyNoteContent,
      contentText: "",
      color: "amber",
      icon: "StickyNote",
      wordCount: 0,
    })
    .returning({ id: notes.id });

  revalidatePath("/notes");

  return note.id;
}

export async function updateNoteTitle(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  const title = normalizeTitle(readText(formData, "title"));
  await getOwnedNote(user.id, noteId);

  await db
    .update(notes)
    .set({ title, updatedAt: new Date() })
    .where(eq(notes.id, noteId));

  revalidatePath("/notes");
}

export async function updateNoteContent(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  const contentJsonRaw = readText(formData, "contentJson");
  const contentText = readText(formData, "contentText");
  const wordCount = normalizeWordCount(readText(formData, "wordCount"));
  await getOwnedNote(user.id, noteId);

  let contentJson: unknown;

  try {
    contentJson = JSON.parse(contentJsonRaw);
  } catch {
    throw new Error("Note content could not be saved.");
  }

  await db
    .update(notes)
    .set({
      contentJson,
      contentText,
      wordCount,
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  revalidatePath("/notes");
}

export async function duplicateNote(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  const note = await getOwnedNote(user.id, noteId);

  const [copy] = await db
    .insert(notes)
    .values({
      userId: user.id,
      title: `${note.title} copy`,
      contentJson: note.contentJson,
      contentText: note.contentText,
      color: note.color,
      icon: note.icon,
      isPinned: false,
      wordCount: note.wordCount,
    })
    .returning({ id: notes.id });

  revalidatePath("/notes");

  return copy.id;
}

export async function toggleNotePinned(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  const note = await getOwnedNote(user.id, noteId);

  await db
    .update(notes)
    .set({ isPinned: !note.isPinned, updatedAt: new Date() })
    .where(eq(notes.id, noteId));

  revalidatePath("/notes");
}

export async function updateNoteColor(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  const color = normalizeColor(readText(formData, "color"));
  await getOwnedNote(user.id, noteId);

  await db
    .update(notes)
    .set({ color, updatedAt: new Date() })
    .where(eq(notes.id, noteId));

  revalidatePath("/notes");
}

export async function moveNoteToTrash(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  await getOwnedNote(user.id, noteId);

  await db
    .update(notes)
    .set({
      isTrashed: true,
      isPinned: false,
      trashedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  revalidatePath("/notes");
}

export async function restoreNote(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  await getOwnedNote(user.id, noteId);

  await db
    .update(notes)
    .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
    .where(eq(notes.id, noteId));

  revalidatePath("/notes");
}

export async function permanentlyDeleteNote(formData: FormData) {
  const user = await getSyncedUser();
  const noteId = readId(formData, "noteId");
  await getOwnedNote(user.id, noteId);

  await db.delete(notes).where(eq(notes.id, noteId));

  revalidatePath("/notes");
}

export async function refineSelectedText(formData: FormData) {
  await getSyncedUser();
  const selectedText = readText(formData, "selectedText");
  const mode = readText(formData, "mode") as RefineMode;
  const tone = readText(formData, "tone") as RefineTone;

  if (!selectedText) {
    throw new Error("Select some text first.");
  }

  if (!refineModes.includes(mode)) {
    throw new Error("Choose a valid AI refine option.");
  }

  if (mode === "change-tone" && !tones.includes(tone)) {
    throw new Error("Choose a valid tone.");
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("AI Refine needs GEMINI_API_KEY in your environment.");
  }

  const instructions: Record<RefineMode, string> = {
    "improve-grammar": "Improve grammar and clarity without changing meaning.",
    rephrase: "Rephrase the text while preserving meaning.",
    "make-shorter": "Make the text shorter while preserving the key idea.",
    "make-longer": "Make the text a little longer with useful detail.",
    simplify: "Simplify the language so it is easier to understand.",
    "change-tone": `Change the tone to ${tone}.`,
  };
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: [
      "You refine selected note text for a productivity app.",
      "Return only the replacement text. Do not add quotes, markdown fences, prefaces, or explanations.",
      instructions[mode],
      "",
      selectedText,
    ].join("\n"),
  });
  const refined = response.text?.trim();

  if (!refined) {
    throw new Error("AI did not return replacement text.");
  }

  return refined;
}
