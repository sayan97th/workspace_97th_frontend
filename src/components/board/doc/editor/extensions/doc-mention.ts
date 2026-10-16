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

/** The picker scrolls, so the cap only keeps a very large workspace from rendering every member at once. */
const MAX_RESULTS = 50;

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
      // Name matches first, then people found only by their role, the same order as the comment composer's picker.
      items: ({ query }) => {
        const needle = query.trim().toLowerCase();
        const members = getMembers();
        if (!needle) return members.slice(0, MAX_RESULTS);
        const name_matches = members.filter((member) => member.full_name.toLowerCase().includes(needle));
        const role_matches = members.filter(
          (member) => !name_matches.includes(member) && member.job_title?.toLowerCase().includes(needle)
        );
        return [...name_matches, ...role_matches].slice(0, MAX_RESULTS);
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
