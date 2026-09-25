"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { format } from "date-fns";
import { PersonAvatar } from "@/components/board";
import { CHART_COLORS, getSeriesColor } from "@/components/board/chart/chartDesign";
import { useTheme } from "@/context/ThemeContext";
import { useUsageStatsManager, type UsageRangePreset } from "../useUsageStatsManager";

// `react-apexcharts` reads `window` at import time, so it is loaded client side only.
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const RANGE_PRESETS: { id: UsageRangePreset; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "365", label: "12 months" },
  { id: "custom", label: "Custom" },
];

const dateInputClass =
  "h-[32px] rounded-lg border border-shell-border-strong bg-shell-panel-alt px-2.5 text-[12.5px] text-shell-text outline-none focus:border-brand-500";

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
};

const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const StatTile: React.FC<{ label: string; value: string; detail?: string }> = ({ label, value, detail }) => (
  <div className="rounded-xl border border-shell-border bg-shell-panel-alt px-4 py-3.5">
    <div className="text-[12px] font-semibold text-shell-text-muted">{label}</div>
    <div className="mt-1 text-[24px] font-extrabold tracking-[-0.01em] text-shell-text">{value}</div>
    {detail ? <div className="mt-0.5 text-[11.5px] text-shell-text-faint">{detail}</div> : null}
  </div>
);

/**
 * Administration > Usage stats, monday's account usage dashboard: headline counts for the
 * chosen range, the daily active users trend and the most active boards and people.
 */
