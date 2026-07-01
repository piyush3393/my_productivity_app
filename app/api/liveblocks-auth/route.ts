import { Liveblocks } from "@liveblocks/node";
import { and, eq } from "drizzle-orm";

import { db, kanbanBoardCollaborators, kanbanBoards } from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

const avatarColors = [
  "#0f9f8f",
  "#0ea5e9",
  "#f97316",
  "#8b5cf6",
  "#14b8a6",
  "#f43f5e",
];

function getAvatarColor(email: string) {
  const total = email.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return avatarColors[total % avatarColors.length];
}

export async function POST() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    return new Response("LIVEBLOCKS_SECRET_KEY is not configured.", { status: 500 });
  }

  const user = await syncCurrentUserToDatabase();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const email = user.email.trim().toLowerCase();

  await db
    .update(kanbanBoardCollaborators)
    .set({
      userId: user.id,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(kanbanBoardCollaborators.email, email));

  const ownedBoards = await db
    .select({ id: kanbanBoards.id })
    .from(kanbanBoards)
    .where(eq(kanbanBoards.userId, user.id));
  const sharedBoards = await db
    .select({ id: kanbanBoardCollaborators.boardId })
    .from(kanbanBoardCollaborators)
    .where(
      and(
        eq(kanbanBoardCollaborators.email, email),
        eq(kanbanBoardCollaborators.status, "active")
      )
    );

  const liveblocks = new Liveblocks({ secret });
  const session = liveblocks.prepareSession(String(user.id), {
    userInfo: {
      name: user.name || email,
      email,
      avatar: user.imageUrl || "",
      color: getAvatarColor(email),
    },
  });

  const roomIds = new Set([
    ...ownedBoards.map((board) => board.id),
    ...sharedBoards.map((board) => board.id),
  ]);

  for (const boardId of roomIds) {
    session.allow(`kanban-board:${boardId}`, ["*:write"]);
  }

  const { body, status } = await session.authorize();

  return new Response(body, { status });
}
