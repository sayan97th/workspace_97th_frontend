"use client";

import { useState } from "react";
import PopoverPanel from "./PopoverPanel";
import type { ChecklistItemValue } from "../types";

interface ChecklistMenuProps {
  items: ChecklistItemValue[];
  onChange: (items: ChecklistItemValue[]) => void;
  onClose: () => void;
}

const nextChecklistItemId = () => `ci_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function ChecklistMenu({ items, onChange, onClose }: ChecklistMenuProps) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: nextChecklistItemId(), text, is_done: false }]);
    setDraft("");
  };

  return (
    <PopoverPanel onClose={onClose} className="left-1/2 top-full w-[260px] -translate-x-1/2 p-3">
      <div className="mb-2 flex max-h-[220px] flex-col gap-0.5 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2 rounded-[6px] px-1 py-1 hover:bg-boardtree-hover">
            <button
              type="button"
              onClick={() => onChange(items.map((it) => (it.id === item.id ? { ...it, is_done: !it.is_done } : it)))}
              className="flex h-[16px] w-[16px] flex-none items-center justify-center rounded-[4px] border-[1.5px]"
              style={{ borderColor: item.is_done ? "transparent" : "var(--color-boardtree-border)", background: item.is_done ? "#00c875" : "transparent" }}
            >
              {item.is_done && <svg viewBox="0 0 14 14" width="10" height="10"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>}
            </button>
            <input
              value={item.text}
              onChange={(e) => onChange(items.map((it) => (it.id === item.id ? { ...it, text: e.target.value } : it)))}
              className={`h-6 min-w-0 flex-1 bg-transparent text-[12.5px] outline-none ${item.is_done ? "text-boardtree-text-faint line-through" : "text-boardtree-text"}`}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((it) => it.id !== item.id))}
              className="flex h-5 w-5 flex-none items-center justify-center rounded-[4px] text-boardtree-text-faint opacity-0 hover:bg-boardtree-hover-strong hover:text-boardtree-danger group-hover:opacity-100"
            >
              <svg viewBox="0 0 14 14" width="11" height="11"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="px-1 py-1.5 text-[12.5px] text-boardtree-text-faint">No sub-tasks yet.</div>}
      </div>
      <div className="flex items-center gap-2 border-t border-boardtree-border-soft pt-2.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addItem();
          }}
          placeholder="Add a sub-task"
          className="h-8 min-w-0 flex-1 rounded-[6px] border border-boardtree-border bg-boardtree-surface px-2.5 text-[12.5px] text-boardtree-text outline-none focus:border-boardtree-accent"
        />
        <button type="button" onClick={addItem} disabled={!draft.trim()} className="flex h-8 flex-none items-center justify-center rounded-[6px] bg-boardtree-accent px-3 text-[12.5px] font-medium text-white disabled:opacity-40">
          Add
        </button>
      </div>
    </PopoverPanel>
  );
}
