"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import EmojiInsertButton from "../EmojiInsertButton";

interface EditableNameProps {
  name: string;
  is_editing: boolean;
  draft_value: string;
  text_size_class: string;
  input_padding_left_px: number;
  onStartEdit: () => void;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
}

const EditableName = ({
  name,
  is_editing,
  draft_value,
  text_size_class,
  input_padding_left_px,
  onStartEdit,
  onDraftChange,
  onCommit,
}: EditableNameProps) => {
  const input_ref = useRef<HTMLInputElement>(null);
  // See the matching guard in `InlineTitleEditor`: picking an emoji blurs
  // this input from a portaled element outside it, which would otherwise
  // reach `onBlur`/`onCommit` before the pick's own text update lands.
  const is_emoji_palette_open_ref = useRef(false);

  useEffect(() => {
    if (is_editing) {
      input_ref.current?.focus();
      input_ref.current?.select();
    }
  }, [is_editing]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      onDraftChange(name);
      event.currentTarget.blur();
    }
  };

  if (is_editing) {
    return (
      <span className="absolute inset-0 z-20 flex items-center">
        <input
          ref={input_ref}
          value={draft_value}
          onChange={(event) => onDraftChange(event.target.value)}
          onBlur={() => {
            if (!is_emoji_palette_open_ref.current) onCommit();
          }}
          onKeyDown={handleKeyDown}
          className={`box-border h-full w-full rounded-[2px] border-2 border-[#4f6bed] bg-white text-[#1e2237] outline-none ${text_size_class}`}
          style={{ paddingLeft: input_padding_left_px, paddingRight: 28 }}
        />
        <EmojiInsertButton
          input_ref={input_ref}
          value={draft_value}
          onChange={onDraftChange}
          onOpenChange={(is_open) => {
            is_emoji_palette_open_ref.current = is_open;
          }}
          size={13}
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
        />
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center">
      <span
        onClick={onStartEdit}
        className={`max-w-full cursor-text overflow-hidden text-ellipsis whitespace-nowrap rounded px-1.5 py-1 text-[#262b45] ${text_size_class}`}
      >
        {name}
      </span>
    </div>
  );
};

export default EditableName;
