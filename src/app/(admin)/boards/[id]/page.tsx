"use client";
import React, { use, useEffect, useMemo, useState } from "react";
import { workspaceService } from "@/services/workspace.service";
import type { BoardDetail } from "@/types/workspace";
import { getViewComponent } from "@/components/workspace-nav/view-registry";

type PageParams = { id: string };

/**
 * Id-routed entry point for every board (workspace navigation leaf).
 *
 * The URL `/boards/{id}` resolves directly against the item's globally-unique
 * database id via `GET /api/boards/{id}` — no workspace slug or slug path
 * needed. The response carries the owning workspace and the ancestor
 * breadcrumb, so this page never has to hold or walk the full navigation
 * tree just to render one leaf. The matched item's `view_key` selects a
 * component from the view registry (falling back to the generic view).
 */
export default function BoardPage({ params }: { params: Promise<PageParams> }) {
  const { id } = use(params);
  const item_id = useMemo(() => Number(id), [id]);

  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [has_error, setHasError] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(item_id)) {
      setHasError(true);
      return;
    }

    let cancelled = false;
    setBoard(null);
    setHasError(false);
    workspaceService
      .getBoard(item_id)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item_id]);

  const breadcrumb = useMemo(
    () => (board ? [...board.breadcrumb.map((ancestor) => ancestor.label), board.label] : []),
    [board]
  );

  if (has_error) {
    return (
      <CenteredMessage
        title="Something went wrong"
        detail="We couldn't load this board. Please try again."
      />
    );
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center bg-shell-bg">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (board.type !== "leaf") {
    return (
      <CenteredMessage
        title="Nothing to show here"
        detail="This navigation item doesn't have a view of its own."
      />
    );
  }

  const View = getViewComponent(board.view_key);

  return <View key={board.id} node={board} breadcrumb={breadcrumb} workspace_slug={board.workspace.slug} />;
}

const CenteredMessage: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 bg-shell-bg px-6 text-center">
    <h2 className="text-lg font-semibold text-shell-text">{title}</h2>
    <p className="max-w-sm text-[13.5px] text-shell-text-muted">{detail}</p>
  </div>
);
