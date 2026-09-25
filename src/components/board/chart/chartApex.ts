import type { ApexOptions } from "apexcharts";
import { CHART_BAR_RADIUS, CHART_COLORS, getSeriesColor } from "./chartDesign";
import type { BoardChartConfig, ChartDataDto } from "./types";

/**
 * ApexCharts options and series for a computed chart, shared by the Chart
 * tab (`useBoardChart`) and the Dashboard's chart widget so both draw the
 * same marks, colors, legend and tooltip rules.
 */

export const isPieLike = (chart_type: BoardChartConfig["chart_type"] | undefined): boolean =>
  chart_type === "pie" || chart_type === "donut";

export const buildChartApexOptions = (data: ChartDataDto, is_dark: boolean): ApexOptions => {
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
};

export const buildChartApexSeries = (data: ChartDataDto): ApexOptions["series"] => {
  if (isPieLike(data.config.chart_type)) {
    // Pie/donut plot a single ring — the (only) series' values, one slice per category.
    return data.series[0]?.data ?? [];
  }
  return data.series.map((series) => ({ name: series.name, data: series.data }));
};
