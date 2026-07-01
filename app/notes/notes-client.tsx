"use client";

import type { ChainedCommands, Editor, JSONContent } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code,
  Copy,
  FilePlus2,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  Pin,
  PinOff,
  Quote,
  Redo2,
  RotateCcw,
  Search,
  Sparkles,
  StickyNote,
  Strikethrough,
  Trash2,
  Type,
  Undo2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  createNote,
  duplicateNote,
  moveNoteToTrash,
  permanentlyDeleteNote,
  refineSelectedText,
  restoreNote,
  toggleNotePinned,
  updateNoteColor,
  updateNoteContent,
  updateNoteTitle,
  type RefineMode,
  type RefineTone,
} from "@/app/notes/actions";
import { Button } from "@/components/ui/button";
import type { Note } from "@/db/schema";
import { cn } from "@/lib/utils";

type SaveStatus = "saved" | "saving" | "dirty" | "error";
type SlashMenuState = {
  open: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
};

const emptyContent: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const colorOptions = [
  { value: "mint", label: "Mint", dot: "bg-primary", soft: "bg-secondary text-secondary-foreground border-primary/20" },
  { value: "sky", label: "Sky", dot: "bg-sky-500", soft: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "coral", label: "Coral", dot: "bg-coral-500", soft: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "amber", label: "Amber", dot: "bg-amber-500", soft: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "lavender", label: "Lavender", dot: "bg-violet-500", soft: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "teal", label: "Teal", dot: "bg-teal-500", soft: "bg-teal-100 text-teal-700 border-teal-200" },
] as const;

const refineOptions: { label: string; mode: RefineMode }[] = [
  { label: "Improve grammar", mode: "improve-grammar" },
  { label: "Rephrase", mode: "rephrase" },
  { label: "Make shorter", mode: "make-shorter" },
  { label: "Make longer", mode: "make-longer" },
  { label: "Simplify language", mode: "simplify" },
];

const toneOptions: { label: string; tone: RefineTone }[] = [
  { label: "Professional", tone: "professional" },
  { label: "Friendly", tone: "friendly" },
  { label: "Confident", tone: "confident" },
  { label: "Casual", tone: "casual" },
];

function getColor(value: string) {
  return colorOptions.find((color) => color.value === value) ?? colorOptions[3];
}

