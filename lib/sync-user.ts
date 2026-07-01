import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";

import { db, users } from "@/db";

export async function syncCurrentUserToDatabase() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = user.primaryEmailAddress?.emailAddress;

  if (!email) {
    throw new Error("Signed-in Clerk user does not have a primary email address.");
  }

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null;
  const imageUrl = user.imageUrl || null;

  const [syncedUser] = await db
    .insert(users)
    .values({
      clerkUserId: user.id,
      name,
      email,
      imageUrl,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        name,
        email,
        imageUrl,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return syncedUser;
}
