"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ContentTable, ContentToolbar } from "@/components/content";
import type { ContentAsset, Creator } from "@/components/content";
import { workspaceService } from "@/services/workspace.service";
import type { BoardViewSummary } from "@/types/workspace";
import { formatShortDate, gradientForId, initialsFromName } from "./creatorAvatar";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

/** Every board view the current user can see, mapped to a `ContentAsset` row + its creator's avatar entry. */
const toAssetsAndCreators = (
  views: BoardViewSummary[]
): { assets: ContentAsset[]; creators: Record<string, Creator> } => {
  const creators: Record<string, Creator> = {};

  const assets = views.map((view): ContentAsset => {
    if (view.creator && !creators[String(view.creator.id)]) {
      const [gradient_from, gradient_to] = gradientForId(view.creator.id);
      creators[String(view.creator.id)] = {
        initials: initialsFromName(view.creator.full_name),
        name: view.creator.full_name,
        gradient_from,
        gradient_to,
      };
    }

    return {
      id: String(view.id),
      name: view.label,
      type: view.view_type === "doc" ? "doc" : "board",
      creator: view.creator ? String(view.creator.id) : "",
      created_date: formatShortDate(view.created_at),
      modified_date: formatShortDate(view.updated_at),
      folder: view.workspace?.name ?? "—",
      sub_folder: view.board?.label,
    };
  });

  return { assets, creators };
};

/**
 * Manage Workspace's "Content" tab: every board view created across every
 * workspace the current user belongs to, with its creator — a searchable,
 * spreadsheet-style table composing the reusable content toolbar + table.
 */
const WorkspaceManageContent: React.FC = () => {
  const [views, setViews] = useState<BoardViewSummary[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search_value, setSearchValue] = useState("");
  const [selected_ids, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    workspaceService
      .getAllBoardViews()
      .then((data) => {
        if (!cancelled) setViews(data);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load workspace content.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { assets, creators } = useMemo(() => toAssetsAndCreators(views), [views]);

  const filtered_assets = useMemo(() => {
    const query = search_value.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) => asset.name.toLowerCase().includes(query));
  }, [assets, search_value]);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = (select_all: boolean) => {
    setSelectedIds(() =>
      select_all ? new Set(filtered_assets.map((asset) => asset.id)) : new Set()
    );
  };

  if (is_loading) return <BoardLoadingSpinner />;
  if (error) return <CenteredMessage title="Something went wrong" detail={error} />;

  const selected_count = selected_ids.size;

  return (
    <div className="mt-4 pb-[60px]">
      <ContentToolbar search_value={search_value} onSearchChange={setSearchValue} />

      <div className="mt-4">
        <ContentTable
          assets={filtered_assets}
          creators={creators}
          selected_ids={selected_ids}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      </div>

      <div className="mt-3 font-mono-accent text-[12.5px] tracking-[0.02em] text-shell-text-muted">
        {selected_count > 0
          ? `${selected_count} selected`
          : `${filtered_assets.length} of ${assets.length} assets`}
      </div>
    </div>
  );
};

export default WorkspaceManageContent;