const UsageSection: React.FC = () => {
  const usage = useUsageStatsManager();
  const { resolved_theme } = useTheme();
  const is_dark = resolved_theme === "dark";
  const stats = usage.stats;

  const chart_options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
        foreColor: CHART_COLORS.axis_text,
        background: "transparent",
        animations: { speed: 250 },
      },
      theme: { mode: is_dark ? "dark" : "light" },
      colors: [getSeriesColor(0, is_dark)],
      stroke: { curve: "monotoneCubic", width: 2 },
      fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.28, opacityTo: 0.02, stops: [0, 100] } },
      dataLabels: { enabled: false },
      markers: { size: 0, hover: { size: 5 } },
      grid: { borderColor: CHART_COLORS.grid, strokeDashArray: 0, xaxis: { lines: { show: false } } },
      xaxis: {
        type: "datetime",
        labels: { style: { colors: CHART_COLORS.axis_text, fontSize: "12px" }, datetimeUTC: false },
        axisBorder: { color: CHART_COLORS.grid },
        axisTicks: { color: CHART_COLORS.grid },
        crosshairs: { show: true },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: CHART_COLORS.axis_text, fontSize: "12px" },
          formatter: (value: number) => Math.round(value).toLocaleString(),
        },
      },
      legend: { show: false },
      tooltip: {
        theme: is_dark ? "dark" : "light",
        x: { format: "MMM d, yyyy" },
        y: { formatter: (value: number) => `${value.toLocaleString()} active ${value === 1 ? "user" : "users"}` },
      },
    }),
    [is_dark]
  );

  const chart_series = useMemo(
    () => [
      {
        name: "Active users",
        data: (stats?.daily_active_users ?? []).map((point) => ({
          x: new Date(`${point.date}T00:00:00`).getTime(),
          y: point.active_users,
        })),
      },
    ],
    [stats]
  );

  return (
    <div className="max-w-[1100px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[520px] text-[13px] leading-relaxed text-shell-text-muted">
          See how the account is being used. A person counts as active on a day they signed in, changed an item, posted an
          update or made a recorded change.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-shell-border-strong p-[3px]">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => usage.setPreset(preset.id)}
                className={`rounded-md px-2.5 py-[5px] text-[12.5px] font-semibold transition-colors ${
                  usage.preset === preset.id
                    ? "bg-shell-hover-strong text-shell-text"
                    : "text-shell-text-muted hover:text-shell-text-secondary"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {usage.preset === "custom" ? (
            <div className="flex items-center gap-1.5 text-[12px] text-shell-text-muted">
              <input
                type="date"
                aria-label="From"
                value={usage.from}
                max={usage.to}
                onChange={(event) => usage.setCustomRange(event.target.value, usage.to)}
                className={dateInputClass}
              />
              to
              <input
                type="date"
                aria-label="To"
                value={usage.to}
                min={usage.from}
                onChange={(event) => usage.setCustomRange(usage.from, event.target.value)}
                className={dateInputClass}
              />
            </div>
          ) : null}
        </div>
      </div>

      {usage.error ? (
        <div className="mb-4 rounded-[9px] border border-brand-500/30 bg-brand-500/[0.1] px-3.5 py-2.5 text-[12.5px] font-medium text-brand-200">
          {usage.error}
        </div>
      ) : null}

      {!stats ? (
        usage.is_loading ? <div className="py-10 text-center text-[13px] text-shell-text-faint">Loading usage stats…</div> : null
      ) : (
        <div className={usage.is_loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="Active users"
              value={stats.kpis.active_users.toLocaleString()}
              detail={`of ${stats.kpis.total_users.toLocaleString()} active accounts`}
            />
            <StatTile label="New users" value={stats.kpis.new_users.toLocaleString()} detail="joined in this period" />
            <StatTile
              label="Boards created"
              value={stats.kpis.boards_created.toLocaleString()}
              detail={`${stats.kpis.total_boards.toLocaleString()} active boards in total`}
            />
            <StatTile
              label="Items created"
              value={stats.kpis.items_created.toLocaleString()}
              detail={`${stats.kpis.total_items.toLocaleString()} items in total`}
            />
            <StatTile label="Updates posted" value={stats.kpis.updates_posted.toLocaleString()} />
            <StatTile label="Files uploaded" value={stats.kpis.files_uploaded.toLocaleString()} />
            <StatTile label="Storage used" value={formatBytes(stats.kpis.storage_bytes)} detail="item attachments" />
            <StatTile label="Deactivated users" value={stats.kpis.deactivated_users.toLocaleString()} detail="deactivated or deleted" />
          </div>

          <div className="mb-5 rounded-xl border border-shell-border bg-shell-panel-alt px-4 pb-2 pt-4">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <div className="text-[14px] font-bold text-shell-text">Daily active users</div>
              <div className="text-[12px] text-shell-text-faint">
                {format(new Date(`${stats.range.from}T00:00:00`), "MMM d, yyyy")} to{" "}
                {format(new Date(`${stats.range.to}T00:00:00`), "MMM d, yyyy")}
              </div>
            </div>
            <ReactApexChart type="area" options={chart_options} series={chart_series} height={280} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-shell-border bg-shell-panel-alt p-4">
              <div className="mb-3 text-[14px] font-bold text-shell-text">Most active boards</div>
              {stats.top_boards.length === 0 ? (
                <p className="py-4 text-[12.5px] text-shell-text-faint">No board activity in this period.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {stats.top_boards.map((board, index) => (
                    <li key={board.id}>
                      <a href={`/boards/${board.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-shell-hover">
                        <span className="w-4 flex-none text-[12px] font-bold text-shell-text-faint">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-shell-text">{board.label}</span>
                          {board.workspace ? (
                            <span className="block truncate text-[11.5px] text-shell-text-faint">{board.workspace}</span>
                          ) : null}
                        </span>
                        <span className="flex-none text-[12px] text-shell-text-muted">
                          {board.events_count.toLocaleString()} changes
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="rounded-xl border border-shell-border bg-shell-panel-alt p-4">
              <div className="mb-3 text-[14px] font-bold text-shell-text">Most active people</div>
              {stats.top_users.length === 0 ? (
                <p className="py-4 text-[12.5px] text-shell-text-faint">No recorded activity in this period.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {stats.top_users.map((user, index) => (
                    <li key={user.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <span className="w-4 flex-none text-[12px] font-bold text-shell-text-faint">{index + 1}</span>
                      <PersonAvatar
                        person={{
                          id: String(user.id),
                          name: user.full_name,
                          initials: initials(user.full_name),
                          avatar_seed: user.id,
                          avatar_url: user.profile_photo_url ?? undefined,
                          is_deactivated: user.is_deactivated,
                        }}
                        size={26}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-shell-text">{user.full_name}</span>
                      <span className="flex-none text-right text-[12px] text-shell-text-muted">
                        {user.events_count.toLocaleString()} actions
                        <span className="block text-[11px] text-shell-text-faint">
                          active {user.active_days} {user.active_days === 1 ? "day" : "days"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageSection;
