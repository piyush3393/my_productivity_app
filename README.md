# Canvasly

A cozy productivity workspace built with the Next.js App Router. Canvasly combines structured planning (Calendar, Kanban) with a warm, focused UI — with room to grow into notes, whiteboards, and AI-assisted workflows.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 App Router + React 19 |
| Language | TypeScript (strict, `@/*` path alias) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix, CVA, Lucide) |
| Auth | Clerk via `proxy.ts` |
| Database | Neon serverless Postgres |
| ORM | Drizzle ORM + Drizzle Kit migrations |
| Data flow | Server Components fetch → Client Components interact → Server Actions mutate → `revalidatePath()` |

No REST API routes. No global client state (Redux, Zustand, React Query).

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in values:

   ```
   DATABASE_URL=
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. Install dependencies and push the schema:

   ```bash
   npm install
   npm run db:push
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

## Project Structure

```
my_productivity_app/
├── app/                    # Next.js App Router — pages & feature logic
│   ├── layout.tsx          # Root layout (ClerkProvider, globals.css)
│   ├── page.tsx            # Dashboard (static mock data)
│   ├── globals.css         # Tailwind 4 + design tokens
│   ├── calendar/           # Calendar feature
│   │   ├── page.tsx        # Server: fetch items, render shell
│   │   ├── calendar-client.tsx
│   │   └── actions.ts      # Server Actions: CRUD + reschedule
│   ├── kanban/             # Kanban feature
│   │   ├── page.tsx        # Server: fetch boards/columns/tasks
│   │   ├── kanban-client.tsx
│   │   └── actions.ts      # Server Actions + calendar sync
│   ├── sign-in/            # Clerk sign-in
│   ├── sign-up/            # Clerk sign-up
│   └── sync-user/          # Post-auth: upsert user to DB
├── components/
│   ├── app-shell.tsx       # Sidebar layout + navigation
│   └── ui/                 # shadcn primitives (button, card)
├── db/
│   ├── schema.ts           # Drizzle table definitions
│   └── index.ts            # Neon client + Drizzle instance
├── lib/
│   ├── sync-user.ts        # Clerk → Postgres user sync
│   └── utils.ts            # Tailwind cn() helper
├── drizzle/                # SQL migrations (0000–0002)
├── proxy.ts                # Clerk auth middleware
└── theme.md                # Design system doc ("Canvasly Cozy UI")
```

## Architecture

Every protected feature follows the same request pattern:

1. `auth.protect()` — redirect unauthenticated users
2. `syncCurrentUserToDatabase()` — ensure Clerk user exists in Postgres
3. Server-side Drizzle query — fetch data for the current user
4. `<AppShell>` — wrap content in the sidebar layout
5. Client component — receive data as props, handle UI interactions
6. Server Actions — mutations from forms/drag-drop, then cache revalidation

## Routes

| Route | Status |
|-------|--------|
| `/` | Placeholder — hardcoded stats, not DB-backed |
| `/calendar` | Live — CRUD, month/week views, drag reschedule |
| `/kanban` | Live — boards, columns, tasks, labels, drag-drop |
| `/sign-in`, `/sign-up` | Live — redirect to `/sync-user` after auth |
| `/sync-user` | Live — upserts user, redirects to `/` |
| Notes, Whiteboard, AI, Settings | Placeholder sidebar links (`href="#"`) |

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Local mirror of Clerk users |
| `calendar_items` | Tasks/reminders with date, time, category, status |
| `kanban_boards` | Per-user boards with name and color |
| `kanban_columns` | Columns per board (Todo, In Progress, Done) |
| `kanban_tasks` | Tasks with due date, priority, optional calendar link |
| `kanban_task_labels` | Colored labels on tasks |
| `posts` | Legacy scaffold — unused |

Migrations: `drizzle/0000` (users/posts) → `0001` (calendar) → `0002` (kanban).

## Kanban ↔ Calendar Integration

When a kanban task has `calendarSynced: true`, `app/kanban/actions.ts` automatically:

- Creates a linked `calendar_items` row on task create
- Updates/deletes that row on task update/delete
- Maps priority → calendar category (`low→idea`, `medium→work`, `high→errand`)

The FK is `kanban_tasks.calendar_item_id → calendar_items.id`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## What's Built vs. Planned

**Built and wired to the database:**

- Clerk auth + user sync
- Calendar (full CRUD, drag-and-drop scheduling)
- Kanban (boards, columns, tasks, labels, drag-and-drop, calendar sync)

**UI only (no backend yet):**

- Dashboard stats and previews
- Notes, Whiteboard, AI Template Builder, AI Assistant, Pages/Spaces, Settings
- `notesLinked` flag on kanban tasks (stored but not connected)

See [`theme.md`](theme.md) for the full design system.
