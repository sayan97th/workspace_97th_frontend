import type { ChainedCommands, Editor, Range } from "@tiptap/core";
import {
  AtSign,
  Bookmark,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image,
  Lightbulb,
  List,
  ListCollapse,
  ListOrdered,
  ListTodo,
  type LucideIcon,
  Minus,
  Paperclip,
  Quote,
  SquarePlay,
  Table,
  Type,
  Volume2,
} from "lucide-react";
import type { DocMediaRequest } from "./upload-media";

/** What a block needs from the editor surface to run, the media rows open a dialog first. */
export type DocBlockContext = {
  editor: Editor;
  openMedia: (kind: DocMediaRequest) => void;
};

export type DocBlockGroup = "basic" | "media" | "inline";

export type DocBlock = {
  key: string;
  label: string;
  group: DocBlockGroup;
  icon: LucideIcon;
  /** Markdown style shortcut shown on the right of the row (and typed to get the block). */
  shortcut?: string;
  /** Extra words the "/" search matches. */
  aliases?: string[];
  /**
   * Text blocks change the block the caret is in, so they also power "Turn
   * into". Receives a chain already focused (and with the typed "/query"
   * removed when opened from the slash menu).
   */
  apply?: (chain: ChainedCommands) => ChainedCommands;
  /** Blocks that need input first (media) or insert something new run here instead. */
  run?: (context: DocBlockContext) => void;
};

export const DOC_BLOCK_GROUP_LABELS: Record<DocBlockGroup, string> = {
  basic: "Basic blocks",
  media: "Media",
  inline: "Inline",
};

/**
 * Every block the doc editor can insert, in menu order. Shared by the "/"
 * menu, the toolbar's "+ Add" menu and the block handle's "Turn into".
 */
export const DOC_BLOCKS: DocBlock[] = [
  { key: "text", label: "Text", group: "basic", icon: Type, aliases: ["paragraph", "normal", "plain"], apply: (chain) => chain.setParagraph() },
  { key: "heading-1", label: "Heading 1", group: "basic", icon: Heading1, shortcut: "#", aliases: ["h1", "title", "large"], apply: (chain) => chain.setHeading({ level: 1 }) },
  { key: "heading-2", label: "Heading 2", group: "basic", icon: Heading2, shortcut: "##", aliases: ["h2", "subtitle", "medium"], apply: (chain) => chain.setHeading({ level: 2 }) },
  { key: "heading-3", label: "Heading 3", group: "basic", icon: Heading3, shortcut: "###", aliases: ["h3", "small"], apply: (chain) => chain.setHeading({ level: 3 }) },
  { key: "heading-4", label: "Heading 4", group: "basic", icon: Heading4, shortcut: "####", aliases: ["h4"], apply: (chain) => chain.setHeading({ level: 4 }) },
  { key: "bullet-list", label: "Bulleted list", group: "basic", icon: List, shortcut: "-", aliases: ["unordered", "bullet", "ul"], apply: (chain) => chain.toggleBulletList() },
  { key: "numbered-list", label: "Numbered list", group: "basic", icon: ListOrdered, shortcut: "1.", aliases: ["ordered", "ol", "number"], apply: (chain) => chain.toggleOrderedList() },
  { key: "todo-list", label: "To-do list", group: "basic", icon: ListTodo, shortcut: "[]", aliases: ["todo", "task", "checkbox", "check"], apply: (chain) => chain.toggleTaskList() },
  { key: "toggle-list", label: "Toggle list", group: "basic", icon: ListCollapse, shortcut: ">", aliases: ["details", "collapse", "accordion"], apply: (chain) => chain.setDetails() },
  { key: "callout", label: "Callout", group: "basic", icon: Lightbulb, aliases: ["note", "info", "tip", "warning"], apply: (chain) => chain.setCallout() },
  { key: "quote", label: "Quote", group: "basic", icon: Quote, shortcut: '"', aliases: ["blockquote", "citation"], apply: (chain) => chain.setBlockquote() },
  {
    key: "table",
    label: "Table",
    group: "basic",
    icon: Table,
    aliases: ["grid", "rows", "columns"],
    run: ({ editor }) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  { key: "divider", label: "Divider", group: "basic", icon: Minus, shortcut: "---", aliases: ["line", "separator", "hr"], run: ({ editor }) => editor.chain().focus().setHorizontalRule().run() },
  { key: "image", label: "Image", group: "media", icon: Image, aliases: ["picture", "photo", "upload"], run: ({ openMedia }) => openMedia("image") },
  { key: "video", label: "Video", group: "media", icon: SquarePlay, aliases: ["youtube", "vimeo", "loom", "embed"], run: ({ openMedia }) => openMedia("video") },
  { key: "audio", label: "Audio", group: "media", icon: Volume2, aliases: ["sound", "music", "mp3"], run: ({ openMedia }) => openMedia("audio") },
  { key: "code", label: "Code", group: "media", icon: Code, shortcut: "```", aliases: ["snippet", "pre"], apply: (chain) => chain.setCodeBlock() },
  { key: "file", label: "File", group: "media", icon: Paperclip, aliases: ["attachment", "upload", "pdf"], run: ({ openMedia }) => openMedia("file") },
  { key: "bookmark", label: "Web bookmark", group: "media", icon: Bookmark, aliases: ["link", "url", "website"], run: ({ openMedia }) => openMedia("bookmark") },
  {
    key: "mention",
    label: "Mention a person",
    group: "inline",
    icon: AtSign,
    shortcut: "@",
    aliases: ["person", "people", "user", "tag"],
    run: ({ editor }) => editor.chain().focus().insertContent("@").run(),
  },
];

/** Blocks that can replace the one the caret is in ("Turn into"). */
export const TURN_INTO_BLOCKS = DOC_BLOCKS.filter((block) => block.apply);

/** The "/" search: matches the label, then the aliases, keeping menu order. */
export const filterDocBlocks = (query: string): DocBlock[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return DOC_BLOCKS;
  return DOC_BLOCKS.filter(
    (block) => block.label.toLowerCase().includes(needle) || block.aliases?.some((alias) => alias.startsWith(needle))
  );
};

/** Runs a block, from the "/" menu (`range` holds the typed "/query" to remove) or from a toolbar. */
export const runDocBlock = (block: DocBlock, context: DocBlockContext, range?: Range) => {
  const { editor } = context;
  if (range) editor.chain().focus().deleteRange(range).run();
  if (block.apply) {
    block.apply(editor.chain().focus()).run();
    return;
  }
  block.run?.(context);
};

/** "Turn into": lifts the block out of lists and quotes first, then applies the new type. */
export const turnBlockInto = (editor: Editor, block: DocBlock) => {
  if (!block.apply) return;
  block.apply(editor.chain().focus().clearNodes()).run();
};
