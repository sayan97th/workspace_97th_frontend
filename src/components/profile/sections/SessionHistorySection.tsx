"use client";
import React from "react";
import { LogOut, Monitor, Smartphone, Tablet } from "lucide-react";
import ProfileTooltip from "../ProfileTooltip";
import type { ProfileSessionRow } from "../types";
import type { ProfileManagerApi } from "../useProfileManager";

export type SessionHistorySectionProps = {
  profile: ProfileManagerApi;
};

const GRID_COLUMNS = "grid-cols-[minmax(160px,1.6fr)_minmax(96px,1fr)_104px_minmax(112px,1fr)_92px]";

/** Picks a device glyph from the user agent summary the API sends, e.g. "Chrome on iPhone". */
const deviceIconFor = (row: ProfileSessionRow) => {
  const device = row.device.toLowerCase();
  if (/ipad|tablet/.test(device)) return Tablet;
  if (/iphone|android|mobile|phone/.test(device)) return Smartphone;
  return Monitor;
};

/** My Profile > Session history, every device currently (or recently) signed in. */
const SessionHistorySection: React.FC<SessionHistorySectionProps> = ({ profile }) => {
  if (profile.is_loading_sessions) {
    return (
      <div className="flex items-center justify-center py-16" role="status" aria-label="Loading sessions">
        <span className="profile-spinner" />
      </div>
    );
  }

  const session_count = profile.session_rows.length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="profile-pill">
          {session_count} {session_count === 1 ? "session" : "sessions"}
        </span>
      </div>

      <div className="profile-table">
        <div className="profile-table-scroll">
          <div className={`profile-table-grid profile-table-head ${GRID_COLUMNS}`}>
            <span>Device</span>
            <span>IP address</span>
            <span>Last active</span>
            <span>Duration</span>
            <span className="sr-only">Actions</span>
          </div>

          {session_count === 0 ? (
            <div className="profile-table-empty">No sessions to show.</div>
          ) : (
            <div className="shell-scrollbar max-h-[480px] overflow-y-auto">
              {profile.session_rows.map((row) => {
                const DeviceIcon = deviceIconFor(row);
                return (
                  <div key={row.id} className={`profile-table-grid profile-table-row ${GRID_COLUMNS}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="profile-device-icon">
                        <DeviceIcon size={16} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{row.device}</span>
                        {row.is_current_device ? (
                          <span className="profile-pill profile-pill-success mt-1 h-5 px-2 text-[11px]">This device</span>
                        ) : null}
                      </span>
                    </span>
                    <span className="profile-table-muted truncate">{row.ip ?? "Unknown"}</span>
                    <span className="profile-table-muted">{row.last_usage}</span>
                    <span className="profile-table-muted">{row.duration}</span>
                    <span className="flex justify-end">
                      {row.can_logout ? (
                        <ProfileTooltip content="Sign this device out of your account">
                          <button
                            type="button"
                            onClick={() => void profile.logoutSession(row.id)}
                            className="profile-button profile-button-secondary h-8 px-2.5 text-[13px]"
                          >
                            <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
                            Log out
                          </button>
                        </ProfileTooltip>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionHistorySection;
