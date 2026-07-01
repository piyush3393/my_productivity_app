import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";

import { NotesClient } from "@/app/notes/notes-client";
import { AppShell } from "@/components/app-shell";
import { db, notes } from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

type NotesPageProps = {
  searchParams: Promise<{
    note?: string;
  }>;
};

export default async function NotesPage({ searchParams }: NotesPageProps) {
  await auth.protect();
  const user = await syncCurrentUserToDatabase();
  const params = await searchParams;

  if (!user) {
    return null;
  }

  const activeNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, user.id), eq(notes.isTrashed, false)))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt), desc(notes.id));
  const trashedNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, user.id), eq(notes.isTrashed, true)))
    .orderBy(desc(notes.trashedAt), desc(notes.id));
  const requestedNoteId = Number(params.note);
  const selectedNote =
    activeNotes.find((note) => note.id === requestedNoteId) ?? activeNotes[0] ?? null;

  return (
    <AppShell
      eyebrow="Notes"
      searchPlaceholder="Search notes and ideas..."
      title="Write, refine, and keep your thoughts close."
    >
      <NotesClient
        activeNotes={activeNotes}
        selectedNoteId={selectedNote?.id ?? null}
        trashedNotes={trashedNotes}
      />
    </AppShell>
  );
}
