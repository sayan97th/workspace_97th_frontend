"use client";
import React, { useMemo, useState } from "react";
import { ContentTable, ContentToolbar } from "@/components/content";
import {
  WORKSPACE_CONTENT_ASSETS,
  WORKSPACE_CREATORS,
} from "@/data/workspace-content-data";

/**
 * The Workspace home "Content" tab: a searchable, spreadsheet-style table of
 * workspace assets. Composes the reusable content toolbar + table.
 */
const WorkspaceContent: React.FC = () => {
  const [search_value, setSearchValue] = useState("");
  const [selected_ids, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered_assets = useMemo(() => {
    const query = search_value.trim().toLowerCase();
    if (!query) return WORKSPACE_CONTENT_ASSETS;
    return WORKSPACE_CONTENT_ASSETS.filter((asset) =>
      asset.name.toLowerCase().includes(query)
    );
  }, [search_value]);

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

  const selected_count = selected_ids.size;

  return (
    <div className="mt-4 pb-[60px]">
      <ContentToolbar search_value={search_value} onSearchChange={setSearchValue} />

      <div className="mt-4">
        <ContentTable
          assets={filtered_assets}
          creators={WORKSPACE_CREATORS}
          selected_ids={selected_ids}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      </div>

      <div className="mt-3 font-mono-accent text-[12.5px] tracking-[0.02em] text-shell-text-muted">
        {selected_count > 0
          ? `${selected_count} selected`
          : `${filtered_assets.length} of ${WORKSPACE_CONTENT_ASSETS.length} assets`}
      </div>
    </div>
  );
};

export default WorkspaceContent;
