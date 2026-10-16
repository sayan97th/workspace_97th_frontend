import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion } from "@tiptap/suggestion";
import { handleSuggestionKey, type SuggestionStore } from "../doc/editor/suggestion-store";
import type { RichTextSlashItem } from "./richTextSlashItems";

export type RichTextSlashCommandOptions = {
  store: SuggestionStore<RichTextSlashItem> | null;
  /** The rows for the typed query, read at every keystroke so host features and saved replies stay current. */
  getItems: ((query: string) => RichTextSlashItem[]) | null;
  /** Runs the picked row, `range` is the typed "/query" to remove first. */
  onSelect: ((item: RichTextSlashItem, range: Range, editor: Editor) => void) | null;
};

export const RICH_TEXT_SLASH_KEY = new PluginKey("richTextSlashCommand");

/**
 * The composer's "/" menu, the same flow as the doc editor's: a "/" that
 * opens a word shows the block menu (rendered by `RichTextSlashMenu` from the
 * store) with a "Type to search list" hint, further letters search it,
 * arrows and Enter or Tab pick, Escape closes and keeps the text. Never opens
 * inside a code block, so paths and URLs typed there stay plain.
 *
 * The raised priority puts its key handling ahead of the list, table and
 * toggle keymaps, so Enter and the arrows reach the menu first while it is open.
 */
export const RichTextSlashCommand = Extension.create<RichTextSlashCommandOptions>({
  name: "richTextSlashCommand",
  priority: 1000,

  addOptions() {
    return { store: null, getItems: null, onSelect: null };
  },

  addProseMirrorPlugins() {
    const { store, getItems, onSelect } = this.options;
    if (!store || !getItems) return [];

    return [
      Suggestion<RichTextSlashItem, RichTextSlashItem>({
        editor: this.editor,
        char: "/",
        pluginKey: RICH_TEXT_SLASH_KEY,
        decorationClass: "rich-text-slash-trigger",
        decorationContent: "Type to search list",
        allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== "codeBlock",
        items: ({ query }) => getItems(query),
        command: ({ editor, range, props }) => onSelect?.(props, range, editor),
        render: () => ({
          onStart: (props) => {
            store.setState({
              is_open: true,
              items: props.items,
              query: props.query,
              selected_index: 0,
              range: props.range,
              getRect: props.clientRect ?? null,
              command: (item) => props.command(item),
            });
          },
          onUpdate: (props) => {
            const previous = store.getState();
            const last_index = Math.max(0, props.items.length - 1);
            store.setState({
              is_open: true,
              items: props.items,
              query: props.query,
              selected_index: previous.query === props.query ? Math.min(previous.selected_index, last_index) : 0,
              range: props.range,
              getRect: props.clientRect ?? null,
              command: (item) => props.command(item),
            });
          },
          onKeyDown: ({ event, view }) =>
            handleSuggestionKey(store, event, () => {
              exitSuggestion(view, RICH_TEXT_SLASH_KEY);
              store.close();
            }),
          onExit: () => store.close(),
        }),
      }),
    ];
  },
});
