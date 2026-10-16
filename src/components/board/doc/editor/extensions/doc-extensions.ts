import { Extension, InputRule, wrappingInputRule, type AnyExtension, type Range } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Blockquote from "@tiptap/extension-blockquote";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Typography from "@tiptap/extension-typography";
import { Markdown } from "@tiptap/markdown";
import { common, createLowlight } from "lowlight";
import type { DocBlock } from "../doc-blocks";
import type { SuggestionStore } from "../suggestion-store";
import { AudioBlock, Bookmark, Callout, FileBlock, ImageBlock, VideoBlock } from "./media-nodes";
import { SlashCommand } from "./slash-command";
import { createDocMention, type DocMember } from "./doc-mention";
import { FileDropPaste } from "./file-drop-paste";
import { SafeHistory } from "./safe-history";

const lowlight = createLowlight(common);

/** Notion's quote shortcut is `"` + space, since `>` + space makes a toggle list. */
const DocBlockquote = Blockquote.extend({
  addInputRules() {
    return [wrappingInputRule({ find: /^\s*"\s$/, type: this.type })];
  },
});

/** `>` + space at the start of a line turns it into a toggle list. */
const ToggleShortcut = Extension.create({
  name: "toggleShortcut",
  addInputRules() {
    return [
      new InputRule({
        find: /^\s*>\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).setDetails().run();
        },
      }),
    ];
  },
});

export type DocExtensionsConfig = {
  slash_store: SuggestionStore<DocBlock>;
  onSlashSelect: (block: DocBlock, range: Range) => void;
  mention_store: SuggestionStore<DocMember>;
  getMembers: () => DocMember[];
  onFiles: (files: File[], position: number | null) => void;
};

/**
 * The doc editor's schema and behavior: StarterKit (paragraphs, headings,
 * lists, marks, links, undo/redo...), to-do lists, toggles, callouts,
 * tables, highlighted code, resizable media, mentions, the "/" menu, file
 * drop/paste, and Markdown (for importing older markdown docs and the
 * "Export as Markdown" action).
 */
export const buildDocExtensions = (config: DocExtensionsConfig): AnyExtension[] => [
  StarterKit.configure({
    blockquote: false,
    codeBlock: false,
    heading: { levels: [1, 2, 3, 4] },
    dropcursor: { color: "#0073ea", width: 3 },
    undoRedo: { depth: 200 },
    link: {
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  DocBlockquote,
  ToggleShortcut,
  TaskList,
  TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  TableKit.configure({ table: { resizable: true, HTMLAttributes: { class: "doc-table" } } }),
  Details.configure({ persist: true, HTMLAttributes: { class: "doc-toggle" } }),
  DetailsSummary,
  DetailsContent,
  CodeBlockLowlight.configure({ lowlight, defaultLanguage: null, HTMLAttributes: { class: "doc-code-block" } }),
  Typography,
  Callout,
  ImageBlock,
  VideoBlock,
  AudioBlock,
  FileBlock,
  Bookmark,
  createDocMention(config.mention_store, config.getMembers),
  SlashCommand.configure({ store: config.slash_store, onSelect: config.onSlashSelect }),
  FileDropPaste.configure({ onFiles: config.onFiles }),
  SafeHistory,
  Placeholder.configure({
    includeChildren: true,
    showOnlyCurrent: true,
    placeholder: ({ editor, node }) => {
      if (node.type.name === "heading") return `Heading ${node.attrs.level}`;
      if (node.type.name === "detailsSummary") return "Toggle";
      if (node.type.name !== "paragraph") return "";
      return editor.isEmpty ? "Type '/' to start with a block, or simply start writing" : "Type '/' for commands";
    },
  }),
  Markdown,
];
