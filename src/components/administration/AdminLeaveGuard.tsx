"use client";
import { createContext, useContext, useEffect } from "react";

/** Registers, or clears with `null`, the question asked before the Administration view leaves the active section. */
export type SetAdminLeaveGuard = (message: string | null) => void;

export const AdminLeaveGuardContext = createContext<SetAdminLeaveGuard | null>(null);

/**
 * Asks `message` before the Administration view switches to another rail page or goes back to
 * the workspace while `is_active` is true, for example while a section has unsaved edits.
 * Closing or reloading the tab is not covered here, sections add their own `beforeunload`.
 * Does nothing outside the Administration view.
 */
export const useAdminLeaveGuard = (is_active: boolean, message: string): void => {
  const setLeaveGuard = useContext(AdminLeaveGuardContext);

  useEffect(() => {
    if (!setLeaveGuard || !is_active) return;
    setLeaveGuard(message);
    return () => setLeaveGuard(null);
  }, [setLeaveGuard, is_active, message]);
};
