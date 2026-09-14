"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { impersonationService, type ImpersonationMeta } from "@/services/admin/impersonation.service";
import { EyeIcon } from "@/icons/workspace-icons";

const formatRemaining = (ms: number): string => {
  const total_seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total_seconds / 60);
  const seconds = total_seconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Persistent bar shown for the full duration of an admin's impersonation session, mounted
 * above the sidebar/content row in `(admin)/layout.tsx` so "who am I really" is never
 * ambiguous while browsing as someone else. Self-heals against stale localStorage state (e.g.
 * a previous tab's session that never closed cleanly) by cross-checking the stored target id
 * against the currently signed-in user, and auto-stops a moment before the impersonation token
 * actually expires so the admin is never abruptly signed out mid-action.
 */
const ImpersonationBanner: React.FC = () => {
  const { user } = useAuth();
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null);
  const [remaining_ms, setRemainingMs] = useState(0);
  const [is_stopping, setIsStopping] = useState(false);

  useEffect(() => {
    const stored = impersonationService.getMeta();
    if (stored && user && stored.target_id === user.id) {
      setMeta(stored);
    } else {
      if (stored) impersonationService.clear();
      setMeta(null);
    }
  }, [user]);

  const stopImpersonation = useCallback(async () => {
    setIsStopping(true);
    await impersonationService.stop();
    window.location.href = "/users";
  }, []);

  useEffect(() => {
    if (!meta) return;

    const tick = () => {
      const left = meta.expires_at - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        stopImpersonation();
      }
    };

    tick();
    const interval_id = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval_id);
  }, [meta, stopImpersonation]);

  if (!meta) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-warning-500/30 bg-warning-500/[0.14] px-4 py-2 text-center text-[12.5px] font-medium text-warning-600">
      <span className="flex items-center gap-1.5">
        <EyeIcon size={14} />
        Impersonating <strong className="font-semibold">{meta.target_full_name}</strong>
        <span className="text-warning-600/70">as {meta.admin_full_name}</span>
      </span>
      <span className="text-warning-600/70">Ends in {formatRemaining(remaining_ms)}</span>
      <button
        type="button"
        onClick={stopImpersonation}
        disabled={is_stopping}
        className="rounded-md border border-warning-500/40 bg-white/50 px-2.5 py-1 text-[12px] font-semibold text-warning-600 transition-colors hover:bg-white/80 disabled:cursor-default disabled:opacity-60"
      >
        {is_stopping ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
};

export default ImpersonationBanner;
