"use client";
import React, { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import BoardChart from "../../chart/BoardChart";
import { buildChartApexOptions, buildChartApexSeries } from "../../chart/chartApex";
import { getSeriesColor } from "../../chart/chartDesign";
import type { ChartDataDto } from "../../chart/types";
import PersonAvatar from "../../PersonAvatar";
import { toPersonOption, formatLoad } from "../../workload/workloadUtils";
import type {
  BatteryData,
  DashboardWidget,
  DashboardWidgetResult,
  NumbersData,
  StatusOverviewData,
  StatusSegment,
  TableWidgetData,
  WorkloadWidgetData,
} from "../types";
import { NUMBERS_FUNCTION_LABEL } from "../widgetCatalog";

type WidgetBodyProps = {
  widget: DashboardWidget;
  result: DashboardWidgetResult | undefined;
  onOpenItem?: (item_id: number) => void;
};

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Renders what a widget computed to, or why it could not be computed. */
const WidgetBody: React.FC<WidgetBodyProps> = ({ widget, result, onOpenItem }) => {
  if (!result) return <WidgetMessage text="Loading…" />;
  if (result.error) return <WidgetMessage text={result.error} tone="error" />;
  if (!result.data) return <WidgetMessage text="Nothing to show yet." />;

  switch (widget.type) {
    case "numbers":
      return <NumbersBody widget={widget} data={result.data as NumbersData} columns={result.columns} />;
    case "battery":
      return <BatteryBody data={result.data as BatteryData} />;
    case "status_overview":
      return <StatusOverviewBody data={result.data as StatusOverviewData} />;
    case "chart":
      return <ChartBody data={result.data as ChartDataDto} />;
    case "table":
      return <TableBody data={result.data as TableWidgetData} onOpenItem={onOpenItem} />;
    case "workload":
      return <WorkloadBody data={result.data as WorkloadWidgetData} columns={result.columns} />;
    default:
      return null;
  }
};

function WidgetMessage({ text, tone = "muted" }: { text: string; tone?: "muted" | "error" }) {
  return (
    <div className={`flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[13px] ${tone === "error" ? "text-red-500" : "text-shell-text-muted"}`}>
      {text}
    </div>
  );
}

/** One headline number, a stat tile rather than a chart. */
function NumbersBody({ widget, data, columns }: { widget: DashboardWidget; data: NumbersData; columns: DashboardWidgetResult["columns"] }) {
  const column_label = columns.find((column) => column.id === data.column_id)?.label;
  const caption = data.function === "count" ? "Items" : `${NUMBERS_FUNCTION_LABEL[data.function]} of ${column_label ?? "a number column"}`;
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-1 px-4">
      <div className="text-[44px] font-semibold leading-none tracking-[-0.02em] text-shell-text">
        {widget.config?.prefix}
        {NUMBER_FORMAT.format(data.value)}
        {widget.config?.suffix && <span className="ml-1 text-[22px] font-medium text-shell-text-muted">{widget.config.suffix}</span>}
      </div>
      <div className="text-[13px] text-shell-text-muted">{caption}</div>
      {data.function !== "count" && <div className="text-[12px] text-shell-text-faint">across {data.item_count} items</div>}
    </div>
  );
}

/**
 * A segmented bar per status, drawn in each status's own color with a 2px
 * surface gap between segments. The legend carries the labels and counts,
 * so the colors are never the only way to tell the segments apart.
 */
function SegmentBar({ segments, height = 18 }: { segments: StatusSegment[]; height?: number }) {
  const visible = segments.filter((segment) => segment.count > 0);
  if (visible.length === 0) return <div className="w-full rounded bg-shell-hover" style={{ height }} />;
  return (
    <div className="flex w-full gap-[2px] overflow-hidden rounded" style={{ height }}>
      {visible.map((segment) => (
        <div key={segment.id} title={`${segment.label}: ${segment.count} (${segment.percent}%)`} style={{ width: `${segment.percent}%`, background: segment.color, minWidth: 4 }} />
      ))}
    </div>
  );
}

function SegmentLegend({ segments }: { segments: StatusSegment[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-x-4 gap-y-1.5">
      {segments.map((segment) => (
        <li key={segment.id} className="flex min-w-0 items-center gap-2 text-[12.5px] text-shell-text-secondary">
          <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: segment.color }} />
          <span className="truncate">{segment.label}</span>
          <span className="ml-auto flex-none tabular-nums text-shell-text-muted">{segment.count}</span>
        </li>
      ))}
    </ul>
  );
}

function BatteryBody({ data }: { data: BatteryData }) {
  if (!data.status_column_id) return <WidgetMessage text="Add a Status column to see progress." />;
  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="text-[36px] font-semibold leading-none tracking-[-0.02em] text-shell-text">{Math.round(data.done_percent)}%</span>
        <span className="text-[13px] text-shell-text-muted">
          done · {data.done_count} of {data.total} items
        </span>
      </div>
      <SegmentBar segments={data.segments} height={22} />
      <SegmentLegend segments={data.segments} />
    </div>
  );
}

