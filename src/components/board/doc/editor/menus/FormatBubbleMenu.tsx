"use client";
import React, { useEffect, useState } from "react";
import { NodeSelection } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEditorState } from "@tiptap/react";
import { Baseline, Bold, Check, Code, Italic, Link2, Strikethrough, Underline, Unlink } from "lucide-react";
import { useDocEditor } from "../DocEditorContext";
import { normalizeUrl } from "../nodes/media-urls";
import ColorPalette from "./ColorPalette";

type Panel = "none" | "link" | "color";

/**
 * Bubble shown over selected text, like Notion's: bold, italic, underline,
 * strikethrough, inline code, link (edited inline) and colors. Hidden in
 * code blocks and when a whole block (an image) is selected.
 */
const FormatBubbleMenu: React.FC = () => {
  const { editor, editable } = useDocEditor();
  const [panel, setPanel] = useState<Panel>("none");
  const [link_value, setLinkValue] = useState("");

  const marks = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            underline: current.isActive("underline"),
            strike: current.isActive("strike"),
            code: current.isActive("code"),
            link: current.isActive("link"),
            href: (current.getAttributes("link").href as string | undefined) ?? "",
            selection_key: `${current.state.selection.from}-${current.state.selection.to}`,
          }
        : null,
  });

  // A new selection starts with the buttons, not a half typed link.
  useEffect(() => {
    setPanel("none");
  }, [marks?.selection_key]);

  if (!editor || !editable || !marks) return null;

  const openLink = () => {
    setLinkValue(marks.href);
    setPanel(panel === "link" ? "none" : "link");
  };

  const applyLink = (event: React.FormEvent) => {
    event.preventDefault();
    const href = normalizeUrl(link_value);
    if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    else editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setPanel("none");
  };

  const buttons = [
    { key: "bold", label: "Bold", icon: <Bold size={15} />, is_active: marks.bold, run: () => editor.chain().focus().toggleBold().run() },
    { key: "italic", label: "Italic", icon: <Italic size={15} />, is_active: marks.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { key: "underline", label: "Underline", icon: <Underline size={15} />, is_active: marks.underline, run: () => editor.chain().focus().toggleUnderline().run() },
    { key: "strike", label: "Strikethrough", icon: <Strikethrough size={15} />, is_active: marks.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { key: "code", label: "Inline code", icon: <Code size={15} />, is_active: marks.code, run: () => editor.chain().focus().toggleCode().run() },
  ];

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="docFormatBubble"
      options={{ placement: "top", offset: 8, flip: true, shift: { padding: 8 } }}
      shouldShow={({ editor: current, state, from, to }) => {
        if (!current.isEditable || from === to) return false;
        if (state.selection instanceof NodeSelection) return false;
        if (current.isActive("codeBlock")) return false;
        return state.doc.textBetween(from, to, " ").trim().length > 0;
      }}
      className="doc-theme doc-bubble"
    >
      <div className="doc-bubble-row">
        {buttons.map((button) => (
          <button
            key={button.key}
            type="button"
            aria-label={button.label}
            title={button.label}
            aria-pressed={button.is_active}
            className={`doc-bubble-button${button.is_active ? " is-active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={button.run}
          >
            {button.icon}
          </button>
        ))}
        <span className="doc-bubble-divider" />
        <button
          type="button"
          aria-label="Link"
          title="Link"
          aria-pressed={marks.link}
          className={`doc-bubble-button${marks.link || panel === "link" ? " is-active" : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={openLink}
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          aria-label="Color"
          title="Color"
          className={`doc-bubble-button${panel === "color" ? " is-active" : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setPanel(panel === "color" ? "none" : "color")}
        >
          <Baseline size={15} />
        </button>
      </div>

      {panel === "link" && (
        <form className="doc-bubble-link" onSubmit={applyLink}>
          <input
            autoFocus
            type="text"
            value={link_value}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setPanel("none");
                editor.commands.focus();
              }
            }}
            placeholder="Paste or type a link"
            className="doc-input"
          />
          <button type="submit" className="doc-bubble-button" aria-label="Apply link" title="Apply link">
            <Check size={15} />
          </button>
          {marks.link && (
            <button
              type="button"
              className="doc-bubble-button"
              aria-label="Remove link"
              title="Remove link"
              onClick={() => {
                editor.chain().focus().extendMarkRange("link").unsetLink().run();
                setPanel("none");
              }}
            >
              <Unlink size={15} />
            </button>
          )}
        </form>
      )}

      {panel === "color" && <ColorPalette editor={editor} onPicked={() => setPanel("none")} />}
    </BubbleMenu>
  );
};

export default FormatBubbleMenu;
