import { asc, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { CalendarClient } from "@/app/calendar/calendar-client";
import { AppShell } from "@/components/app-shell";
import { db, calendarItems } from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export default async function CalendarPage() {
  await auth.protect();
  const user = await syncCurrentUserToDatabase();

  const items = user
    ? await db
        .select()
        .from(calendarItems)
        .where(eq(calendarItems.userId, user.id))
        .orderBy(asc(calendarItems.scheduledDate), asc(calendarItems.scheduledTime))
    : [];

  return (
    <AppShell
      eyebrow="Calendar"
      searchPlaceholder="Search tasks, reminders, drafts..."
      title="Plan the work into gentle days."
    >
      <CalendarClient items={items} />
    </AppShell>
  );
}