function StatusOverviewBody({ data }: { data: StatusOverviewData }) {
  if (!data.status_column_id) return <WidgetMessage text="Add a Status, Label or Dropdown column to see the overview." />;
  return (
    <ul className="flex flex-col gap-2.5 px-4 py-3">
      {data.segments.map((segment) => (
        <li key={segment.id} className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: segment.color }} />
            <span className="min-w-0 flex-1 truncate text-shell-text-secondary">{segment.label}</span>
            <span className="tabular-nums text-shell-text">{segment.count}</span>
            <span className="w-11 text-right tabular-nums text-shell-text-muted">{Math.round(segment.percent)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-shell-hover">
            <div className="h-full rounded-full" style={{ width: `${segment.percent}%`, background: segment.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Reuses the Chart tab's ApexCharts options so both look and behave the same. */
function ChartBody({ data }: { data: ChartDataDto }) {
  const { resolved_theme } = useTheme();
  const is_dark = resolved_theme === "dark";
  const options = useMemo(() => buildChartApexOptions(data, is_dark), [data, is_dark]);
  const series = useMemo(() => buildChartApexSeries(data), [data]);
  if (!data.has_data) return <WidgetMessage text="No items to chart yet." />;
  return (
    <div className="px-2 pb-1 pt-2">
      <BoardChart type={data.config.chart_type === "stacked_bar" ? "bar" : data.config.chart_type} options={options} series={series} height={260} />
    </div>
  );
}

function TableBody({ data, onOpenItem }: { data: TableWidgetData; onOpenItem?: (item_id: number) => void }) {
  if (data.rows.length === 0) return <WidgetMessage text="No items yet." />;
  return (
    <div className="overflow-x-auto px-1 pb-2">
      <table className="w-full min-w-[480px] border-collapse text-left text-[12.5px]">
        <thead>
          <tr className="text-[11.5px] uppercase tracking-wide text-shell-text-muted">
            <th className="border-b border-shell-border px-3 py-2 font-medium">Item</th>
            {data.columns.map((column) => (
              <th key={column.id} className="border-b border-shell-border px-3 py-2 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.id} className="hover:bg-shell-hover/60">
              <td className="border-b border-shell-border px-3 py-2">
                <span className="flex items-center gap-2">
                  <span className="h-4 w-1 flex-none rounded-full" style={{ background: row.group_color ?? "#579bfc" }} title={row.group_name ?? undefined} />
                  {onOpenItem ? (
                    <button type="button" onClick={() => onOpenItem(row.id)} className="truncate text-left text-shell-text hover:underline">
                      {row.name}
                    </button>
                  ) : (
                    <span className="truncate text-shell-text">{row.name}</span>
                  )}
                </span>
              </td>
              {row.cells.map((cell, index) => (
                <td key={data.columns[index]?.id ?? index} className="max-w-[220px] border-b border-shell-border px-3 py-2">
                  {cell.color ? (
                    <span className="inline-block max-w-full truncate rounded px-2 py-0.5 text-[12px] font-medium text-white" style={{ background: cell.color }}>
                      {cell.text}
                    </span>
                  ) : (
                    <span className="block truncate text-shell-text-secondary">{cell.text}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.total > data.rows.length && <div className="px-3 pt-2 text-[12px] text-shell-text-faint">Showing {data.rows.length} of {data.total} items</div>}
    </div>
  );
}

/** Items (or effort) per person as horizontal bars in one hue, busiest first, with the value written next to each bar. */
function WorkloadBody({ data, columns }: { data: WorkloadWidgetData; columns: DashboardWidgetResult["columns"] }) {
  const { resolved_theme } = useTheme();
  const bar_color = getSeriesColor(0, resolved_theme === "dark");
  if (!data.people_column_id) return <WidgetMessage text="Add a People column to see the workload." />;
  if (data.people.length === 0) return <WidgetMessage text="Nobody is assigned yet." />;
  const max = Math.max(...data.people.map((entry) => entry.load), 1);
  const unit = data.effort_column_id ? columns.find((column) => column.id === data.effort_column_id)?.label ?? "Effort" : "Items";

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      {data.people.map((entry) => (
        <div key={entry.person.id ?? "none"} className="flex items-center gap-2.5" title={`${entry.person.name}: ${formatLoad(entry.load)} ${unit.toLowerCase()} in ${entry.item_count} items`}>
          <PersonAvatar person={toPersonOption(entry.person)} size={24} />
          <span className="w-28 flex-none truncate text-[12.5px] text-shell-text-secondary">{entry.person.name}</span>
          <div className="h-3 min-w-0 flex-1">
            <div className="h-full rounded-r" style={{ width: `${Math.max(3, (entry.load / max) * 100)}%`, background: bar_color, borderRadius: 4 }} />
          </div>
          <span className="w-10 flex-none text-right text-[12.5px] tabular-nums text-shell-text">{formatLoad(entry.load)}</span>
        </div>
      ))}
      <div className="pt-1 text-[12px] text-shell-text-faint">
        {unit} per person
        {data.unassigned > 0 ? ` · ${data.unassigned} unassigned ${data.unassigned === 1 ? "item" : "items"}` : ""}
      </div>
    </div>
  );
}

export default WidgetBody;
