import { Extension, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion } from "@tiptap/suggestion";
import { filterDocBlocks, type DocBlock } from "../doc-blocks";
import { handleSuggestionKey, type SuggestionStore } from "../suggestion-store";

export type SlashCommandOptions = {
  store: SuggestionStore<DocBlock> | null;
  /** Runs the picked block, `range` is the typed "/query". */
  onSelect: ((block: DocBlock, range: Range) => void) | null;
};

export const SLASH_COMMAND_KEY = new PluginKey("docSlashCommand");

/**
 * Notion style "/" menu: typing "/" at the start of a word opens the block
 * list (rendered by `SlashMenu` from the shared store), further letters
 * filter it, arrows and Enter pick, Escape closes and keeps the text.
 * Never opens inside a code block.
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
        allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== "codeBlock",
        items: ({ query }) => filterDocBlocks(query),
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
            });
          },
          onUpdate: (props) => {
            const previous = store.getState();
            store.setState({
              is_open: true,
              items: props.items,
              query: props.query,
              selected_index: previous.query === props.query ? Math.min(previous.selected_index, Math.max(0, props.items.length - 1)) : 0,
              range: props.range,
              getRect: props.clientRect ?? null,
              command: (item) => props.command(item),
            });
          },
          onKeyDown: ({ event, view }) =>
            handleSuggestionKey(store, event, () => {
              exitSuggestion(view, SLASH_COMMAND_KEY);
              store.close();
            }),
          onExit: () => store.close(),
        }),
      }),
    ];
  },
});
