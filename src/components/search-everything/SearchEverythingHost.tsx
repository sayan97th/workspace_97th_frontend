"use client";

import { useEffect, useState } from "react";
import { onSearchEverythingOpen, type SearchEverythingRequest } from "@/layout/shell-events";
import SearchEverythingModal from "./SearchEverythingModal";

/**
 * Mounts the "Search Everything" dialog whenever `openSearchEverything()` is
 * called (top bar "See all results", a tag clicked in a Tags cell). Each open
 * remounts the dialog, so it always starts from the requested query and tab.
 */
export default function SearchEverythingHost() {
  const [request, setRequest] = useState<(SearchEverythingRequest & { key: number }) | null>(null);

  useEffect(() => onSearchEverythingOpen((next) => setRequest({ ...next, key: Date.now() })), []);

  if (!request) return null;

  return (
    <SearchEverythingModal
      key={request.key}
      initial_query={request.query}
      initial_tab={request.tab}
      onClose={() => setRequest(null)}
    />
  );
}
