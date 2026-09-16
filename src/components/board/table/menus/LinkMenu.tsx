"use client";

import { useState } from "react";
import PopoverPanel from "./PopoverPanel";

interface LinkMenuProps {
  url: string;
  text: string;
  onSave: (url: string, text: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function LinkMenu({ url, text, onSave, onClear, onClose }: LinkMenuProps) {
  const [draft_url, setDraftUrl] = useState(url);
  const [draft_text, setDraftText] = useState(text);

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[260px] -translate-x-1/2 p-3.5">
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-boardtree-text-faint">Link</label>
      <input
        autoFocus
        value={draft_url}
        onChange={(e) => setDraftUrl(e.target.value)}
        placeholder="https://example.com"
        className="mb-2.5 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 py-1.5 text-[12.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
      />
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-boardtree-text-faint">Display text</label>
      <input
        value={draft_text}
        onChange={(e) => setDraftText(e.target.value)}
        placeholder="Link text"
        className="mb-3 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 py-1.5 text-[12.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
      />
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClear} className="text-[12px] text-boardtree-text-muted hover:text-boardtree-accent">
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            if (draft_url.trim()) onSave(draft_url.trim(), draft_text.trim());
            onClose();
          }}
          className="rounded-[6px] bg-boardtree-accent px-3 py-1.5 text-[12.5px] font-medium text-white hover:bg-boardtree-accent-hover"
        >
          Save
        </button>
      </div>
    </PopoverPanel>
  );
}
