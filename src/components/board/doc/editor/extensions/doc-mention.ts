import Mention from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";
import { exitSuggestion } from "@tiptap/suggestion";
import { handleSuggestionKey, type SuggestionStore } from "../suggestion-store";

/** Someone who can be @mentioned in a doc. */
export type DocMember = {
  id: number;
  full_name: string;
  profile_photo_url: string | null;
  job_title?: string | null;
};

const MAX_RESULTS = 8;

export const DOC_MENTION_KEY = new PluginKey("docMention");

/**
 * "@" mentions of workspace members. The list is read through `getMembers`
 * on every keystroke, so members loading after the editor mounted still
 * show up without rebuilding the editor. Rendered by `MentionMenu`.
 */
export const createDocMention = (store: SuggestionStore<DocMember>, getMembers: () => DocMember[]) =>
  Mention.configure({
    HTMLAttributes: { class: "doc-mention" },
    renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
    renderHTML: ({ options, node }) => ["span", options.HTMLAttributes, `@${node.attrs.label ?? node.attrs.id}`],
    suggestion: {
      char: "@",
      pluginKey: DOC_MENTION_KEY,
      items: ({ query }) => {
        const needle = query.trim().toLowerCase();
        return getMembers()
          .filter((member) => !needle || member.full_name.toLowerCase().includes(needle))
          .slice(0, MAX_RESULTS);
      },
      render: () => ({
        onStart: (props) => {
          store.setState({
            is_open: true,
            items: props.items as DocMember[],
            query: props.query,
            selected_index: 0,
            range: props.range,
            getRect: props.clientRect ?? null,
            command: (member) => props.command({ id: String(member.id), label: member.full_name }),
          });
        },
        onUpdate: (props) => {
          store.setState({
            is_open: true,
            items: props.items as DocMember[],
            query: props.query,
            selected_index: 0,
            range: props.range,
            getRect: props.clientRect ?? null,
            command: (member) => props.command({ id: String(member.id), label: member.full_name }),
          });
        },
        onKeyDown: ({ event, view }) =>
          handleSuggestionKey(store, event, () => {
            exitSuggestion(view, DOC_MENTION_KEY);
            store.close();
          }),
        onExit: () => store.close(),
      }),
    },
  });
