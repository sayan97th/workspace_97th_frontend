"use client";
import React, { useRef, useState } from "react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AtSign,
  Bold,
  ChevronDown,
  Code,
  Image,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Plus,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table,
  Underline,
  Undo2,
} from "lucide-react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";
import BoardPopover from "@/components/board/toolbar/BoardPopover";
import { DOC_BLOCK_GROUP_LABELS, DOC_BLOCKS, type DocBlockGroup } from "./doc-blocks";
import { useDocEditor } from "./DocEditorContext";
import ColorPalette from "./menus/ColorPalette";
import { runHistoryCommand } from "./extensions/safe-history";
import { applyTextType, getActiveTextTypeKey, TEXT_TYPES } from "./text-types";

const ICON_SIZE = 16;

const ALIGNMENTS = [
  { value: "left", label: "Align left", icon: AlignLeft },
  { value: "center", label: "Align center", icon: AlignCenter },
  { value: "right", label: "Align right", icon: AlignRight },
  { value: "justify", label: "Justify", icon: AlignJustify },
] as const;

const BLOCK_GROUPS: DocBlockGroup[] = ["basic", "media", "inline"];

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  is_active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  button_ref?: React.Ref<HTMLButtonElement>;
  className?: string;
};

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ label, onClick, is_active = false, disabled = false, children, button_ref, className = "" }) => (
  <button
    ref={button_ref}
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={is_active}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={`doc-toolbar-button${is_active ? " is-active" : ""} ${className}`}
  >
    {children}
  </button>
);

const ToolbarDivider = () => <span className="doc-toolbar-divider" aria-hidden="true" />;

type DocToolbarProps = {
  /** Page actions on the right (presence, Share, the "..." menu). */
  trailing?: React.ReactNode;
};

/**
 * The doc's top toolbar, laid out like monday's: "+ Add" (every block),
 * undo/redo, the text type and alignment dropdowns, list toggles, "Style"
 * (marks, colors, clear formatting) and "@" to mention someone. Read only
 * viewers only see the trailing page actions.
 */
