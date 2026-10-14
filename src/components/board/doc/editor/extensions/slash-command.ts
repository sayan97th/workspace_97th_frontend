import { Extension, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion } from "@tiptap/suggestion";
import { DOC_BLOCKS, filterDocBlocks, SLASH_QUICK_BLOCKS, type DocBlock } from "../doc-blocks";
import { handleSuggestionKey, type SuggestionStore } from "../suggestion-store";

export type SlashCommandOptions = {
  store: SuggestionStore<DocBlock> | null;
  /** Runs the picked block, `range` is the typed "/query". */
  onSelect: ((block: DocBlock, range: Range) => void) | null;
};

export const SLASH_COMMAND_KEY = new PluginKey("docSlashCommand");

/** Index of the "More options" row in the short list, one past its last block. */
export const SLASH_MORE_OPTIONS_INDEX = SLASH_QUICK_BLOCKS.length;

/** True while the menu shows the short monday list (a bare "/", not expanded yet). */
export const isSlashQuickList = (items: DocBlock[]): boolean => items === SLASH_QUICK_BLOCKS;

/** Swaps the short list for the whole catalog ("More options"). */
export const expandSlashMenu = (store: SuggestionStore<DocBlock>) => store.setState({ items: DOC_BLOCKS, selected_index: 0, is_expanded: true });

/**
 * The "/" menu: typing "/" at the start of a word opens monday's short
 * "Text" list (rendered by `SlashMenu` from the shared store) with a
 * "Type to search list" hint after the slash. "More options" expands it to
 * every block, further letters search the whole catalog, arrows and Enter
 * pick, Escape closes and keeps the text. Never opens inside a code block.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return { store: null, onSelect: null };
  },

  addProseMirrorPlugins() {
    const { store, onSelect } = this.options;
    if (!store) return [];

    return [
      Suggestion<DocBlock, DocBlock>({
        editor: this.editor,
        char: "/",
        pluginKey: SLASH_COMMAND_KEY,
        decorationClass: "doc-slash-trigger",
        decorationContent: "Type to search list",
        allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== "codeBlock",
        items: ({ query }) => (query.trim() ? filterDocBlocks(query) : SLASH_QUICK_BLOCKS),
        command: ({ range, props }) => onSelect?.(props, range),
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
              is_expanded: false,
            });
          },
          onUpdate: (props) => {
            const previous = store.getState();
            // "More options" stays expanded until the query changes.
            const is_expanded = previous.is_expanded && previous.query === props.query;
            const items = is_expanded && !props.query.trim() ? DOC_BLOCKS : props.items;
            // The short list has one extra row, "More options", past its blocks.
            const last_index = Math.max(0, items.length - (isSlashQuickList(items) ? 0 : 1));
            store.setState({
              is_open: true,
              items,
              is_expanded,
              query: props.query,
              selected_index: previous.query === props.query ? Math.min(previous.selected_index, last_index) : 0,
              range: props.range,
              getRect: props.clientRect ?? null,
              command: (item) => props.command(item),
            });
          },
          onKeyDown: ({ event, view }) => {
            const state = store.getState();
            if (state.is_open && isSlashQuickList(state.items)) {
              // The short list has one extra row past its blocks, "More options".
              const count = state.items.length + 1;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const step = event.key === "ArrowDown" ? 1 : -1;
                store.setState({ selected_index: (state.selected_index + step + count) % count });
                return true;
              }
              if ((event.key === "Enter" || event.key === "Tab") && state.selected_index === SLASH_MORE_OPTIONS_INDEX) {
                expandSlashMenu(store);
                return true;
              }
            }
            return handleSuggestionKey(store, event, () => {
              exitSuggestion(view, SLASH_COMMAND_KEY);
              store.close();
            });
          },
          onExit: () => store.close(),
        }),
      }),
    ];
  },
});