function formatRelativeTime(value: Date | string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function toContent(value: unknown): JSONContent {
  if (value && typeof value === "object") {
    return value as JSONContent;
  }

  return emptyContent;
}

function actionForm(noteId: number, extra?: Record<string, string>) {
  const formData = new FormData();
  formData.set("noteId", String(noteId));

  Object.entries(extra ?? {}).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      aria-label={label}
      className={cn(
        "h-8 w-8 rounded-lg",
        active && "bg-primary/10 text-primary ring-1 ring-primary/15"
      )}
      disabled={disabled}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function NotesClient({
  activeNotes,
  selectedNoteId,
  trashedNotes,
}: {
  activeNotes: Note[];
  selectedNoteId: number | null;
  trashedNotes: Note[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [wordCount, setWordCount] = useState(0);
  const [openMenuNoteId, setOpenMenuNoteId] = useState<number | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState>({
    open: false,
    query: "",
    from: 0,
    to: 0,
    top: 0,
    left: 0,
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedNoteId = useRef<number | null>(null);
  const selectedNote = activeNotes.find((note) => note.id === selectedNoteId) ?? null;
  const shouldShowBubbleMenu = useCallback(
    ({ editor: currentEditor }: { editor: Editor }) => {
      const { empty } = currentEditor.state.selection;

      return currentEditor.isFocused && !empty;
    },
    []
  );
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return activeNotes;
    }

    return activeNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.contentText.toLowerCase().includes(query)
    );
  }, [activeNotes, searchQuery]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: "Press / for commands",
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
        }),
        Highlight,
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
      ],
      content: selectedNote ? toContent(selectedNote.contentJson) : emptyContent,
      editorProps: {
        attributes: {
          class:
            "prose-notes min-h-[480px] w-full max-w-none px-2 py-5 text-base leading-7 outline-none",
        },
      },
      onUpdate({ editor }) {
        const text = editor.getText();
        setWordCount(countWords(text));
        setSaveStatus("dirty");
        updateSlashMenu(editor);
      },
      onSelectionUpdate({ editor }) {
        updateSlashMenu(editor);
      },
      onBlur() {
        setSlashMenu((menu) => ({ ...menu, open: false }));
      },
    },
    [selectedNote?.id]
  );

  function updateSlashMenu(currentEditor = editor) {
    function closeSlashMenu() {
      setSlashMenu((menu) => (menu.open ? { ...menu, open: false } : menu));
    }

    if (!currentEditor || !currentEditor.isFocused) {
      closeSlashMenu();
      return;
    }

    const { from, empty, $from } = currentEditor.state.selection;

    if (!empty) {
      closeSlashMenu();
      return;
    }

    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\0");
    const match = /\/([a-zA-Z ]*)$/.exec(textBefore);

    if (!match) {
      closeSlashMenu();
      return;
    }

    const coords = currentEditor.view.coordsAtPos(from);
    setSlashMenu({
      open: true,
      query: match[1].toLowerCase(),
      from: from - match[0].length,
      to: from,
      top: coords.bottom + window.scrollY + 8,
      left: coords.left + window.scrollX,
    });
  }

  useEffect(() => {
    setTitleDraft(selectedNote?.title ?? "");
    setWordCount(selectedNote?.wordCount ?? 0);
    setSaveStatus("saved");
    setAiMessage("");
    setAiMenuOpen(false);

    const currentEditor = editor;

    if (
      currentEditor &&
      !currentEditor.isDestroyed &&
      loadedNoteId.current !== (selectedNote?.id ?? null)
    ) {
      currentEditor.commands.setContent(
        selectedNote ? toContent(selectedNote.contentJson) : emptyContent
      );
      loadedNoteId.current = selectedNote?.id ?? null;
    }
  }, [editor, selectedNote?.id]);

  useEffect(() => {
    if (!editor || !selectedNote || saveStatus !== "dirty") {
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = setTimeout(async () => {
      const formData = actionForm(selectedNote.id, {
        contentJson: JSON.stringify(editor.getJSON()),
        contentText: editor.getText(),
        wordCount: String(countWords(editor.getText())),
      });
      setSaveStatus("saving");

      try {
        await updateNoteContent(formData);
        setSaveStatus("saved");
        router.refresh();
      } catch {
        setSaveStatus("error");
      }
    }, 850);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [editor, router, saveStatus, selectedNote]);

  function refreshAction(action: () => Promise<void>) {
    startTransition(async () => {
      await action();
      setOpenMenuNoteId(null);
      router.refresh();
    });
  }

  function createNewNote() {
    startTransition(async () => {
      const noteId = await createNote();
      router.push(`/notes?note=${noteId}`);
      router.refresh();
    });
  }

  function duplicate(noteId: number) {
    startTransition(async () => {
      const copyId = await duplicateNote(actionForm(noteId));
      setOpenMenuNoteId(null);
      router.push(`/notes?note=${copyId}`);
      router.refresh();
    });
  }

  function saveTitle() {
    if (!selectedNote || titleDraft.trim() === selectedNote.title) {
      return;
    }

    refreshAction(() =>
      updateNoteTitle(actionForm(selectedNote.id, { title: titleDraft }))
    );
  }

  function applyLink() {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Paste a link", previousUrl ?? "");

    if (url === null) return;

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function runSlashCommand(command: (chain: ChainedCommands) => void) {
    if (!editor) return;

    const chain = editor.chain().focus().deleteRange({
      from: slashMenu.from,
      to: slashMenu.to,
    });
    command(chain);
    setSlashMenu((menu) => ({ ...menu, open: false }));
  }

  async function runAiRefine(mode: RefineMode, tone?: RefineTone) {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");

    if (!selectedText.trim()) {
      setAiMessage("Select some text first.");
      return;
    }

    const formData = new FormData();
    formData.set("selectedText", selectedText);
    formData.set("mode", mode);
    if (tone) formData.set("tone", tone);

    setIsAiRefining(true);
    setAiMessage("");

    try {
      const refined = await refineSelectedText(formData);
      editor.chain().focus().insertContentAt({ from, to }, refined).run();
      setAiMenuOpen(false);
    } catch (error) {
      setAiMessage(error instanceof Error ? error.message : "AI Refine failed.");
    } finally {
      setIsAiRefining(false);
    }
  }

  const slashCommands = [
    {
      label: "Text",
      hint: "Plain paragraph",
      icon: Type,
      keywords: "text paragraph",
      action: (chain: ChainedCommands) => chain.setParagraph().run(),
    },
    {
      label: "Heading 1",
      hint: "Large section heading",
      icon: Heading1,
      keywords: "heading h1 title",
      action: (chain: ChainedCommands) =>
        chain.toggleHeading({ level: 1 }).run(),
    },
    {
      label: "Heading 2",
      hint: "Medium section heading",
      icon: Heading2,
      keywords: "heading h2 subtitle",
      action: (chain: ChainedCommands) =>
        chain.toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Bullet list",
      hint: "Simple list",
      icon: List,
      keywords: "bullet list unordered",
      action: (chain: ChainedCommands) => chain.toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      hint: "Ordered steps",
      icon: ListOrdered,
      keywords: "number ordered list",
      action: (chain: ChainedCommands) => chain.toggleOrderedList().run(),
    },
    {
      label: "Quote",
      hint: "Callout-style quote",
      icon: Quote,
      keywords: "quote blockquote",
      action: (chain: ChainedCommands) => chain.toggleBlockquote().run(),
    },
    {
      label: "Code block",
      hint: "Preformatted code",
      icon: Code,
      keywords: "code block",
      action: (chain: ChainedCommands) => chain.toggleCodeBlock().run(),
    },
  ].filter((item) =>
    `${item.label} ${item.keywords}`.toLowerCase().includes(slashMenu.query)
  );

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="flex min-h-[620px] min-w-0 flex-col rounded-lg border border-border bg-card shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-7rem)]">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <StickyNote className="h-4 w-4" />
                Notes
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Color-coded pages for quick thoughts.
              </p>
            </div>
            <Button
              className="h-9 w-9 rounded-lg"
              disabled={isPending}
              size="icon"
              type="button"
              onClick={createNewNote}
            >
              <FilePlus2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <Search className="h-4 w-4 shrink-0 text-sky-500" />
            <input
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder="Search notes"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            {searchQuery && (
              <button
                className="text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {filteredNotes.length > 0 ? (
            <div className="space-y-2">
              {filteredNotes.map((note) => {
                const color = getColor(note.color);
                const active = note.id === selectedNoteId;

                return (
                  <div
                    key={note.id}
                    className={cn(
                      "group relative rounded-lg border p-2.5 transition hover:-translate-y-0.5 hover:shadow-sm",
                      active
                        ? "border-primary/25 bg-primary/10"
                        : "border-border bg-background hover:bg-accent/45"
                    )}
                  >
                    <button
                      className="flex w-full min-w-0 items-start gap-3 text-left"
                      type="button"
                      onClick={() => router.push(`/notes?note=${note.id}`)}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                          color.soft
                        )}
                      >
                        <StickyNote className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            {note.title}
                          </span>
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} />
                        </span>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {formatRelativeTime(note.updatedAt)} - {note.wordCount} words
                        </span>
                      </span>
                    </button>
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-100">
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-primary"
                        title={note.isPinned ? "Unpin" : "Pin"}
                        type="button"
                        onClick={() =>
                          refreshAction(() => toggleNotePinned(actionForm(note.id)))
                        }
                      >
                        {note.isPinned ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                        title="More"
                        type="button"
                        onClick={() =>
                          setOpenMenuNoteId(openMenuNoteId === note.id ? null : note.id)
                        }
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    {openMenuNoteId === note.id && (
                      <div className="absolute right-2 top-10 z-20 w-52 rounded-lg border border-border bg-popover p-2 text-sm shadow-lg">
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-accent"
                          type="button"
                          onClick={() => {
                            const title = window.prompt("Rename note", note.title);
                            if (title !== null) {
                              refreshAction(() =>
                                updateNoteTitle(actionForm(note.id, { title }))
                              );
                            }
                          }}
                        >
                          <Type className="h-4 w-4 text-sky-500" />
                          Rename
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-accent"
                          type="button"
                          onClick={() => duplicate(note.id)}
                        >
                          <Copy className="h-4 w-4 text-teal-500" />
                          Duplicate
                        </button>
                        <div className="my-1 border-t border-border" />
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                          Color
                        </div>
                        <div className="grid grid-cols-3 gap-1 px-1 pb-1">
                          {colorOptions.map((option) => (
                            <button
                              key={option.value}
                              className={cn(
                                "flex h-8 items-center justify-center rounded-lg border",
                                option.soft,
                                note.color === option.value && "ring-1 ring-ring"
                              )}
                              title={option.label}
                              type="button"
                              onClick={() =>
                                refreshAction(() =>
                                  updateNoteColor(
                                    actionForm(note.id, { color: option.value })
                                  )
                                )
                              }
                            >
                              <span className={cn("h-3 w-3 rounded-full", option.dot)} />
                            </button>
                          ))}
                        </div>
                        <div className="my-1 border-t border-border" />
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-rose-600 hover:bg-rose-50"
                          type="button"
                          onClick={() =>
                            refreshAction(() => moveNoteToTrash(actionForm(note.id)))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          Move to trash
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-secondary/35 p-4 text-center text-sm text-muted-foreground">
              {activeNotes.length === 0
                ? "Create your first note to start writing."
                : "No notes match your search."}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <button
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            type="button"
            onClick={() => setTrashOpen((value) => !value)}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-500" />
              Trash
            </span>
            <span className="flex items-center gap-1">
              {trashedNotes.length}
              <ChevronDown
                className={cn("h-4 w-4 transition", trashOpen && "rotate-180")}
              />
            </span>
          </button>

          {trashOpen && (
            <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">
              {trashedNotes.length > 0 ? (
                trashedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-border bg-background p-2"
                  >
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Trashed {note.trashedAt ? formatRelativeTime(note.trashedAt) : ""}
                    </p>
                    <div className="mt-2 flex gap-1">
                      <Button
                        className="h-8 flex-1 rounded-lg text-xs"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          refreshAction(() => restoreNote(actionForm(note.id)))
                        }
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Restore
                      </Button>
                      <Button
                        className="h-8 w-8 rounded-lg"
                        size="icon"
                        title="Delete permanently"
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Delete this note permanently?")) {
                            refreshAction(() =>
                              permanentlyDeleteNote(actionForm(note.id))
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary/35 p-3 text-sm text-muted-foreground">
                  Trash is empty.
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <section className="min-w-0 rounded-lg border border-border bg-card shadow-sm">
        {selectedNote && editor ? (
          <div className="flex min-h-[620px] min-w-0 flex-col">
            <div className="border-b border-border px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span
                      className={cn("h-2.5 w-2.5 rounded-full", getColor(selectedNote.color).dot)}
                    />
                    {getColor(selectedNote.color).label} note
                  </div>
                  <input
                    className="w-full bg-transparent text-2xl font-semibold tracking-normal outline-none placeholder:text-muted-foreground"
                    placeholder="Untitled"
                    value={titleDraft}
                    onBlur={saveTitle}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 font-medium",
                      saveStatus === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-border bg-background"
                    )}
                  >
                    {saveStatus === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {saveStatus === "saved" && <Check className="h-3.5 w-3.5 text-primary" />}
                    {saveStatus === "dirty" && "Unsaved"}
                    {saveStatus === "saving" && "Saving"}
                    {saveStatus === "saved" && "Saved"}
                    {saveStatus === "error" && "Save failed"}
                  </span>
                  <span className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-2.5 font-medium">
                    {wordCount} words
                  </span>
                </div>
              </div>
            </div>

            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-card/95 px-4 py-2 backdrop-blur">
              <ToolbarButton
                active={editor.isActive("bold")}
                label="Bold"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("italic")}
                label="Italic"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("strike")}
                label="Strikethrough"
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("highlight")}
                label="Highlight"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
              >
                <Highlighter className="h-4 w-4" />
              </ToolbarButton>
              <span className="mx-1 h-6 w-px bg-border" />
              <ToolbarButton
                active={editor.isActive("heading", { level: 1 })}
                label="Heading 1"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              >
                <Heading1 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("heading", { level: 2 })}
                label="Heading 2"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("bulletList")}
                label="Bullet list"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("orderedList")}
                label="Numbered list"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("blockquote")}
                label="Quote"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("code")}
                label="Code"
                onClick={() => editor.chain().focus().toggleCode().run()}
              >
                <Code className="h-4 w-4" />
              </ToolbarButton>
              <span className="mx-1 h-6 w-px bg-border" />
              <ToolbarButton label="Link" onClick={applyLink}>
                <Link2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive({ textAlign: "left" })}
                label="Align left"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              >
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive({ textAlign: "center" })}
                label="Align center"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
              >
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive({ textAlign: "right" })}
                label="Align right"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
              >
                <AlignRight className="h-4 w-4" />
              </ToolbarButton>
              <span className="mx-1 h-6 w-px bg-border" />
              <ToolbarButton
                disabled={!editor.can().undo()}
                label="Undo"
                onClick={() => editor.chain().focus().undo().run()}
              >
                <Undo2 className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                disabled={!editor.can().redo()}
                label="Redo"
                onClick={() => editor.chain().focus().redo().run()}
              >
                <Redo2 className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <div className="relative min-w-0 flex-1 overflow-y-auto px-4">
              <EditorContent editor={editor} />
            </div>

            <BubbleMenu
              editor={editor}
              shouldShow={shouldShowBubbleMenu}
              className="z-30 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-lg"
            >
              <ToolbarButton
                active={editor.isActive("bold")}
                label="Bold"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("italic")}
                label="Italic"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive("highlight")}
                label="Highlight"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
              >
                <Highlighter className="h-3.5 w-3.5" />
              </ToolbarButton>
              <div className="relative">
                <Button
                  className="h-8 rounded-lg px-2 text-xs"
                  disabled={isAiRefining}
                  type="button"
                  variant="outline"
                  onClick={() => setAiMenuOpen((value) => !value)}
                >
                  {isAiRefining ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1 h-3.5 w-3.5 text-indigo-500" />
                  )}
                  AI Refine
                </Button>

                {aiMenuOpen && (
                  <div className="absolute left-0 top-10 w-56 rounded-lg border border-border bg-popover p-2 shadow-lg">
                    {refineOptions.map((option) => (
                      <button
                        key={option.mode}
                        className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                        disabled={isAiRefining}
                        type="button"
                        onClick={() => runAiRefine(option.mode)}
                      >
                        {option.label}
                      </button>
                    ))}
                    <div className="my-1 border-t border-border" />
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      Change tone
                    </div>
                    {toneOptions.map((option) => (
                      <button
                        key={option.tone}
                        className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-accent"
                        disabled={isAiRefining}
                        type="button"
                        onClick={() => runAiRefine("change-tone", option.tone)}
                      >
                        {option.label}
                      </button>
                    ))}
                    {aiMessage && (
                      <p className="mt-2 rounded-lg bg-rose-50 px-2 py-2 text-xs leading-5 text-rose-700">
                        {aiMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </BubbleMenu>

            {slashMenu.open && slashCommands.length > 0 && (
              <div
                className="fixed z-40 w-64 rounded-lg border border-border bg-popover p-2 shadow-xl"
                style={{ top: slashMenu.top, left: slashMenu.left }}
              >
                {slashCommands.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.label}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent"
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        runSlashCommand(item.action);
                      }}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[620px] items-center justify-center rounded-lg border border-dashed border-border bg-secondary/35 p-6 text-center">
            <div className="max-w-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <StickyNote className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Create a note</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Start a page, choose a color, and let the editor hold the shape of the idea.
              </p>
              <Button className="mt-4 rounded-lg" type="button" onClick={createNewNote}>
                <FilePlus2 className="mr-1.5 h-4 w-4" />
                New Note
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
