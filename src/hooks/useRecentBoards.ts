"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { personalService } from "@/services/personal.service";
import type { RecentBoardDto } from "@/types/personal";

/**
 * The boards the signed in user opened most recently, newest first. Reloads
 * whenever a board page is opened, since that is what records a new visit.
 * Pass `is_enabled = false` to skip fetching while the section is hidden.
 */
export default function useRecentBoards(is_enabled = true): { boards: RecentBoardDto[]; is_loading: boolean } {
  const pathname = usePathname() ?? "";
  const [boards, setBoards] = useState<RecentBoardDto[]>([]);
  const [is_loading, setIsLoading] = useState(true);

  const board_path = pathname.startsWith("/boards/") ? pathname.split("/").slice(0, 3).join("/") : null;

  const load = useCallback(async () => {
    try {
      setBoards(await personalService.getRecentBoards());
    } catch {
      // Recent boards are a convenience, the sidebar keeps working without them.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (is_enabled) void load();
  }, [is_enabled, load, board_path]);

  return { boards, is_loading };
}
