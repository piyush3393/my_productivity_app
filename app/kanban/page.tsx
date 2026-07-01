import { and, asc, eq, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { KanbanClient } from "@/app/kanban/kanban-client";
import { AppShell } from "@/components/app-shell";
import {
  db,
  kanbanBoardCollaborators,
  kanbanBoards,
  kanbanColumns,
  kanbanTaskLabels,
  kanbanTasks,
  users,
} from "@/db";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

type KanbanPageProps = {
  searchParams: Promise<{
    board?: string;
  }>;
};

export default async function KanbanPage({ searchParams }: KanbanPageProps) {
  await auth.protect();
  const user = await syncCurrentUserToDatabase();
  const params = await searchParams;

  if (!user) {
    return null;
  }

  const userEmail = user.email.trim().toLowerCase();

  await db
    .update(kanbanBoardCollaborators)
    .set({
      userId: user.id,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(kanbanBoardCollaborators.email, userEmail));

  const ownedBoards = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.userId, user.id))
    .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id));

  const sharedBoards = await db
    .select({
      id: kanbanBoards.id,
      userId: kanbanBoards.userId,
      name: kanbanBoards.name,
      color: kanbanBoards.color,
      createdAt: kanbanBoards.createdAt,
      updatedAt: kanbanBoards.updatedAt,
    })
    .from(kanbanBoardCollaborators)
    .innerJoin(kanbanBoards, eq(kanbanBoardCollaborators.boardId, kanbanBoards.id))
    .where(
      and(
        eq(kanbanBoardCollaborators.email, userEmail),
        eq(kanbanBoardCollaborators.status, "active")
      )
    )
    .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id));

  const boards = [
    ...ownedBoards,
    ...sharedBoards.filter(
      (sharedBoard) => !ownedBoards.some((board) => board.id === sharedBoard.id)
    ),
  ];
  const boardIds = boards.map((board) => board.id);
  const selectedBoardId = Number(params.board);
  const activeBoard =
    boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null;
  const boardAccess = boards.map((board) => ({
    boardId: board.id,
    isOwner: board.userId === user.id,
  }));

  const columns =
    boardIds.length > 0
      ? await db
          .select()
          .from(kanbanColumns)
          .where(inArray(kanbanColumns.boardId, boardIds))
          .orderBy(asc(kanbanColumns.position), asc(kanbanColumns.id))
      : [];
  const tasks =
    boardIds.length > 0
      ? await db
          .select()
          .from(kanbanTasks)
          .where(inArray(kanbanTasks.boardId, boardIds))
          .orderBy(asc(kanbanTasks.position), asc(kanbanTasks.id))
      : [];
  const taskIds = tasks.map((task) => task.id);
  const labels =
    taskIds.length > 0
      ? await db
          .select()
          .from(kanbanTaskLabels)
          .where(inArray(kanbanTaskLabels.taskId, taskIds))
          .orderBy(asc(kanbanTaskLabels.id))
      : [];
  const boardOwners =
    boardIds.length > 0
      ? await db
          .select({
            boardId: kanbanBoards.id,
            userId: users.id,
            name: users.name,
            email: users.email,
            imageUrl: users.imageUrl,
          })
          .from(kanbanBoards)
          .innerJoin(users, eq(kanbanBoards.userId, users.id))
          .where(inArray(kanbanBoards.id, boardIds))
      : [];
  const collaborators =
    boardIds.length > 0
      ? await db
          .select({
            id: kanbanBoardCollaborators.id,
            boardId: kanbanBoardCollaborators.boardId,
            userId: kanbanBoardCollaborators.userId,
            email: kanbanBoardCollaborators.email,
            status: kanbanBoardCollaborators.status,
            name: users.name,
            imageUrl: users.imageUrl,
          })
          .from(kanbanBoardCollaborators)
          .leftJoin(users, eq(kanbanBoardCollaborators.userId, users.id))
          .where(inArray(kanbanBoardCollaborators.boardId, boardIds))
          .orderBy(asc(kanbanBoardCollaborators.createdAt), asc(kanbanBoardCollaborators.id))
      : [];
  const boardMembers = [
    ...boardOwners.map((owner) => ({
      id: `owner-${owner.boardId}`,
      boardId: owner.boardId,
      userId: owner.userId,
      name: owner.name,
      email: owner.email,
      imageUrl: owner.imageUrl,
      status: "owner",
      role: "owner",
    })),
    ...collaborators.map((collaborator) => ({
      id: `collaborator-${collaborator.id}`,
      collaboratorId: collaborator.id,
      boardId: collaborator.boardId,
      userId: collaborator.userId,
      name: collaborator.name,
      email: collaborator.email,
      imageUrl: collaborator.imageUrl,
      status: collaborator.status,
      role: "collaborator",
    })),
  ];

  return (
    <AppShell
      eyebrow="Kanban"
      searchPlaceholder="Search boards, columns, tasks..."
      title="Move work through a calmer flow."
    >
      <KanbanClient
        activeBoardId={activeBoard?.id ?? null}
        boardAccess={boardAccess}
        boardMembers={boardMembers}
        boards={boards}
        columns={columns}
        labels={labels}
        tasks={tasks}
      />
    </AppShell>
  );
}
