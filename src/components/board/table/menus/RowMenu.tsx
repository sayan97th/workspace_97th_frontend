"use client";

import { useState } from "react";
import PopoverPanel from "./PopoverPanel";

export interface RowMenuTarget {
  id: string;
  label: string;
  current?: boolean;
}

interface RowMenuProps {
  is_sub: boolean;
  panel_style: React.CSSProperties;
  move_targets: RowMenuTarget[];
  convert_targets: RowMenuTarget[];
  copied: boolean;
  onOpen: () => void;
  onCopyLink: () => void;
  onCreateBelow: () => void;
  onAddSubitem: () => void;
  onDuplicate: (with_subs: boolean) => void;
  onMoveTo: (target_id: string) => void;
  onConvertToItem: () => void;
  onConvertToSubOf: (target_id: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ROW_ITEM = "flex h-[34px] items-center gap-2.5 rounded-[6px] px-2 text-[13px] text-boardtree-text hover:bg-boardtree-hover";

export default function RowMenu({
  is_sub, panel_style, move_targets, convert_targets, copied,
  onOpen, onCopyLink, onCreateBelow, onAddSubitem, onDuplicate, onMoveTo, onConvertToItem, onConvertToSubOf,
  onArchive, onDelete, onClose,
}: RowMenuProps) {
  const [sub, setSub] = useState<"move" | "dup" | "convert" | null>(null);

  return (
    <PopoverPanel onClose={onClose} className="w-[244px] p-1.5" style={panel_style}>
      <div className="flex flex-col" onMouseLeave={() => setSub(null)}>
        <button type="button" onMouseEnter={() => setSub(null)} onClick={() => { onOpen(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M9.4 3 H13 V6.6 M13 3 L8.6 7.4 M6.6 3.4 H3.4 a0.9 0.9 0 0 0 -0.9 0.9 V12.6 a0.9 0.9 0 0 0 0.9 0.9 H11.7 a0.9 0.9 0 0 0 0.9 -0.9 V9.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">{is_sub ? "Open subitem" : "Open item"}</span>
        </button>

        <div className="my-1.5 mx-1 h-px bg-boardtree-border-soft" />

        <button type="button" onMouseEnter={() => setSub(null)} onClick={() => { onCopyLink(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M6.6 9.4 L9.4 6.6 M6.9 4.6 L8.4 3.1 a2.6 2.6 0 0 1 3.7 3.7 L10.6 8.3 M5.4 7.7 L3.9 9.2 a2.6 2.6 0 0 0 3.7 3.7 L9.1 11.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </span>
          <span className="flex-1 text-left">{is_sub ? "Copy subitem link" : "Copy item link"}</span>
          {copied && <span className="text-[11.5px] text-boardtree-accent">copied</span>}
        </button>

        {move_targets.length > 0 && (
          <div className="relative" onMouseEnter={() => setSub("move")}>
            <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "move" ? "var(--color-boardtree-hover)" : "transparent" }}>
              <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
                <svg viewBox="0 0 16 16" width="15" height="15"><path d="M2.8 8 H12.6 M9.6 5 L12.8 8 L9.6 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="flex-1">{is_sub ? "Move to item" : "Move to group"}</span>
              <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
            </div>
            {sub === "move" && (
              <div className="absolute left-[238px] top-[-6px] z-10 w-[222px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
                {move_targets.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    disabled={t.current}
                    onClick={() => { if (!t.current) { onMoveTo(t.id); onClose(); } }}
                    className="flex h-8 w-full items-center gap-2.5 rounded-[6px] px-2.5 text-left text-[13px] hover:bg-boardtree-hover disabled:cursor-default"
                    style={{ color: t.current ? "var(--color-boardtree-text-muted)" : "var(--color-boardtree-text)" }}
                  >
                    <span className="flex-1 truncate">{t.label}</span>
                    {t.current && <span className="text-[12px] text-boardtree-accent">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative" onMouseEnter={() => setSub("dup")}>
          <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "dup" ? "var(--color-boardtree-hover)" : "transparent" }}>
            <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
              <svg viewBox="0 0 16 16" width="15" height="15"><rect x="5.4" y="2.4" width="8.2" height="8.2" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M10.6 13.6 H3.8 a1.4 1.4 0 0 1 -1.4 -1.4 V5.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            </span>
            <span className="flex-1">Duplicate</span>
            <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
          </div>
          {sub === "dup" && (
            <div className="absolute left-[238px] top-[-6px] z-10 w-[232px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
              <button type="button" onClick={() => { onDuplicate(false); onClose(); }} className="flex h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover">
                {is_sub ? "This subitem" : "This item without subitems"}
              </button>
              {!is_sub && (
                <button type="button" onClick={() => { onDuplicate(true); onClose(); }} className="flex h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover">
                  This item with subitems
                </button>
              )}
            </div>
          )}
        </div>

        <button type="button" onMouseEnter={() => setSub(null)} onClick={() => { onCreateBelow(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M8 3.2 V12.8 M3.2 8 H12.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </span>
          <span className="flex-1 text-left">{is_sub ? "Create new subitem below" : "Create new item below"}</span>
        </button>

        <div className="my-1.5 mx-1 h-px bg-boardtree-border-soft" />

        {!is_sub && (
          <button type="button" onMouseEnter={() => setSub(null)} onClick={() => { onAddSubitem(); onClose(); }} className={ROW_ITEM}>
            <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
              <svg viewBox="0 0 16 16" width="15" height="15"><path d="M4 2.8 V9 a1.6 1.6 0 0 0 1.6 1.6 H9.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><rect x="9.2" y="8.4" width="4.4" height="4.4" rx="1.1" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
            </span>
            <span className="flex-1 text-left">Add subitem</span>
          </button>
        )}

        <div className="relative" onMouseEnter={() => setSub("convert")}>
          <div
            className={`${ROW_ITEM} cursor-pointer`}
            style={{ background: sub === "convert" ? "var(--color-boardtree-hover)" : "transparent" }}
            onClick={() => { if (is_sub) { onConvertToItem(); onClose(); } }}
          >
            <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
              <svg viewBox="0 0 16 16" width="15" height="15"><path d="M4.2 2.8 V10.4 a1.4 1.4 0 0 0 1.4 1.4 H11.6 M9.4 9.4 L12 11.8 L9.4 14.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="flex-1">{is_sub ? "Convert to item" : "Convert to subitem"}</span>
            {!is_sub && convert_targets.length > 0 && (
              <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
            )}
          </div>
          {sub === "convert" && !is_sub && convert_targets.length > 0 && (
            <div className="absolute left-[238px] top-[-6px] z-10 max-h-[260px] w-[238px] overflow-y-auto rounded-[10px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
              <div className="px-2.5 pb-2 pt-1.5 text-[12px] text-boardtree-text-muted">Make it a subitem of</div>
              {convert_targets.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => { onConvertToSubOf(t.id); onClose(); }}
                  className="flex h-8 w-full items-center truncate rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover"
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="my-1.5 mx-1 h-px bg-boardtree-border-soft" />

        <button type="button" onMouseEnter={() => setSub(null)} onClick={() => { onArchive(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><rect x="2.6" y="3" width="10.8" height="3" rx="0.9" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M3.6 6.4 V12.2 a0.9 0.9 0 0 0 0.9 0.9 H11.5 a0.9 0.9 0 0 0 0.9 -0.9 V6.4 M6.5 9 H9.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </span>
          <span className="flex-1 text-left">Archive</span>
        </button>

        <button type="button" onMouseEnter={() => setSub(null)} onClick={() => { onDelete(); onClose(); }} className="flex h-[34px] items-center gap-2.5 rounded-[6px] px-2 text-[13px] text-boardtree-danger hover:bg-boardtree-danger-hover">
          <span className="flex w-4 items-center justify-center opacity-80">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">Delete</span>
        </button>
      </div>
    </PopoverPanel>
  );
}
