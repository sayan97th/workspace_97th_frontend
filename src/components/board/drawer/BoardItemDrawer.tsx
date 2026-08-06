"use client";
import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import { ActivityLogTabIcon, FilesTabIcon, InfoBoxesTabIcon, UpdatesTabIcon } from "@/icons/drawer-icons";
import ActivityLogPanel from "./ActivityLogPanel";
import FilesPanel from "./FilesPanel";
import InfoBoxesPanel from "./InfoBoxesPanel";
import UpdatesPanel from "./UpdatesPanel";
import type { BoardItemDrawerApi, DrawerTabId } from "./types";

export type BoardItemDrawerProps<TRow> = {
  drawer: BoardItemDrawerApi<TRow>;
};

type TabDefinition = {
  id: DrawerTabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

/**
 * Slide-in item detail drawer: header + tab bar (Updates/Files/Activity Log/Info
 * Boxes) driven entirely by {@link useBoardItemDrawer}. Generic over the row type
 * so any board view — Client Hub today, others later — can reuse it as-is.
 */
function BoardItemDrawer<TRow>({ drawer }: BoardItemDrawerProps<TRow>) {
  if (!drawer.is_open) return null;

  const tabs: TabDefinition[] = [
    { id: "updates", label: "Updates", icon: <UpdatesTabIcon size={15} />, count: drawer.comments.length },
    { id: "files", label: "Files", icon: <FilesTabIcon size={15} /> },
    { id: "activity", label: "Activity Log", icon: <ActivityLogTabIcon size={15} /> },
    { id: "info_boxes", label: "Info Boxes", icon: <InfoBoxesTabIcon size={15} /> },
  ];

  return (
    <>
      <div onClick={drawer.close} className="fixed inset-0 z-[400] bg-[rgba(4,12,12,0.42)]" />
      <div className="fixed bottom-0 right-0 top-0 z-[401] flex w-[640px] max-w-[94vw] flex-col border-l border-shell-border-strong bg-shell-panel text-shell-text shadow-[-24px_0_60px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="flex flex-none items-start gap-3 border-b border-shell-border px-[22px] pb-4 pt-5">
          <span className="w-[5px] flex-none self-stretch rounded-[3px]" style={{ background: drawer.accent_color }} />
          <div className="min-w-0 flex-1">
            <div className="mb-[5px] flex items-center gap-[9px] text-[11.5px] font-semibold text-shell-text-faint">
              <svg width="13" height="13" viewBox="0 0 16 16" style={{ color: drawer.accent_color }}>
                <rect x="2.5" y="2.5" width="11" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
                <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <span>{drawer.eyebrow_label}</span>
            </div>
            <h2 className="m-0 text-[22px] font-extrabold leading-[1.2] tracking-[-0.01em]" style={{ textWrap: "pretty" }}>
              {drawer.open_row_title}
            </h2>
          </div>
          <button
            type="button"
            onClick={drawer.close}
            aria-label="Close item drawer"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Details strip (Status/Priority/Due date/People, …) + Description — always
            visible above the tabs, mirroring how the title stays fixed regardless of
            which tab is active. Omitted entirely for a board that supplies neither. */}
        {(drawer.detail_fields.length > 0 || drawer.has_description) && (
          <div className="flex flex-none flex-col gap-4 border-b border-shell-border px-[22px] py-4">
            {drawer.detail_fields.length > 0 && (
              <div className="flex flex-col gap-2.5">
                {drawer.detail_fields.map((field) => (
                  <div key={field.id} className="grid grid-cols-[110px_1fr] items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-shell-text-faint">{field.label}</span>
                    <div className="min-w-0">{field.content}</div>
                  </div>
                ))}
              </div>
            )}
            {drawer.has_description && (
              <div>
                <div className="mb-1.5 text-[12.5px] font-semibold text-shell-text-faint">Description</div>
                <textarea
                  value={drawer.description}
                  onChange={(event) => drawer.onDescriptionChange(event.target.value)}
                  placeholder="Add a more detailed description…"
                  rows={3}
                  className="w-full resize-y rounded-lg border border-shell-border bg-shell-bg px-2.5 py-2 text-[13px] leading-relaxed text-shell-text outline-none focus:border-brand-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-none items-center gap-0.5 border-b border-shell-border px-[18px]">
          {tabs.map((tab) => {
            const is_active = drawer.active_tab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => drawer.setActiveTab(tab.id)}
                className={`relative flex items-center gap-[7px] px-[13px] py-3 text-[13.5px] font-semibold ${
                  is_active ? "text-shell-text" : "text-shell-text-muted"
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className="rounded-[20px] bg-shell-hover-strong px-[7px] py-px text-[11px] font-bold text-shell-text-secondary">
                    {tab.count}
                  </span>
                )}
                {is_active && (
                  <span
                    className="absolute bottom-[-1px] left-2 right-2 h-[3px] rounded-t-[3px]"
                    style={{ background: drawer.accent_color }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Active tab body */}
        {drawer.active_tab === "updates" && <UpdatesPanel drawer={drawer} />}
        {drawer.active_tab === "files" && (
          <FilesPanel item_title={drawer.open_row_title} attachments={drawer.all_attachments} />
        )}
        {drawer.active_tab === "activity" && <ActivityLogPanel entries={drawer.activity_log} />}
        {drawer.active_tab === "info_boxes" && <InfoBoxesPanel info_boxes={drawer.info_boxes} />}
      </div>
    </>
  );
}

export default BoardItemDrawer;
