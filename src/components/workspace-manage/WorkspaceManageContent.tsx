"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ContentTable, ContentToolbar, Pagination } from "@/components/content";
import type { ContentAsset, Creator } from "@/components/content";
import { workspaceService } from "@/services/workspace.service";
import { buildBoardPath } from "@/components/workspace-nav/helpers";
import type { WorkspaceContentItem, WorkspaceContentPageMeta } from "@/types/workspace";
import { formatShortDate, gradientForId, initialsFromName } from "./creatorAvatar";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";

const PER_PAGE = 30;

/** A page of board/doc leaves, mapped to `ContentAsset` rows + their creators' avatar entries. */
const toAssetsAndCreators = (
  items: WorkspaceContentItem[]
): { assets: ContentAsset[]; creators: Record<string, Creator> } => {
  const creators: Record<string, Creator> = {};

  const assets = items.map((item): ContentAsset => {
    if (item.creator && !creators[String(item.creator.id)]) {
      const [gradient_from, gradient_to] = gradientForId(item.creator.id);
      creators[String(item.creator.id)] = {
        initials: initialsFromName(item.creator.full_name),
        name: item.creator.full_name,
        gradient_from,
        gradient_to,
        photo_url: item.creator.profile_photo_url,
      };
    }

    return {
      id: String(item.id),
      name: item.label,
      type: "board",
      creator: item.creator ? String(item.creator.id) : "",
      created_date: formatShortDate(item.created_at),
      modified_date: formatShortDate(item.updated_at),
      folder: item.folder_path.map((crumb) => crumb.label).join(" / "),
      is_favorite: item.is_favorite,
    };
  });

  return { assets, creators };
};

/**
 * Manage Workspace's "Content" tab: every board/doc across every workspace
 * the current user belongs to — the same rows their sidebar renders, not a
 * board's internal views/tabs. Server-paginated (30 at a time) so a large
 * account never loads everything at once.
 */
const WorkspaceManageContent: React.FC = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<WorkspaceContentItem[]>([]);
  const [meta, setMeta] = useState<WorkspaceContentPageMeta | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search_value, setSearchValue] = useState("");
  const [selected_ids, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);
    workspaceService
      .getContentItems(page, PER_PAGE)
      .then(({ data, meta: page_meta }) => {
        if (cancelled) return;
        setItems(data);
        setMeta(page_meta);
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
  }, [page]);

  const { assets, creators } = useMemo(() => toAssetsAndCreators(items), [items]);

  // Search only narrows the current page — fetching every page just to
  // filter client-side would defeat the point of paginating in the first place.
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

  const openAsset = (id: string) => router.push(buildBoardPath(Number(id)));

  if (is_loading && items.length === 0) return <BoardLoadingSpinner />;
  if (error) return <CenteredMessage title="Something went wrong" detail={error} />;

  const selected_count = selected_ids.size;

  return (
    <div className="mt-4 pb-[60px]">
      <ContentToolbar
        search_value={search_value}
        onSearchChange={setSearchValue}
        search_placeholder="Search this page"
      />

      <div className="mt-4">
        <ContentTable
          assets={filtered_assets}
          creators={creators}
          selected_ids={selected_ids}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          onOpenAsset={openAsset}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="font-mono-accent text-[12.5px] tracking-[0.02em] text-shell-text-muted">
          {selected_count > 0 ? `${selected_count} selected` : `${filtered_assets.length} on this page`}
        </div>
      </div>

      {meta && (
        <Pagination
          current_page={meta.current_page}
          last_page={meta.last_page}
          total={meta.total}
          per_page={meta.per_page}
          onPageChange={setPage}
        />
      )}
    </div>
  );
};

export default WorkspaceManageContent;
