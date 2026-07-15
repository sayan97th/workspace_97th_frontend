"use client";
import React from "react";
import { PersonAvatar } from "@/components/board";
import SearchField from "@/components/common/SearchField";
import type { AdministrationManagerApi } from "../useAdministrationManager";

export type SessionsSectionProps = {
  admin: AdministrationManagerApi;
};

/** Administration > Security > Sessions — every account user's currently active sign-ins. */
const SessionsSection: React.FC<SessionsSectionProps> = ({ admin }) => (
  <div>
    <div className="mb-4 flex items-start justify-between gap-5">
      <p className="max-w-[480px] text-[13px] leading-relaxed text-shell-text-muted">
        As an admin, you can view and control the sessions for every user on this account.
      </p>
      <button
        type="button"
        onClick={admin.logoutAllSessions}
        className="flex flex-none items-center gap-[7px] whitespace-nowrap rounded-[9px] bg-[#e2445c] px-4 py-[10px] text-[13px] font-bold text-white transition-colors hover:bg-[#c22d45]"
      >
        <svg width="13" height="13" viewBox="0 0 16 16">
          <path
            d="M6 2.5H4a1.5 1.5 0 0 0-1.5 1.5v8A1.5 1.5 0 0 0 4 13.5h2M10.5 5 13.5 8l-3 3M13.5 8h-8"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Log out all account users
      </button>
    </div>

    <SearchField
      value={admin.session_query}
      onChange={admin.setSessionQuery}
      placeholder="Search name"
      className="mb-4 w-[280px]"
    />

    <div className="grid grid-cols-[minmax(180px,1.2fr)_140px_minmax(120px,1fr)_120px_90px_80px_80px] gap-3 px-2.5 pb-2.5 text-[11px] font-bold uppercase tracking-[0.03em] text-shell-text-faint">
      <span>Active user</span>
      <span>Device</span>
      <span>Location</span>
      <span>IP Address</span>
      <span>Last usage</span>
      <span>Time</span>
      <span />
    </div>
    <div className="h-px bg-shell-hover" />

    {admin.session_rows.map((row) => {
      const user = admin.members.find((member) => member.id === row.user_id);
      return (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(180px,1.2fr)_140px_minmax(120px,1fr)_120px_90px_80px_80px] items-center gap-3 border-b border-shell-border px-2.5 py-[10px] text-[12.5px] text-shell-text-secondary"
        >
          <span className="flex min-w-0 items-center gap-[9px]">
            {user ? <PersonAvatar person={user} size={26} /> : null}
            <span className="truncate font-semibold text-shell-text">{user?.name ?? "Unknown"}</span>
          </span>
          <span className="text-shell-text-muted">{row.device}</span>
          <span className="truncate text-shell-text-muted">{row.location}</span>
          <span className="text-shell-text-muted">{row.ip}</span>
          <span className="text-shell-text-muted">{row.last_usage}</span>
          <span className="text-shell-text-muted">{row.duration}</span>
          <button
            type="button"
            onClick={() => admin.logoutSession(row.id)}
            className="rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 py-1.5 text-center text-[11.5px] font-semibold text-shell-text-secondary transition-colors hover:border-[#e2445c]/30 hover:bg-[#e2445c]/[0.14] hover:text-[#ff8a94]"
          >
            Log out
          </button>
        </div>
      );
    })}
  </div>
);

export default SessionsSection;
