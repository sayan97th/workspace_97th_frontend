"use client";
import React, { use, useEffect, useMemo, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { WorkspaceNavNode } from "@/types/workspace";
import { findNodeByPath } from "@/components/workspace-nav/helpers";
import { getViewComponent } from "@/components/workspace-nav/view-registry";

type PageParams = { workspace: string; path?: string[] };

/**
 * Dynamic entry point for every workspace navigation leaf.
 *
 * The URL `/w/{workspace}/{...slug path}` is resolved against the workspace's
 * navigation tree; the matched leaf's `view_key` selects a component from the
 * view registry (falling back to the generic view). This is how an unbounded,
 * data-driven tree maps to real, bookmarkable pages.
 */
export default function WorkspaceViewPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { workspace, path } = use(params);
  const slug_path = useMemo(() => path ?? [], [path]);

  const [tree, setTree] = useState<WorkspaceNavNode[] | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTree(null);
    setHasError(false);
    workspaceService
      .getNavigationTree(workspace)
      .then((data) => {
        if (!cancelled) setTree(data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  const node = useMemo(
    () => (tree ? findNodeByPath(tree, slug_path) : null),
    [tree, slug_path]
  );

  const breadcrumb = useMemo(() => {
    if (!tree) return [];
    return slug_path
      .map((_, index) => findNodeByPath(tree, slug_path.slice(0, index + 1))?.label ?? "")
      .filter(Boolean);
  }, [tree, slug_path]);

  if (has_error) {
    return (
      <CenteredMessage
        title="Something went wrong"
        detail="We couldn't load this workspace. Please try again."
      />
    );
  }

  if (!tree) {
    return (
      <div className="flex h-full items-center justify-center bg-shell-bg">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!node || node.type !== "leaf") {
    return (
      <CenteredMessage
        title="Nothing to show here"
        detail={
          slug_path.length === 0
            ? "Pick an item from the sidebar to open its view."
            : "This navigation item could not be found."
        }
      />
    );
  }

  const View = getViewComponent(node.view_key);

  return <View node={node} breadcrumb={breadcrumb} workspace_slug={workspace} />;
}

const CenteredMessage: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 bg-shell-bg px-6 text-center">
    <h2 className="text-lg font-semibold text-shell-text">{title}</h2>
    <p className="max-w-sm text-[13.5px] text-shell-text-muted">{detail}</p>
  </div>
);
