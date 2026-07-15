"use client";
import React from "react";
import ClientHubBoard from "@/app/(admin)/client-hub/_components/ClientHubBoard";
import WorkspaceHome from "@/app/(admin)/workspace-home/_components/WorkspaceHome";
import GenericBoardView, { type WorkspaceViewProps } from "./GenericBoardView";

/**
 * Maps a navigation item's `view_key` (stored in the DB) to the React component
 * that renders it. Adding a real view later is a one-line entry here — the
 * backend just needs to store the matching `view_key` on the leaf.
 *
 * Anything without an entry falls back to {@link GenericBoardView}.
 */
export const VIEW_REGISTRY: Record<string, React.ComponentType<WorkspaceViewProps>> = {
  client_hub: () => <ClientHubBoard />,
  workspace_home: () => <WorkspaceHome />,
};

/** Resolve the component for a view key, defaulting to the generic view. */
export const getViewComponent = (
  view_key: string | null | undefined
): React.ComponentType<WorkspaceViewProps> => {
  if (view_key && VIEW_REGISTRY[view_key]) return VIEW_REGISTRY[view_key];
  return GenericBoardView;
};
