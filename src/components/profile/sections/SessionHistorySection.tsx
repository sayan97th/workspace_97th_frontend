"use client";
import React from "react";
import type { ProfileManagerApi } from "../useProfileManager";

export type SessionHistorySectionProps = {
  profile: ProfileManagerApi;
};

const GRID_COLUMNS = "grid-cols-[1.35fr_1.5fr_1.15fr_105px_115px_84px]";

/** My Profile > Session history — every device currently (or recently) signed in. */
const SessionHistorySection: React.FC<SessionHistorySectionProps> = ({ profile }) => (
  <div>
    <div className="mb-1 text-[24px] font-extrabold tracking-[-0.01em] text-[#e9eded]">Session history</div>
    <p className="mb-[22px] text-[13.5px] text-[#9aa4a5]">{profile.session_rows.length} Sessions</p>

    <div className={`grid ${GRID_COLUMNS} gap-3 border-b border-white/[0.08] px-1 pb-[10px] text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#7e8889]`}>
      <span>Device</span>
      <span>Location</span>
      <span>IP</span>
      <span>Last usage</span>
      <span>Time</span>
      <span />
    </div>

    <div className="scrollnice max-h-[440px] overflow-y-auto">
      {profile.session_rows.map((row) => (
        <div
          key={row.id}
          className={`grid ${GRID_COLUMNS} items-center gap-3 border-b border-white/[0.045] px-1 py-[13px]`}
        >
          <span className="flex min-w-0 items-center gap-[9px] text-[13px] font-medium text-[#d7dcdc]">
            <svg width="14" height="14" viewBox="0 0 16 16" className="flex-none text-[#7e8889]">
              <rect x="2" y="2.5" width="12" height="8" rx="1.3" fill="none" stroke="currentColor" strokeWidth={1.3} />
              <path d="M5.5 13 h5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
            </svg>
            <span className="truncate">{row.device}</span>
            {row.is_current_device ? (
              <span className="flex-none rounded-md bg-[#6fcf97]/[0.14] px-[7px] py-[2px] text-[10.5px] font-bold text-[#6fcf97]">
                This device
              </span>
            ) : null}
          </span>
          <span className="truncate text-[13px] text-[#9aa4a5]">{row.location}</span>
          <span className="truncate text-[12.5px] text-[#8a9495]">{row.ip}</span>
          <span className="text-[12.5px] text-[#9aa4a5]">{row.last_usage}</span>
          <span className="text-[12.5px] text-[#9aa4a5]">{row.duration}</span>
          {row.can_logout ? (
            <button
              type="button"
              onClick={() => profile.logoutSession(row.id)}
              className="justify-self-end rounded-lg border border-white/[0.14] px-3 py-[6px] text-[11.5px] font-semibold text-[#d7dcdc] transition-colors hover:bg-white/[0.07]"
            >
              Log out
            </button>
          ) : null}
        </div>
      ))}
    </div>
  </div>
);

export default SessionHistorySection;
