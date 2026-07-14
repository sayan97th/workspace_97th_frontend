import React from "react";
import type { DrawerActivityEntry } from "./types";

export type ActivityLogPanelProps = {
  entries: DrawerActivityEntry[];
};

/** Vertical timeline of who-did-what-when for the open item. */
const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({ entries }) => {
  if (entries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-6 text-[13px] text-[#6e7b7d]">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-[22px] py-4">
      <div className="relative pl-[22px]">
        <span className="absolute bottom-1.5 left-[5px] top-1.5 w-0.5 bg-white/[0.08]" />
        {entries.map((entry) => (
          <div key={entry.id} className="relative py-2.5">
            <span
              className="absolute -left-[21px] top-[13px] h-[9px] w-[9px] rounded-full border-2 border-[#0e1c1b]"
              style={{ background: entry.accent_color }}
            />
            <div className="text-[13px] leading-relaxed text-[#d4dbdb]">
              <span className="font-bold text-[#edf1f1]">{entry.actor.name}</span> {entry.verb}
            </div>
            <div className="mt-0.5 text-[11.5px] text-[#6e7b7d]">{entry.occurred_at}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityLogPanel;
