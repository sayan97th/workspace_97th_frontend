"use client";

import { useState } from "react";
import type { TagDef } from "../../_types/board.types";
import { STATUS_PALETTE } from "../../_lib/constants";

interface TagManagerModalProps {
  tag_defs: TagDef[];
  onColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  onAdd: (label: string) => void;
  onClose: () => void;
}

export default function TagManagerModal({ tag_defs, onColor, onDelete, onAdd, onClose }: TagManagerModalProps) {
  const [color_picker_id, setColorPickerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[80vh] w-[420px] flex-col rounded-[14px] bg-white shadow-[0_24px_60px_rgba(30,34,55,0.30)]">
        <div className="flex items-center justify-between border-b border-[#eceef5] px-5 py-4">
          <div className="text-[15px] font-semibold text-[#1e2237]">Manage tags</div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#6b7189] hover:bg-[#f1f3f9]">
            <svg viewBox="0 0 14 14" width="12" height="12"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {tag_defs.map((tag) => (
            <div key={tag.id} className="relative flex items-center gap-2.5 py-1.5">
              <button
                type="button"
                onClick={() => setColorPickerId(color_picker_id === tag.id ? null : tag.id)}
                className="h-7 w-7 flex-none rounded-[6px]"
                style={{ background: tag.color }}
              />
              {color_picker_id === tag.id && (
                <div className="absolute left-9 top-8 z-10 grid w-[168px] grid-cols-6 gap-1.5 rounded-[10px] border border-[#e3e6ef] bg-white p-2.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)]">
                  {STATUS_PALETTE.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => { onColor(tag.id, color); setColorPickerId(null); }}
                      className="h-5 w-5 rounded-[4px]"
                      style={{ background: color, boxShadow: color === tag.color ? "0 0 0 2px rgba(30,34,55,0.55)" : "none" }}
                    />
                  ))}
                </div>
              )}
              <div className="flex-1 text-[13px] font-medium" style={{ color: tag.color }}>{tag.label}</div>
              <button type="button" onClick={() => onDelete(tag.id)} className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-[#a4aac2] hover:bg-[#fdf2f4] hover:text-[#b02f43]">
                <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          ))}
          <div className="mt-2 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="#new-tag"
              className="h-9 flex-1 rounded-[7px] border border-[#dfe3ef] px-2.5 text-[13px] text-[#262b45] outline-none focus:border-[#4f6bed]"
            />
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => { onAdd(draft.trim().startsWith("#") ? draft.trim() : `#${draft.trim()}`); setDraft(""); }}
              className="flex h-9 items-center rounded-[7px] bg-[#4f6bed] px-3.5 text-[13px] font-medium text-white hover:bg-[#3a52c8] disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
        <div className="flex justify-end border-t border-[#eceef5] px-5 py-3.5">
          <button type="button" onClick={onClose} className="rounded-[7px] bg-[#4f6bed] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3a52c8]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
