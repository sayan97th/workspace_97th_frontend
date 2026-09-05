"use client";

import { useEffect, useRef, useState } from "react";
import { GROUP_PALETTE } from "../constants";
import PopoverPanel from "./PopoverPanel";

interface GroupMenuProps {
  panel_style: React.CSSProperties;
  is_collapsed: boolean;
  is_first: boolean;
  is_last: boolean;
  current_color: string;
  is_priority: boolean;
  onExpandThis: () => void;
  onExpandAllGroups: () => void;
  onSelectAll: () => void;
  onExpandSubitems: () => void;
  onCollapseSubitems: () => void;
  onAddGroup: () => void;
  onDuplicate: (with_items: boolean) => void;
  onMove: (dir: "top" | "up" | "down" | "bottom") => void;
  onRename: () => void;
  onChangeColor: (color: string) => void;
  onTogglePriority: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onClose: () => void;
}

const ROW_ITEM = "flex h-[34px] items-center gap-2.5 rounded-[6px] px-2 text-[13px] text-boardtree-text hover:bg-boardtree-hover";

export default function GroupMenu({
  panel_style, is_collapsed, is_first, is_last, current_color, is_priority,
  onExpandThis, onExpandAllGroups, onSelectAll, onExpandSubitems, onCollapseSubitems, onAddGroup,
  onDuplicate, onMove, onRename, onChangeColor, onTogglePriority, onDelete, onArchive, onClose,
}: GroupMenuProps) {
  const [sub, setSub] = useState<"dup" | "move" | "color" | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setSub(null), 200);
  };

  const openSub = (key: "dup" | "move" | "color" | null) => {
    cancelClose();
    setSub(key);
  };

  useEffect(() => cancelClose, []);

  const moves: { key: "top" | "up" | "down" | "bottom"; label: string; disabled: boolean }[] = [
    { key: "top", label: "Move to top", disabled: is_first },
    { key: "up", label: "Move up", disabled: is_first },
    { key: "down", label: "Move down", disabled: is_last },
    { key: "bottom", label: "Move to bottom", disabled: is_last },
  ];

  return (
    <PopoverPanel onClose={onClose} className="w-[266px] p-1.5" style={panel_style}>
      <div className="flex flex-col" onMouseLeave={scheduleClose}>
        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onExpandThis(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M8 2.4 V13.6 M5.4 4.8 L8 2.2 L10.6 4.8 M5.4 11.2 L8 13.8 L10.6 11.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">{is_collapsed ? "Expand this group" : "Collapse this group"}</span>
        </button>

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onExpandAllGroups(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M8 3.4 V12.6 M5.6 5.6 L8 3.2 L10.4 5.6 M5.6 10.4 L8 12.8 L10.4 10.4 M2.4 8 H13.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">Expand all groups</span>
        </button>

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onSelectAll(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><rect x="2.6" y="2.6" width="10.8" height="10.8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M5.2 8.2 L7.2 10.2 L10.9 5.9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">Select all items in group</span>
        </button>

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onExpandSubitems(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M4 2.6 V8.6 a1.5 1.5 0 0 0 1.5 1.5 H9.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M8.6 8.2 L10.9 10.1 L8.6 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">Expand all subitems</span>
        </button>

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onCollapseSubitems(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M4 2.6 V8.6 a1.5 1.5 0 0 0 1.5 1.5 H9.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /><path d="M11.2 8.2 L8.9 10.1 L11.2 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">Collapse all subitems</span>
        </button>

        <div className="my-1.5 mx-1 h-px bg-boardtree-border-soft" />

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onAddGroup(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><circle cx="8" cy="8" r="5.4" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M8 5.4 V10.6 M5.4 8 H10.6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </span>
          <span className="flex-1 text-left">Add group</span>
        </button>

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onTogglePriority(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center" style={{ color: is_priority ? "#fdab3d" : "var(--color-boardtree-text-muted)" }}>
            <svg viewBox="0 0 16 16" width="15" height="15">
              <path
                d="M8 1.7 l1.8 3.9 4.3 .5 -3.2 2.9 .9 4.2 -3.8 -2.2 -3.8 2.2 .9 -4.2 -3.2 -2.9 4.3 -.5z"
                fill={is_priority ? "currentColor" : "none"}
                stroke={is_priority ? "none" : "currentColor"}
                strokeWidth={is_priority ? undefined : "1.2"}
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="flex-1 text-left">{is_priority ? "Unmark as priority client" : "Mark as priority client"}</span>
        </button>

        <div className="relative" onMouseEnter={() => openSub("dup")}>
          <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "dup" ? "var(--color-boardtree-hover)" : "transparent" }}>
            <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
              <svg viewBox="0 0 16 16" width="15" height="15"><rect x="5.4" y="2.4" width="8.2" height="8.2" rx="1.3" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M10.6 13.6 H3.8 a1.4 1.4 0 0 1 -1.4 -1.4 V5.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            </span>
            <span className="flex-1">Duplicate this group</span>
            <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
          </div>
          {sub === "dup" && (
            <div onMouseEnter={cancelClose} className="absolute left-[260px] top-[-6px] z-10 w-[226px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
              <button type="button" onClick={() => { onDuplicate(true); onClose(); }} className="flex h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover">Group with items</button>
              <button type="button" onClick={() => { onDuplicate(false); onClose(); }} className="flex h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover">Group without items</button>
            </div>
          )}
        </div>

        <div className="relative" onMouseEnter={() => openSub("move")}>
          <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "move" ? "var(--color-boardtree-hover)" : "transparent" }}>
            <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
              <svg viewBox="0 0 16 16" width="15" height="15"><path d="M2.8 8 H12.6 M9.6 5 L12.8 8 L9.6 11" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="flex-1">Move group</span>
            <span className="flex text-boardtree-text-faint"><svg viewBox="0 0 12 12" width="10" height="10"><path d="M4.5 3 L8 6 L4.5 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span>
          </div>
          {sub === "move" && (
            <div onMouseEnter={cancelClose} className="absolute left-[260px] top-[-6px] z-10 w-[200px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-1.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
              {moves.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  disabled={m.disabled}
                  onClick={() => { if (!m.disabled) { onMove(m.key); onClose(); } }}
                  className="flex h-8 w-full items-center rounded-[6px] px-2.5 text-left text-[13px] hover:bg-boardtree-hover disabled:cursor-default"
                  style={{ color: m.disabled ? "var(--color-boardtree-text-faint)" : "var(--color-boardtree-text)" }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="my-1.5 mx-1 h-px bg-boardtree-border-soft" />

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onRename(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M2.8 13.2 L3.4 10.6 L10.6 3.4 a1.5 1.5 0 0 1 2.1 2.1 L5.5 12.7 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">Rename group</span>
        </button>

        <div className="relative" onMouseEnter={() => openSub("color")}>
          <div className={`${ROW_ITEM} cursor-pointer`} style={{ background: sub === "color" ? "var(--color-boardtree-hover)" : "transparent" }}>
            <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
              <svg viewBox="0 0 16 16" width="15" height="15"><path d="M6.4 2.6 L12.6 8.8 a1 1 0 0 1 0 1.4 L9.8 13 a1 1 0 0 1 -1.4 0 L2.6 6.8 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>
            </span>
            <span className="flex-1">Change group color</span>
          </div>
          {sub === "color" && (
            <div onMouseEnter={cancelClose} className="absolute left-[260px] top-[-6px] z-10 w-[218px] rounded-[10px] border border-boardtree-border bg-boardtree-surface p-2.5 shadow-[0_16px_44px_rgba(30,34,55,0.22)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.55)]">
              <div className="grid max-h-[190px] grid-cols-6 gap-[7px] overflow-auto">
                {GROUP_PALETTE.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => { onChangeColor(color); onClose(); }}
                    className="h-6 rounded-[5px]"
                    style={{ background: color, boxShadow: color === current_color ? "0 0 0 2px var(--color-boardtree-ring)" : "none" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="my-1.5 mx-1 h-px bg-boardtree-border-soft" />

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onDelete(); onClose(); }} className="flex h-[34px] items-center gap-2.5 rounded-[6px] px-2 text-[13px] text-boardtree-danger hover:bg-boardtree-danger-hover">
          <span className="flex w-4 items-center justify-center opacity-80">
            <svg viewBox="0 0 16 16" width="15" height="15"><path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="flex-1 text-left">Delete group</span>
        </button>

        <button type="button" onMouseEnter={() => openSub(null)} onClick={() => { onArchive(); onClose(); }} className={ROW_ITEM}>
          <span className="flex w-4 items-center justify-center text-boardtree-text-muted">
            <svg viewBox="0 0 16 16" width="15" height="15"><rect x="2.6" y="3" width="10.8" height="3" rx="0.9" fill="none" stroke="currentColor" strokeWidth="1.3" /><path d="M3.6 6.4 V12.2 a0.9 0.9 0 0 0 0.9 0.9 H11.5 a0.9 0.9 0 0 0 0.9 -0.9 V6.4 M6.5 9 H9.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </span>
          <span className="flex-1 text-left">Archive group</span>
        </button>
      </div>
    </PopoverPanel>
  );
}
