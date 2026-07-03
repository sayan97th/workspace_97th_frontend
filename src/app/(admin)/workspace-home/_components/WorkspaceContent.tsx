"use client";
import React, { useMemo, useState } from "react";
import { ContentTable, ContentToolbar } from "@/components/content";
import {
  WORKSPACE_CONTENT_ASSETS,
  WORKSPACE_CREATORS,
} from "../_data/workspace-content-data";

/**
 * The Workspace home "Content" tab: a searchable, spreadsheet-style table of
 * workspace assets. Composes the reusable content toolbar + table.
 */
const WorkspaceContent: React.FC = () => {
  const [search_value, setSearchValue] = useState("");

  const filtered_assets = useMemo(() => {
    const query = search_value.trim().toLowerCase();
    if (!query) return WORKSPACE_CONTENT_ASSETS;
    return WORKSPACE_CONTENT_ASSETS.filter((asset) =>
      asset.name.toLowerCase().includes(query)
    );
  }, [search_value]);

  return (
    <div className="mt-4 pb-[60px]">
      <ContentToolbar search_value={search_value} onSearchChange={setSearchValue} />

      <div className="mt-4">
        <ContentTable assets={filtered_assets} creators={WORKSPACE_CREATORS} />
      </div>

      <div className="mt-3 font-mono-accent text-[12.5px] tracking-[0.02em] text-gray-400">
        {filtered_assets.length} of {WORKSPACE_CONTENT_ASSETS.length} assets
      </div>
    </div>
  );
};

export default WorkspaceContent;
