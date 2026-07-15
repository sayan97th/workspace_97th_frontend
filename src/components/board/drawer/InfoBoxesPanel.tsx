import React from "react";
import type { DrawerInfoBox } from "./types";

export type InfoBoxesPanelProps = {
  info_boxes: DrawerInfoBox[];
};

/** Read-only key/value summary cards (contract terms, key dates, products, ...) for the open item. */
const InfoBoxesPanel: React.FC<InfoBoxesPanelProps> = ({ info_boxes }) => {
  if (info_boxes.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-6 text-[13px] text-shell-text-faint">
        No info boxes yet.
      </div>
    );
  }

  return (
    <div className="shell-scrollbar flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto px-5 py-4.5">
      {info_boxes.map((box) => (
        <div key={box.id} className="rounded-[13px] border border-shell-border bg-shell-panel-alt px-4 py-[15px]">
          <div className="mb-2.5 flex items-center gap-2 text-[11.5px] font-bold tracking-[0.04em] text-shell-text-faint">
            <span className="h-[7px] w-[7px] rounded-sm" style={{ background: box.accent_color }} />
            {box.label}
          </div>
          {box.rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3 py-1.5 text-[13px]">
              <span className="w-[120px] flex-none text-shell-text-muted">{row.label}</span>
              <span className="flex-1 font-medium text-shell-text">{row.value}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default InfoBoxesPanel;
