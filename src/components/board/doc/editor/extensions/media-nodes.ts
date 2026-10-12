import { Node, mergeAttributes } from "@tiptap/core";
import TiptapImage from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageBlockView from "../nodes/ImageBlockView";
import VideoBlockView from "../nodes/VideoBlockView";
import AudioBlockView from "../nodes/AudioBlockView";
import FileBlockView from "../nodes/FileBlockView";
import BookmarkView from "../nodes/BookmarkView";
import CalloutView from "../nodes/CalloutView";

/** Where a resizable media block sits on its line. */
export type MediaAlign = "left" | "center" | "right";

const ALIGNS: MediaAlign[] = ["left", "center", "right"];

const parseAlign = (value: string | null): MediaAlign => (ALIGNS.includes(value as MediaAlign) ? (value as MediaAlign) : "center");

const parsePercent = (value: string | null, fallback: number | null): number | null => {
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(100, parsed) : fallback;
};

/**
 * Width (as a percent of the text column, so it reflows with the page) and
 * alignment, shared by every resizable block. `upload_id` marks a block whose
 * file is still uploading, it is never written to HTML.
 */
const resizableAttributes = (default_width: number | null) => ({
  width_percent: {
    default: default_width,
    parseHTML: (element: HTMLElement) => parsePercent(element.getAttribute("data-width-percent"), default_width),
    renderHTML: (attributes: { width_percent: number | null }) =>
      attributes.width_percent ? { "data-width-percent": attributes.width_percent } : {},
  },
  align: {
    default: "center",
    parseHTML: (element: HTMLElement) => parseAlign(element.getAttribute("data-align")),
    renderHTML: (attributes: { align: MediaAlign }) => ({ "data-align": attributes.align }),
  },
  upload_id: { default: null, rendered: false },
});

/**
 * Block image with a drag to resize frame and left/center/right alignment.
 * Keeps the stock `image` name, so markdown `![alt](src)` from older docs
 * still loads into it.
 */
export const ImageBlock = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...resizableAttributes(null),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
}).configure({ inline: false, allowBase64: true });

/** An uploaded video file, or a YouTube, Vimeo or Loom link shown as an embedded player. */
export const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (element) => element.getAttribute("data-src") },
      ...resizableAttributes(100),
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="video-block"]' }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "video-block", "data-src": node.attrs.src })];
  },
  renderMarkdown: (node) => (node.attrs?.src ? `[Video](${node.attrs.src})` : ""),
  addNodeView() {
    return ReactNodeViewRenderer(VideoBlockView);
  },
});

/** An uploaded audio clip with the browser's player. */
export const AudioBlock = Node.create({
  name: "audioBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null, parseHTML: (element) => element.getAttribute("data-src") },
      name: { default: null, parseHTML: (element) => element.getAttribute("data-name") },
      upload_id: { default: null, rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="audio-block"]' }];
  },
  renderHTML({ node }) {
    return ["div", { "data-type": "audio-block", "data-src": node.attrs.src, "data-name": node.attrs.name }];
  },
  renderMarkdown: (node) => (node.attrs?.src ? `[${node.attrs.name || "Audio"}](${node.attrs.src})` : ""),
  addNodeView() {
    return ReactNodeViewRenderer(AudioBlockView);
  },
});

/** Any other attachment, shown as a download card. */
export const FileBlock = Node.create({
  name: "fileBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      url: { default: null, parseHTML: (element) => element.getAttribute("data-url") },
      name: { default: null, parseHTML: (element) => element.getAttribute("data-name") },
      size: { default: null, parseHTML: (element) => Number(element.getAttribute("data-size")) || null },
      mime_type: { default: null, parseHTML: (element) => element.getAttribute("data-mime-type") },
      upload_id: { default: null, rendered: false },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="file-block"]' }];
  },
  renderHTML({ node }) {
    return [
      "div",
      {
        "data-type": "file-block",
        "data-url": node.attrs.url,
        "data-name": node.attrs.name,
        "data-size": node.attrs.size,
        "data-mime-type": node.attrs.mime_type,
      },
    ];
  },
  renderMarkdown: (node) => (node.attrs?.url ? `[${node.attrs.name || "File"}](${node.attrs.url})` : ""),
  addNodeView() {
    return ReactNodeViewRenderer(FileBlockView);
  },
});

/** A web link shown as a card, Notion's "Web bookmark". */
export const Bookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      url: { default: null, parseHTML: (element) => element.getAttribute("data-url") },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="bookmark"]' }];
  },
  renderHTML({ node }) {
    return ["div", { "data-type": "bookmark", "data-url": node.attrs.url }];
  },
  renderMarkdown: (node) => (node.attrs?.url ? `<${node.attrs.url}>` : ""),
  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView);
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the current block in a callout. */
      setCallout: () => ReturnType;
    };
  }
}

/** A highlighted box with an emoji, holding any blocks. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,
  addAttributes() {
    return {
      emoji: {
        default: "💡",
        parseHTML: (element) => element.getAttribute("data-emoji") || "💡",
        renderHTML: (attributes) => ({ "data-emoji": attributes.emoji }),
      },
      color: {
        default: "gray",
        parseHTML: (element) => element.getAttribute("data-color") || "gray",
        renderHTML: (attributes) => ({ "data-color": attributes.color }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout", class: "doc-callout" }), 0];
  },
  renderMarkdown: (node, helpers) => {
    const body = helpers.renderChildren(node.content ?? [], "\n\n");
    return `> ${node.attrs?.emoji ?? ""} ${body}`.split("\n").join("\n> ");
  },
  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    };
  },
  addKeyboardShortcuts() {
    return {
      // Enter on an empty last line leaves the callout, like Notion.
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.depth < 2 || $from.parent.type.name !== "paragraph" || $from.parent.content.size > 0) return false;
        const callout = $from.node(-1);
        if (callout.type.name !== this.name || $from.index(-1) !== callout.childCount - 1) return false;
        return editor.commands.lift(this.name);
      },
      // Backspace at the very start of the callout lifts its first line out.
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.depth < 2 || $from.parentOffset !== 0) return false;
        const callout = $from.node(-1);
        if (callout.type.name !== this.name || $from.index(-1) !== 0) return false;
        return editor.commands.lift(this.name);
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
