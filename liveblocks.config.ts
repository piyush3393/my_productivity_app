declare global {
  interface Liveblocks {
    Presence: {
      boardId: number | null;
      taskId: number | null;
      activity: string;
    };
    UserMeta: {
      id: string;
      info: {
        name: string;
        email: string;
        avatar: string;
        color: string;
      };
    };
    ThreadMetadata: {
      boardId: number;
      taskId: number;
      kind: "kanban-task";
    };
  }
}

export {};
