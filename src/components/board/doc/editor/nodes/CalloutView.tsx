"use client";
import React, { useRef, useState } from "react";
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import BoardPopover from "@/components/board/toolbar/BoardPopover";

const CALLOUT_EMOJIS = ["💡", "📌", "✅", "⚠️", "❗", "❓", "🔥", "🚀", "📝", "📣", "🎯", "⭐"];

export const CALLOUT_COLORS: { value: string; label: string }[] = [
  { value: "gray", label: "Gray" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "yellow", label: "Yellow" },
  { value: "red", label: "Red" },
  { value: "purple", label: "Purple" },
];

/** Callout block: a tinted box whose emoji opens a small picker for the emoji and the color. */
const CalloutView: React.FC<NodeViewProps> = ({ node, editor, updateAttributes }) => {
  const emoji_ref = useRef<HTMLButtonElement>(null);
  const [is_picker_open, setIsPickerOpen] = useState(false);

  return (
    <NodeViewWrapper className="doc-callout" data-color={node.attrs.color}>
      <button
        ref={emoji_ref}
        type="button"
        contentEditable={false}
        className="doc-callout-emoji"
        aria-label="Change callout icon"
        disabled={!editor.isEditable}
        onClick={() => setIsPickerOpen(true)}
      >
        {node.attrs.emoji}
      </button>
      <NodeViewContent className="doc-callout-content" />

      <BoardPopover anchor_el={emoji_ref.current} is_open={is_picker_open} onClose={() => setIsPickerOpen(false)} width={232} align="start">
        <div className="doc-theme doc-popover p-2">
          <div className="doc-popover-label">Icon</div>
          <div className="grid grid-cols-6 gap-1">
            {CALLOUT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="doc-emoji-option"
                onClick={() => {
                  updateAttributes({ emoji });
                  setIsPickerOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="doc-popover-label mt-2">Color</div>
          <div className="flex gap-1.5">
            {CALLOUT_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={color.label}
                title={color.label}
                data-color={color.value}
                className={`doc-callout-swatch${node.attrs.color === color.value ? " is-active" : ""}`}
                onClick={() => updateAttributes({ color: color.value })}
              />
            ))}
          </div>
        </div>
      </BoardPopover>
    </NodeViewWrapper>
  );
};

export default CalloutView;
