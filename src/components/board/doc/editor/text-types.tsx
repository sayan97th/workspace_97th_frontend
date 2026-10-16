import React from "react";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { Heading1, Heading2, Heading3, Heading4, Quote, SquareCode, Type } from "lucide-react";

const ICON_SIZE = 16;

export type TextTypeOption = {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Heading level, set only on the title rows. */
  heading_level?: 1 | 2 | 3 | 4;
  apply: (chain: ChainedCommands) => ChainedCommands;
};

const headingOption = (level: 1 | 2 | 3 | 4, label: string, icon: React.ReactNode): TextTypeOption => ({
  key: `heading-${level}`,
  label,
  icon,
  heading_level: level,
  apply: (chain) => chain.setHeading({ level }),
});

/**
 * The "Normal text" dropdown, named the way monday's doc toolbar names them.
 * Shared by the doc toolbar (`DocToolbar`) and the comment composer
 * (`RichTextToolbar`), so both offer the same titles.
 */
export const TEXT_TYPES: TextTypeOption[] = [
  { key: "paragraph", label: "Normal text", icon: <Type size={ICON_SIZE} />, apply: (chain) => chain.setParagraph() },
  headingOption(1, "Large title", <Heading1 size={ICON_SIZE} />),
  headingOption(2, "Medium title", <Heading2 size={ICON_SIZE} />),
  headingOption(3, "Small title", <Heading3 size={ICON_SIZE} />),
  headingOption(4, "Extra small title", <Heading4 size={ICON_SIZE} />),
  { key: "blockquote", label: "Quote", icon: <Quote size={ICON_SIZE} />, apply: (chain) => chain.setBlockquote() },
  { key: "codeBlock", label: "Code block", icon: <SquareCode size={ICON_SIZE} />, apply: (chain) => chain.setCodeBlock() },
];

/** The text type the caret sits in, "paragraph" when it is none of the others. */
export const getActiveTextTypeKey = (editor: Editor): string =>
  TEXT_TYPES.find((option) => {
    if (option.heading_level) return editor.isActive("heading", { level: option.heading_level });
    return option.key !== "paragraph" && editor.isActive(option.key);
  })?.key ?? "paragraph";

/** Turns the block at the caret into `option`, clearing any wrapper (list, quote) first. */
export const applyTextType = (editor: Editor, option: TextTypeOption): void => {
  option.apply(editor.chain().focus().clearNodes()).run();
};
