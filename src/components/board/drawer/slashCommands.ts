import type { SavedReplyDto } from "@/services/saved-replies.service";

/** What running a `/` command does to the composer. `emoji` is carried out by the parent, which owns the palette. */
export type SlashCommandAction =
  | { type: "block"; block: "bullet_list" | "ordered_list" | "quote" | "code_block" | "divider" }
  | { type: "text"; text: string }
  | { type: "mention" }
  | { type: "emoji" }
  | { type: "markdown"; markdown: string };

/** One row of the `/` menu. */
export type SlashSuggestion = {
  id: string;
  label: string;
  description: string;
  action: SlashCommandAction;
};

type SlashCommandDefinition = {
  id: string;
  label: string;
  description: string;
  /** Extra words the query can match, besides the label. */
  keywords: string[];
  /** Built when the command is picked, so "today" reads the date at that moment. */
  getAction: () => SlashCommandAction;
};

const formatToday = (): string =>
  new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const SLASH_COMMANDS: SlashCommandDefinition[] = [
  { id: "mention", label: "Mention", description: "Mention a teammate or a team", keywords: ["at", "person", "team"], getAction: () => ({ type: "mention" }) },
  { id: "today", label: "Today's date", description: "Insert the current date", keywords: ["date", "day"], getAction: () => ({ type: "text", text: formatToday() }) },
  { id: "emoji", label: "Emoji", description: "Open the emoji picker", keywords: ["smiley", "react"], getAction: () => ({ type: "emoji" }) },
  { id: "bullets", label: "Bulleted list", description: "Start a bulleted list", keywords: ["list", "ul", "bullet"], getAction: () => ({ type: "block", block: "bullet_list" }) },
  { id: "numbers", label: "Numbered list", description: "Start a numbered list", keywords: ["list", "ol", "number"], getAction: () => ({ type: "block", block: "ordered_list" }) },
  { id: "quote", label: "Quote", description: "Quote someone", keywords: ["blockquote", "cite"], getAction: () => ({ type: "block", block: "quote" }) },
  { id: "code", label: "Code block", description: "Share a snippet of code", keywords: ["snippet", "pre"], getAction: () => ({ type: "block", block: "code_block" }) },
  { id: "divider", label: "Divider", description: "Insert a horizontal line", keywords: ["line", "rule", "separator"], getAction: () => ({ type: "block", block: "divider" }) },
];

/** How many saved replies the menu lists at most, so a long library never pushes the commands off screen. */
const MAX_SAVED_REPLIES = 4;
const MAX_SUGGESTIONS = 9;

const previewOf = (body: string): string => {
  const single_line = body.replace(/\s+/g, " ").trim();
  return single_line.length > 60 ? `${single_line.slice(0, 57)}...` : single_line;
};

/**
 * The rows of the `/` menu for what has been typed after the slash: the
 * commands whose label or keywords contain the query, then the user's saved
 * replies whose title does. An empty query lists the commands and the first
 * few saved replies.
 */
export function buildSlashSuggestions(query: string, saved_replies: SavedReplyDto[]): SlashSuggestion[] {
  const needle = query.trim().toLowerCase();

  const commands = SLASH_COMMANDS.filter(
    (command) =>
      needle === "" ||
      command.label.toLowerCase().includes(needle) ||
      command.keywords.some((keyword) => keyword.startsWith(needle))
  ).map((command): SlashSuggestion => ({
    id: `command:${command.id}`,
    label: command.label,
    description: command.description,
    action: command.getAction(),
  }));

  const replies = saved_replies
    .filter((reply) => needle === "" || reply.title.toLowerCase().includes(needle))
    .slice(0, MAX_SAVED_REPLIES)
    .map((reply): SlashSuggestion => ({
      id: `reply:${reply.id}`,
      label: reply.title,
      description: `Saved reply, ${previewOf(reply.body)}`,
      action: { type: "markdown", markdown: reply.body },
    }));

  return [...commands, ...replies].slice(0, MAX_SUGGESTIONS);
}

/** The items a `#query` matches: every word of the query must appear in the name. */
export function filterReferenceItems<TItem extends { name: string }>(items: TItem[], query: string): TItem[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => terms.every((term) => item.name.toLowerCase().includes(term))).slice(0, MAX_SUGGESTIONS);
}
