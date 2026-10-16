import type { Editor } from "@tiptap/core";
import { CalendarDays, Hash, Image, Link2, type LucideIcon, MessageSquareText, Paperclip, Smile } from "lucide-react";
import type { SavedReplyDto } from "@/services/saved-replies.service";
import { DOC_BLOCKS } from "../doc/editor/doc-blocks";

export type RichTextSlashGroup = "basic" | "media" | "inline" | "saved";

/** What a "/" row can reach besides the editor, each one supplied by the composer hosting it. */
export type RichTextSlashContext = {
  editor: Editor;
  openImagePicker: () => void;
  openLinkDialog: () => void;
  openEmojiPalette?: () => void;
  attachFiles?: () => void;
};

/** Host features some rows depend on. A row whose feature is missing stays out of the menu. */
export type RichTextSlashFeatures = {
  /** The host shows the `@mention` picker. */
  mentions: boolean;
  /** The host shows the `#` "Link an item" picker. */
  item_links: boolean;
  /** The host owns an emoji palette. */
  emoji: boolean;
  /** The host takes file attachments. */
  files: boolean;
};

export type RichTextSlashItem = {
  key: string;
  label: string;
  group: RichTextSlashGroup;
  icon: LucideIcon;
  /** Markdown style shortcut shown as a keycap on the right of the row. */
  shortcut?: string;
  /** Second line under the label (a saved reply's preview). */
  description?: string;
  /** Extra words the "/" search matches. */
  aliases?: string[];
  requires?: keyof RichTextSlashFeatures;
  run: (context: RichTextSlashContext) => void;
};

export const RICH_TEXT_SLASH_GROUPS: { group: RichTextSlashGroup; label: string }[] = [
  { group: "basic", label: "Basic blocks" },
  { group: "media", label: "Media" },
  { group: "inline", label: "Inline" },
  { group: "saved", label: "Saved replies" },
];

/** How many saved replies the menu lists at most, so a long library never buries the blocks. */
const MAX_SAVED_REPLIES = 4;

/**
 * A row backed by the doc editor's block of the same key, so both editors
 * share the label, icon, shortcut, search words and command.
 */
const fromDocBlock = (key: string, overrides: Partial<RichTextSlashItem> = {}): RichTextSlashItem => {
  const block = DOC_BLOCKS.find((candidate) => candidate.key === key);
  if (!block) throw new Error(`Unknown doc block "${key}"`);
  return {
    key: block.key,
    label: block.label,
    group: block.group,
    icon: block.icon,
    shortcut: block.shortcut,
    aliases: block.aliases,
    run: ({ editor }) => {
      if (block.apply) block.apply(editor.chain().focus()).run();
      else block.run?.({ editor, openMedia: () => undefined });
    },
    ...overrides,
  };
};

const formatToday = (): string =>
  new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Every row of the composer's "/" menu, in menu order. The text blocks match
 * the doc editor's "/" menu. In a comment `>` stays the Markdown quote
 * shortcut, so the toggle list has none.
 */
const RICH_TEXT_SLASH_ITEMS: RichTextSlashItem[] = [
  fromDocBlock("text"),
  fromDocBlock("heading-1"),
  fromDocBlock("heading-2"),
  fromDocBlock("heading-3"),
  fromDocBlock("heading-4"),
  fromDocBlock("bullet-list"),
  fromDocBlock("numbered-list"),
  fromDocBlock("todo-list"),
  fromDocBlock("toggle-list", {
    shortcut: undefined,
    // Opened right away, so Enter in the new title leads into its body.
    run: ({ editor }) => editor.chain().focus().setDetails().updateAttributes("details", { open: true }).run(),
  }),
  fromDocBlock("callout", { aliases: ["note", "info", "tip", "warning", "alert", "important"] }),
  fromDocBlock("quote", { shortcut: ">" }),
  fromDocBlock("table"),
  fromDocBlock("divider"),
  {
    key: "image",
    label: "Image",
    group: "media",
    icon: Image,
    aliases: ["picture", "photo", "upload", "screenshot"],
    run: ({ openImagePicker }) => openImagePicker(),
  },
  fromDocBlock("code"),
  {
    key: "file",
    label: "File",
    group: "media",
    icon: Paperclip,
    aliases: ["attachment", "attach", "upload", "pdf"],
    requires: "files",
    run: ({ attachFiles }) => attachFiles?.(),
  },
  {
    key: "link",
    label: "Link",
    group: "media",
    icon: Link2,
    aliases: ["url", "website", "hyperlink"],
    run: ({ openLinkDialog }) => openLinkDialog(),
  },
  fromDocBlock("mention", { requires: "mentions" }),
  {
    key: "item-link",
    label: "Link an item",
    group: "inline",
    icon: Hash,
    shortcut: "#",
    aliases: ["item", "reference", "task", "pulse"],
    requires: "item_links",
    run: ({ editor }) => editor.chain().focus().insertContent("#").run(),
  },
  {
    key: "emoji",
    label: "Emoji",
    group: "inline",
    icon: Smile,
    aliases: ["smiley", "react", "emoticon"],
    requires: "emoji",
    run: ({ openEmojiPalette }) => openEmojiPalette?.(),
  },
  {
    key: "today",
    label: "Today's date",
    group: "inline",
    icon: CalendarDays,
    aliases: ["date", "day", "now"],
    run: ({ editor }) => editor.chain().focus().insertContent(formatToday()).run(),
  },
];

const previewOf = (body: string): string => {
  const single_line = body.replace(/\s+/g, " ").trim();
  return single_line.length > 60 ? `${single_line.slice(0, 57)}...` : single_line;
};

const savedReplyItem = (reply: SavedReplyDto): RichTextSlashItem => ({
  key: `saved-reply-${reply.id}`,
  label: reply.title,
  group: "saved",
  icon: MessageSquareText,
  description: previewOf(reply.body),
  run: ({ editor }) => editor.chain().focus().insertContent(reply.body, { contentType: "markdown" }).run(),
});

/**
 * The "/" rows for what was typed after the slash: the blocks whose label
 * contains the query or whose search words start with it (the doc editor's
 * rule), then the saved replies whose title contains it. A bare "/" lists
 * every block and the first few saved replies.
 */
export const buildRichTextSlashItems = (
  query: string,
  features: RichTextSlashFeatures,
  saved_replies: SavedReplyDto[]
): RichTextSlashItem[] => {
  const needle = query.trim().toLowerCase();

  const blocks = RICH_TEXT_SLASH_ITEMS.filter(
    (item) =>
      (!item.requires || features[item.requires]) &&
      (!needle || item.label.toLowerCase().includes(needle) || item.aliases?.some((alias) => alias.startsWith(needle)))
  );
  const replies = saved_replies
    .filter((reply) => !needle || reply.title.toLowerCase().includes(needle))
    .slice(0, MAX_SAVED_REPLIES)
    .map(savedReplyItem);

  return [...blocks, ...replies];
};
