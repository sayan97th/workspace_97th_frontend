"use client";

import { useId, useState, type FormEvent } from "react";
import PopoverPanel from "./PopoverPanel";

interface LinkMenuProps {
  url: string;
  text: string;
  onSave: (url: string, text: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const INPUT_CLASS =
  "h-9 w-full rounded-[4px] border border-boardtree-border bg-boardtree-surface px-3 text-[14px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint hover:border-boardtree-text-muted focus:border-boardtree-accent";

/**
 * A Link cell's editor, styled after monday.com: "Web address" and "Text to
 * display" fields. Enter or Save stores the link, Remove clears the cell.
 */
export default function LinkMenu({ url, text, onSave, onClear, onClose }: LinkMenuProps) {
  const [draft_url, setDraftUrl] = useState(url);
  const [draft_text, setDraftText] = useState(text);
  const url_input_id = useId();
  const text_input_id = useId();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (draft_url.trim()) onSave(draft_url.trim(), draft_text.trim());
    onClose();
  };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[300px] -translate-x-1/2 p-4">
      <form onSubmit={handleSubmit}>
        <label htmlFor={url_input_id} className="mb-1.5 block text-[14px] text-boardtree-text">
          Web address
        </label>
        <input
          id={url_input_id}
          autoFocus
          type="text"
          inputMode="url"
          value={draft_url}
          onChange={(e) => setDraftUrl(e.target.value)}
          placeholder="www.example.com"
          className={`${INPUT_CLASS} mb-3`}
        />
        <label htmlFor={text_input_id} className="mb-1.5 block text-[14px] text-boardtree-text">
          Text to display
        </label>
        <input
          id={text_input_id}
          type="text"
          value={draft_text}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="Example text"
          className={`${INPUT_CLASS} mb-4`}
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClear();
              onClose();
            }}
            disabled={!url}
            className="rounded-[4px] px-2 py-1.5 text-[14px] text-boardtree-text-muted hover:bg-boardtree-hover hover:text-boardtree-text disabled:invisible"
          >
            Remove
          </button>
          <button
            type="submit"
            disabled={!draft_url.trim()}
            className="rounded-[4px] bg-boardtree-accent px-4 py-1.5 text-[14px] font-medium text-white hover:bg-boardtree-accent-hover disabled:cursor-not-allowed disabled:bg-boardtree-hover disabled:text-boardtree-text-faint"
          >
            Save
          </button>
        </div>
      </form>
    </PopoverPanel>
  );
}
