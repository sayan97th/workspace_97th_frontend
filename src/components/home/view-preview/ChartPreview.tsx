import React, { useId } from "react";
import type { RecentBoardChartPreview, RecentBoardPreview } from "@/types/personal";
import { compactNumber, conicSlices, cssVars, paletteColor, percent } from "./previewHelpers";

type Point = { label: string; color: string; value: number };

/** Drawn, faded, for a chart with nothing to count yet. */
const SAMPLE_VALUES = [4, 7, 5, 9, 6];

const pointsOf = (chart: RecentBoardChartPreview | undefined): { points: Point[]; is_sample: boolean } => {
  if (chart?.points.length) {
    return { points: chart.points.map((point, index) => ({ ...point, color: paletteColor(point.color, index) })), is_sample: false };
  }
  return { points: SAMPLE_VALUES.map((value, index) => ({ label: "", value, color: paletteColor(null, index) })), is_sample: true };
};

/** Bars (or stacked bars) on a light grid, with each category's real label below. */
const BarChart: React.FC<{ points: Point[]; chart?: RecentBoardChartPreview; is_stacked: boolean }> = ({ points, chart, is_stacked }) => {
  const max = Math.max(1, ...points.map((point) => point.value));
  const series = chart?.series ?? [];

  return (
    <div className="vp-chart__bars">
      {points.map((point, index) => (
        <span key={index} className="vp-chart__column">
          <span className="vp-chart__bar" style={{ height: percent(point.value / max), background: is_stacked ? undefined : point.color }}>
            {is_stacked &&
              series.map((one, series_index) => (
                <i
                  key={series_index}
                  style={{
                    flexGrow: one.values[index] ?? 0,
                    background: paletteColor(one.color, series_index),
                  }}
                />
              ))}
          </span>
          {point.label && <span className="vp-chart__label">{point.label}</span>}
        </span>
      ))}
    </div>
  );
};

/** A smooth line with a soft area under it and a dot on every point. */
const LineChart: React.FC<{ points: Point[] }> = ({ points }) => {
  const max = Math.max(1, ...points.map((point) => point.value));
  const coordinates = points.map((point, index) => ({
    x: points.length === 1 ? 50 : (index / (points.length - 1)) * 100,
    y: 46 - (point.value / max) * 40,
  }));
  const gradient_id = `vp-line-${useId().replace(/:/g, "")}`;
  const line = coordinates.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  return (
    <div className="vp-chart__line">
      <svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradient_id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--vp-chart-line)", stopOpacity: 0.28 }} />
            <stop offset="100%" style={{ stopColor: "var(--vp-chart-line)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={`${line} L100,50 L0,50 Z`} fill={`url(#${gradient_id})`} />
        <path d={line} className="vp-chart__stroke" vectorEffect="non-scaling-stroke" />
      </svg>
      {coordinates.map(({ x, y }, index) => (
        <i key={index} className="vp-chart__dot" style={{ left: `${x}%`, top: `${(y / 50) * 100}%` }} />
      ))}
    </div>
  );
};

/** A pie or donut of the real slices, with the total in the hole and a short legend. */
const PieChart: React.FC<{ points: Point[]; is_donut: boolean; is_sample: boolean }> = ({ points, is_donut, is_sample }) => {
  const total = points.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="vp-chart__pie-wrap">
      <span className="vp-chart__pie" data-donut={is_donut} style={{ background: conicSlices(points) }}>
        {is_donut && <b>{is_sample ? "" : compactNumber(total)}</b>}
      </span>
      {!is_sample && (
        <span className="vp-chart__legend">
          {points.slice(0, 4).map((point, index) => (
            <span key={index} style={cssVars({ "--vp-color": point.color })}>
              {point.label}
            </span>
          ))}
        </span>
      )}
    </div>
  );
};

/** A mini Chart drawn from the chart tab's real type and numbers. */
const ChartPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const chart_type = preview.chart?.chart_type ?? "bar";
  const { points, is_sample } = pointsOf(preview.chart);
  const is_pie = chart_type === "pie" || chart_type === "donut";

  return (
    <div className="vp-sheet vp-chart" data-sample={is_sample} data-type={chart_type}>
      {is_pie ? (
        <PieChart points={points} is_donut={chart_type === "donut"} is_sample={is_sample} />
      ) : chart_type === "line" ? (
        <LineChart points={points} />
      ) : (
        <BarChart points={points} chart={preview.chart} is_stacked={chart_type === "stacked_bar" && !is_sample} />
      )}
    </div>
  );
};

export default ChartPreview;
