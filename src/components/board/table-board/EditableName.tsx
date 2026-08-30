"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

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
      <input
        ref={input_ref}
        value={draft_value}
        onChange={(event) => onDraftChange(event.target.value)}
        onBlur={onCommit}
        onKeyDown={handleKeyDown}
        className={`absolute inset-0 z-20 box-border w-full rounded-[2px] border-2 border-[#4f6bed] bg-white text-[#1e2237] outline-none ${text_size_class}`}
        style={{ paddingLeft: input_padding_left_px, paddingRight: 12 }}
      />
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
