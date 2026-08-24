"use client";
import React from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

// `react-apexcharts` reads `window` at import time, so it can never be part of
// the server-rendered bundle — `ssr: false` here (inside this Client
// Component) opts it out of prerendering, per Next's dynamic-import guide.
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type BoardChartProps = {
  /** Only the four kinds `useBoardChart` ever renders — "stacked_bar" maps to a plain "bar" chart with `chart.stacked: true` in `options`. */
  type: "bar" | "line" | "pie" | "donut";
  options: ApexOptions;
  series: ApexOptions["series"];
  height?: number;
};

/** Thin presentational wrapper around ApexCharts — every option/series comes from `useBoardChart`. */
const BoardChart: React.FC<BoardChartProps> = ({ type, options, series, height = 420 }) => (
  <div className="w-full">
    <ReactApexChart type={type} options={options} series={series} height={height} />
  </div>
);

export default BoardChart;
