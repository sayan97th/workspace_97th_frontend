"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/context/ThemeContext";
import { boardChartService } from "@/services/board-chart.service";
import { boardContentService } from "@/services/board-content.service";
import { buildChartApexOptions, buildChartApexSeries } from "./chartApex";
import type { BoardChartConfig, ChartDataDto } from "./types";

export type BoardChartConfigInput = {
  board_id: number;
  view_id: number;
};

export type BoardChartApi = {
  is_loading: boolean;
  is_saving: boolean;
  error: string | null;
  data: ChartDataDto | null;
  /** Applies a config change immediately: optimistic locally, persisted via `saveView`, then re-fetches the recomputed chart. */
  updateConfig: (partial: Partial<BoardChartConfig>) => void;
  apex_options: ApexOptions;
  apex_series: ApexOptions["series"];
};

/**
 * Owns a Chart tab's data (fetch + config edits) — self-contained so
 * `BoardChartView` only has to render, mirroring how `useBoardFileGallery`
 * separates a Files Gallery tab's state from its own view component. Every
 * config change (chart type/group by/split by/measure/data source) persists
 * immediately via `boardContentService.saveView`, matching Kanban/Calendar's
 * instant-write model rather than Table's toolbar-draft-then-save model —
 * there's no "Save changes" banner for a chart tab.
 */
const useBoardChart = ({ board_id, view_id }: BoardChartConfigInput): BoardChartApi => {
  const { resolved_theme } = useTheme();
  const is_dark = resolved_theme === "dark";

  const [data, setData] = useState<ChartDataDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    boardChartService
      .getChartData(board_id, view_id)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load this chart. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [board_id, view_id]);

  /** User-triggered re-fetch after a config save — no cancellation guard needed, unlike the mount effect: it isn't racing a `view_id` change. */
  const refetch = useCallback(async (): Promise<void> => {
    try {
      const result = await boardChartService.getChartData(board_id, view_id);
      setData(result);
      setError(null);
    } catch {
      setError("Couldn't save that change. Please try again.");
    }
  }, [board_id, view_id]);

  const updateConfig = useCallback(
    (partial: Partial<BoardChartConfig>) => {
      setData((current) => {
        if (!current) return current;
        const next_config: BoardChartConfig = { ...current.config, ...partial };
        setIsSaving(true);
        void boardContentService
          .saveView(board_id, view_id, { chart_config: next_config })
          .then(() => refetch())
          .catch(() => setError("Couldn't save that change. Please try again."))
          .finally(() => setIsSaving(false));
        // Optimistic: reflect the picked option immediately while the recompute round-trips.
        return { ...current, config: next_config };
      });
    },
    [board_id, view_id, refetch]
  );

  const apex_options: ApexOptions = useMemo(() => (data ? buildChartApexOptions(data, is_dark) : {}), [data, is_dark]);

  const apex_series: ApexOptions["series"] = useMemo(() => (data ? buildChartApexSeries(data) : []), [data]);

  return { is_loading, is_saving, error, data, updateConfig, apex_options, apex_series };
};

export default useBoardChart;
