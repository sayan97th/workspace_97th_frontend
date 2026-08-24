"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "@/context/ThemeContext";
import { boardChartService } from "@/services/board-chart.service";
import { boardContentService } from "@/services/board-content.service";
import { CHART_BAR_RADIUS, CHART_COLORS, getSeriesColor } from "./chartDesign";
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

const isPieLike = (chart_type: BoardChartConfig["chart_type"] | undefined): boolean =>
  chart_type === "pie" || chart_type === "donut";

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

  const apex_options: ApexOptions = useMemo(() => {
    if (!data) return {};
    const is_pie = isPieLike(data.config.chart_type);
    const is_bar_like = data.config.chart_type === "bar" || data.config.chart_type === "stacked_bar";
    const categories = data.categories.map((category) => category.label);
    // Prefer each category's/series' own real color (a status/tag's configured color, a
    // group's accent color) — identity should follow the entity, not an arbitrary slot.
    // Only fall back to the validated categorical palette where the backend has none to
    // give (people/date dimensions carry no inherent color of their own).
    const category_colors = data.categories.map((category, index) => category.color ?? getSeriesColor(index, is_dark));
    // A single un-split series has no per-series color of its own — color each bar/slice by
    // its category instead ("distributed" bars below); a split-by chart colors by series.
    const is_single_series = data.series.length <= 1;
    const use_distributed_bars = is_bar_like && is_single_series && categories.length > 1;
    const series_colors =
      is_pie || use_distributed_bars
        ? category_colors
        : data.series.map((series, index) => series.color ?? getSeriesColor(index, is_dark));

    return {
      chart: {
        type: data.config.chart_type === "stacked_bar" ? "bar" : data.config.chart_type,
        stacked: data.config.chart_type === "stacked_bar",
        toolbar: { show: false },
        fontFamily: "inherit",
        foreColor: CHART_COLORS.axis_text,
        background: "transparent",
        animations: { speed: 250 },
      },
      theme: { mode: is_dark ? "dark" : "light" },
      colors: series_colors,
      // ApexCharts' internal default-config merge treats an explicit `undefined`
      // value as "present", overriding its own defaults (e.g. `config.markers.size`
      // crashes if `markers` is explicitly `undefined` instead of just absent) — so
      // pie/non-line-only options are left out of the object entirely via spread,
      // never assigned `undefined`.
      ...(is_pie
        ? { labels: categories }
        : {
            xaxis: {
              categories,
              labels: { style: { colors: CHART_COLORS.axis_text, fontSize: "12px" } },
              axisBorder: { color: CHART_COLORS.grid },
              axisTicks: { color: CHART_COLORS.grid },
            },
            yaxis: {
              labels: {
                style: { colors: CHART_COLORS.axis_text, fontSize: "12px" },
                formatter: (value: number) => value.toLocaleString(),
              },
            },
          }),
      grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 0, yaxis: { lines: { show: !is_pie } } },
      // A legend is always present for two-or-more series/slices — the dependable
      // identity channel, never color-matching alone (dataviz skill, marks-and-anatomy).
      legend: {
        show: is_pie ? categories.length > 1 : data.series.length > 1,
        position: "bottom",
        fontSize: "12.5px",
        labels: { colors: CHART_COLORS.axis_text },
        markers: { size: 6 },
      },
      dataLabels: {
        // Pie/donut slices are few and unlabeled-by-default reads as empty — label them.
        // Bar/line categories can run long, so "never a number on every point": let the
        // (always-on) tooltip carry per-value precision instead.
        enabled: is_pie,
        formatter: (value: number) => `${value.toFixed(1)}%`,
        style: { fontSize: "11.5px", fontWeight: 600 },
      },
      stroke: {
        curve: "smooth",
        width: data.config.chart_type === "line" ? 2 : 0,
      },
      plotOptions: {
        bar: {
          columnWidth: "45%",
          borderRadius: CHART_BAR_RADIUS,
          borderRadiusApplication: "end",
          distributed: use_distributed_bars,
        },
        pie: {
          donut: { size: data.config.chart_type === "donut" ? "62%" : "0%" },
        },
      },
      ...(data.config.chart_type === "line"
        ? { markers: { size: 4, strokeWidth: 2, strokeColors: CHART_COLORS.surface, hover: { size: 6 } } }
        : {}),
      tooltip: {
        theme: is_dark ? "dark" : "light",
        y: { formatter: (value: number) => value.toLocaleString() },
      },
      noData: { text: "No data to chart yet." },
    };
  }, [data, is_dark]);

  const apex_series: ApexOptions["series"] = useMemo(() => {
    if (!data) return [];
    if (isPieLike(data.config.chart_type)) {
      // Pie/donut plot a single ring — the (only) series' values, one slice per category.
      return data.series[0]?.data ?? [];
    }
    return data.series.map((series) => ({ name: series.name, data: series.data }));
  }, [data]);

  return { is_loading, is_saving, error, data, updateConfig, apex_options, apex_series };
};

export default useBoardChart;
