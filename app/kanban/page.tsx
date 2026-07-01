import { asc, eq, inArray } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

import { KanbanClient } from "@/app/kanban/kanban-client";
import { AppShell } from "@/components/app-shell";
import {
  db,
  kanbanBoards,
  kanbanColumns,
  kanbanTaskLabels,
  kanbanTasks,
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

  const boards = await db
    .select()
    .from(kanbanBoards)
    .where(eq(kanbanBoards.userId, user.id))
    .orderBy(asc(kanbanBoards.createdAt), asc(kanbanBoards.id));
  const boardIds = boards.map((board) => board.id);
  const selectedBoardId = Number(params.board);
  const activeBoard =
    boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null;

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

  return (
    <AppShell
      eyebrow="Kanban"
      searchPlaceholder="Search boards, columns, tasks..."
      title="Move work through a calmer flow."
    >
      <KanbanClient
        activeBoardId={activeBoard?.id ?? null}
        boards={boards}
        columns={columns}
        labels={labels}
        tasks={tasks}
      />
    </AppShell>
  );
}
