"use client";
import React, { useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { ChevronDown } from "lucide-react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import { applyTextType, getActiveTextTypeKey, TEXT_TYPES } from "../doc/editor/text-types";
import {
  BoldIcon,
  BulletListIcon,
  CodeBlockIcon,
  InlineCodeIcon,
  ItalicIcon,
  LinkFormatIcon,
  NumberedListIcon,
  QuoteIcon,
  RedoIcon,
  StrikethroughIcon,
  UnderlineIcon,
  UndoIcon,
} from "@/icons/drawer-icons";

const ICON_SIZE = 15;

/** The label of the platform's command key, for the shortcut hints in the toolbar tooltips. */
const getModKeyLabel = (): string =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";

/** The label of the platform's option key, for the title shortcuts. */
const getAltKeyLabel = (): string =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌥" : "Alt";

type ToolbarButtonProps = {
  label: string;
  /** Keyboard chord shown after the label in the tooltip, e.g. "Ctrl+B". */
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  button_ref?: React.Ref<HTMLButtonElement>;
  class_name?: string;
  /** Marks a button that opens a menu, for assistive tech. */
  has_popup?: boolean;
  children: React.ReactNode;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  button_ref,
  class_name = "",
  has_popup,
  children,
}) => (
  <button
    ref={button_ref}
    type="button"
    // Keeps the editor focused, so a click never drops the selection it formats.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={has_popup ? undefined : active}
    aria-haspopup={has_popup ? "menu" : undefined}
    aria-expanded={has_popup ? active : undefined}
    title={shortcut ? `${label} (${shortcut})` : label}
    data-active={active ? "true" : undefined}
    className={`rich-text-tool ${class_name}`}
  >
    {children}
  </button>
);

const ToolbarDivider: React.FC = () => <span className="rich-text-tool-divider" aria-hidden="true" />;

export type RichTextToolbarProps = {
  editor: Editor;
  /** Opens the composer's link dialog, prefilled from the selection. */
  onOpenLink: () => void;
};

/**
 * The composer's formatting row, laid out like Slack's message editor: undo
 * and redo, the doc's text type dropdown (Normal text, the four titles,
 * Quote, Code block), then bold, italic, underline and strikethrough, link
 * and the two lists, and quote, inline code and code block. Every button
 * keeps the editor focused and reflects the formatting at the caret.
 */
const RichTextToolbar: React.FC<RichTextToolbarProps> = ({ editor, onOpenLink }) => {
  const text_type_ref = useRef<HTMLButtonElement>(null);
  const [is_text_type_open, setIsTextTypeOpen] = useState(false);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      can_undo: current.can().undo(),
      can_redo: current.can().redo(),
      text_type: getActiveTextTypeKey(current),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      code: current.isActive("code"),
      link: current.isActive("link"),
      bullet_list: current.isActive("bulletList"),
      ordered_list: current.isActive("orderedList"),
      blockquote: current.isActive("blockquote"),
      code_block: current.isActive("codeBlock"),
    }),
  });

  const mod_key = getModKeyLabel();
  const alt_key = getAltKeyLabel();
  const chain = () => editor.chain().focus();
  const current_text_type = TEXT_TYPES.find((option) => option.key === state.text_type) ?? TEXT_TYPES[0];

  const text_type_sections: ActionMenuSection[] = [
    {
      key: "text-types",
      items: TEXT_TYPES.map((option) => ({
        key: option.key,
        label: option.label,
        icon: option.icon,
        is_selected: option.key === state.text_type,
        meta: option.heading_level ? `${mod_key}+${alt_key}+${option.heading_level}` : undefined,
        onClick: () => {
          setIsTextTypeOpen(false);
          applyTextType(editor, option);
        },
      })),
    },
  ];

  return (
    <div className="rich-text-toolbar" role="toolbar" aria-label="Formatting">
      <ToolbarButton label="Undo" shortcut={`${mod_key}+Z`} disabled={!state.can_undo} onClick={() => chain().undo().run()}>
        <UndoIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton label="Redo" shortcut={`${mod_key}+Shift+Z`} disabled={!state.can_redo} onClick={() => chain().redo().run()}>
        <RedoIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Text type"
        button_ref={text_type_ref}
        active={is_text_type_open}
        has_popup
        class_name="rich-text-tool--labeled"
        onClick={() => setIsTextTypeOpen((is_open) => !is_open)}
      >
        {current_text_type.icon}
        <span className="rich-text-tool__label">{current_text_type.label}</span>
        <ChevronDown size={13} aria-hidden="true" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Bold" shortcut={`${mod_key}+B`} active={state.bold} onClick={() => chain().toggleBold().run()}>
        <BoldIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton label="Italic" shortcut={`${mod_key}+I`} active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <ItalicIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton label="Underline" shortcut={`${mod_key}+U`} active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <UnderlineIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        shortcut={`${mod_key}+Shift+S`}
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <StrikethroughIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton label="Link" shortcut={`${mod_key}+K`} active={state.link} onClick={onOpenLink}>
        <LinkFormatIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        shortcut={`${mod_key}+Shift+7`}
        active={state.ordered_list}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <NumberedListIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        label="Bulleted list"
        shortcut={`${mod_key}+Shift+8`}
        active={state.bullet_list}
        onClick={() => chain().toggleBulletList().run()}
      >
        <BulletListIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        label="Quote"
        shortcut={`${mod_key}+Shift+B`}
        active={state.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <QuoteIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton label="Inline code" shortcut={`${mod_key}+E`} active={state.code} onClick={() => chain().toggleCode().run()}>
        <InlineCodeIcon size={ICON_SIZE} />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        shortcut={`${mod_key}+${alt_key}+C`}
        active={state.code_block}
        onClick={() => chain().toggleCodeBlock().run()}
      >
        <CodeBlockIcon size={ICON_SIZE} />
      </ToolbarButton>

      <ActionMenu
        anchor_el={text_type_ref.current}
        is_open={is_text_type_open}
        onClose={() => setIsTextTypeOpen(false)}
        sections={text_type_sections}
        aria_label="Text type"
        width={240}
        align="start"
        class_name="rich-text-text-type-menu"
      />
    </div>
  );
};

export default RichTextToolbar;
