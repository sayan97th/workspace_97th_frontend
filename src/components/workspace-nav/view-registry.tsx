"use client";
import React from "react";
import { WorkspaceManage } from "@/components/workspace-manage";
import TableBoardView, { type WorkspaceViewProps } from "./TableBoardView";

/**
 * Maps a navigation item's `view_key` (stored in the DB) to the React component
 * that renders it. Adding a real view later is a one-line entry here — the
 * backend just needs to store the matching `view_key` on the leaf.
 *
 * Anything without an entry falls back to {@link TableBoardView} — the
 * reusable, data-backed "table board" engine (tables/items/columns/filters/
 * views), so any newly-created board gets full real functionality for free.
 * Client Hub used to have its own entry here (`ClientHubBoard.tsx`); it's now
 * a fully generic board seeded by `ClientHubContentSeeder` and rendered
 * through this same fallback.
 */
export const VIEW_REGISTRY: Record<string, React.ComponentType<WorkspaceViewProps>> = {
  workspace_manage: WorkspaceManage,
};

/** Resolve the component for a view key, defaulting to the generic table board view. */
export const getViewComponent = (
  view_key: string | null | undefined
): React.ComponentType<WorkspaceViewProps> => {
  if (view_key && VIEW_REGISTRY[view_key]) return VIEW_REGISTRY[view_key];
  return TableBoardView;
};