const DocToolbar: React.FC<DocToolbarProps> = ({ trailing }) => {
  const { editor, editable, runBlock, openMedia } = useDocEditor();
  const add_ref = useRef<HTMLButtonElement>(null);
  const text_type_ref = useRef<HTMLButtonElement>(null);
  const align_ref = useRef<HTMLButtonElement>(null);
  const style_ref = useRef<HTMLButtonElement>(null);
  const [open_menu, setOpenMenu] = useState<"add" | "text-type" | "align" | "style" | null>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      return {
        can_undo: current.can().undo(),
        can_redo: current.can().redo(),
        text_type: getActiveTextTypeKey(current),
        align: ALIGNMENTS.find((option) => current.isActive({ textAlign: option.value }))?.value ?? "left",
        bullet_list: current.isActive("bulletList"),
        ordered_list: current.isActive("orderedList"),
        task_list: current.isActive("taskList"),
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        code: current.isActive("code"),
      };
    },
  });

  const closeMenu = () => setOpenMenu(null);

  if (!editor || !state || !editable) {
    return (
      <div className="doc-toolbar">
        <div className="doc-toolbar-trailing">{trailing}</div>
      </div>
    );
  }

  const chain = () => editor.chain().focus();
  const current_text_type = TEXT_TYPES.find((option) => option.key === state.text_type) ?? TEXT_TYPES[0];
  const CurrentAlignIcon = ALIGNMENTS.find((option) => option.value === state.align)?.icon ?? AlignLeft;

  const add_sections: ActionMenuSection[] = BLOCK_GROUPS.map((group) => ({
    key: group,
    items: DOC_BLOCKS.filter((block) => block.group === group).map((block) => {
      const Icon = block.icon;
      return {
        key: block.key,
        label: block.label,
        icon: <Icon size={ICON_SIZE} />,
        onClick: () => {
          closeMenu();
          runBlock(block);
        },
      };
    }),
  }));

  const text_type_sections: ActionMenuSection[] = [
    {
      key: "text-types",
      items: TEXT_TYPES.map((option) => ({
        key: option.key,
        label: option.label,
        icon: option.icon,
        onClick: () => {
          closeMenu();
          applyTextType(editor, option);
        },
      })),
    },
  ];

  const align_sections: ActionMenuSection[] = [
    {
      key: "align",
      items: ALIGNMENTS.map((option) => {
        const Icon = option.icon;
        return {
          key: option.value,
          label: option.label,
          icon: <Icon size={ICON_SIZE} />,
          onClick: () => {
            closeMenu();
            chain().setTextAlign(option.value).run();
          },
        };
      }),
    },
  ];

  const insertMention = () => {
    const { from } = editor.state.selection;
    const char_before = from > 1 ? editor.state.doc.textBetween(from - 1, from, " ", " ") : " ";
    chain().insertContent(/\s/.test(char_before) || char_before === "" ? "@" : " @").run();
  };

  const style_marks = [
    { key: "bold", label: "Bold", icon: <Bold size={ICON_SIZE} />, is_active: state.bold, run: () => chain().toggleBold().run() },
    { key: "italic", label: "Italic", icon: <Italic size={ICON_SIZE} />, is_active: state.italic, run: () => chain().toggleItalic().run() },
    { key: "underline", label: "Underline", icon: <Underline size={ICON_SIZE} />, is_active: state.underline, run: () => chain().toggleUnderline().run() },
    { key: "strike", label: "Strikethrough", icon: <Strikethrough size={ICON_SIZE} />, is_active: state.strike, run: () => chain().toggleStrike().run() },
    { key: "code", label: "Inline code", icon: <Code size={ICON_SIZE} />, is_active: state.code, run: () => chain().toggleCode().run() },
  ];

  return (
    <div className="doc-toolbar" role="toolbar" aria-label="Doc formatting">
      <div className="doc-toolbar-group">
        <button
          ref={add_ref}
          type="button"
          className="doc-add-button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenMenu(open_menu === "add" ? null : "add")}
        >
          <Plus size={16} strokeWidth={2.25} />
          Add
        </button>
        <ToolbarButton label="Undo" disabled={!state.can_undo} onClick={() => runHistoryCommand(editor, "undo")}>
          <Undo2 size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!state.can_redo} onClick={() => runHistoryCommand(editor, "redo")}>
          <Redo2 size={ICON_SIZE} />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <div className="doc-toolbar-group">
        <ToolbarButton
          label="Text type"
          button_ref={text_type_ref}
          is_active={open_menu === "text-type"}
          className="is-labeled is-text-type"
          onClick={() => setOpenMenu(open_menu === "text-type" ? null : "text-type")}
        >
          {current_text_type.icon}
          <span className="truncate">{current_text_type.label}</span>
          <ChevronDown size={14} />
        </ToolbarButton>
        <ToolbarButton
          label="Alignment"
          button_ref={align_ref}
          is_active={open_menu === "align"}
          className="is-labeled"
          onClick={() => setOpenMenu(open_menu === "align" ? null : "align")}
        >
          <CurrentAlignIcon size={ICON_SIZE} />
          <ChevronDown size={14} />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <div className="doc-toolbar-group">
        <ToolbarButton label="Bulleted list" is_active={state.bullet_list} onClick={() => chain().toggleBulletList().run()}>
          <List size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" is_active={state.ordered_list} onClick={() => chain().toggleOrderedList().run()}>
          <ListOrdered size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton label="Checklist" is_active={state.task_list} onClick={() => chain().toggleTaskList().run()}>
          <ListTodo size={ICON_SIZE} />
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <div className="doc-toolbar-group">
        <ToolbarButton
          label="Style"
          button_ref={style_ref}
          is_active={open_menu === "style"}
          className="is-labeled is-text"
          onClick={() => setOpenMenu(open_menu === "style" ? null : "style")}
        >
          Style
        </ToolbarButton>
      </div>

      <ToolbarDivider />

      <div className="doc-toolbar-group">
        <ToolbarButton label="Mention a person" onClick={insertMention}>
          <AtSign size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton label="Add an image" onClick={() => openMedia("image")}>
          <Image size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton label="Add a table" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <Table size={ICON_SIZE} />
        </ToolbarButton>
      </div>

      <div className="doc-toolbar-trailing">{trailing}</div>

      <ActionMenu
        anchor_el={add_ref.current}
        is_open={open_menu === "add"}
        onClose={closeMenu}
        sections={add_sections}
        aria_label="Add a block"
        title={DOC_BLOCK_GROUP_LABELS.basic}
        width={240}
        align="start"
      />
      <ActionMenu
        anchor_el={text_type_ref.current}
        is_open={open_menu === "text-type"}
        onClose={closeMenu}
        sections={text_type_sections}
        aria_label="Text type"
        width={220}
        align="start"
      />
      <ActionMenu
        anchor_el={align_ref.current}
        is_open={open_menu === "align"}
        onClose={closeMenu}
        sections={align_sections}
        aria_label="Alignment"
        width={190}
        align="start"
      />
      <BoardPopover anchor_el={style_ref.current} is_open={open_menu === "style"} onClose={closeMenu} width={260} align="start">
        <div className="doc-theme doc-popover p-2">
          <div className="doc-popover-label">Text style</div>
          <div className="flex items-center gap-1">
            {style_marks.map((mark) => (
              <ToolbarButton key={mark.key} label={mark.label} is_active={mark.is_active} onClick={mark.run}>
                {mark.icon}
              </ToolbarButton>
            ))}
            <ToolbarButton label="Clear formatting" onClick={() => chain().unsetAllMarks().run()}>
              <RemoveFormatting size={ICON_SIZE} />
            </ToolbarButton>
          </div>
          <ColorPalette editor={editor} />
        </div>
      </BoardPopover>
    </div>
  );
};

export default DocToolbar;
