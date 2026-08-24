"use client";
import React from "react";
import { ChartViewIcon } from "@/icons/board-icons";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import BoardChart from "./BoardChart";
import ChartConfigPanel from "./ChartConfigPanel";
import useBoardChart, { type BoardChartConfigInput } from "./useBoardChart";

export type BoardChartViewProps = BoardChartConfigInput;

/**
 * The "Chart" board view — a Monday-style bar/line/pie visualization of
 * another tab's items, grouped/split/aggregated per the config panel.
 * Self-contained: given just `board_id`/`view_id` it fetches, aggregates and
 * saves its own config on its own, so `TableBoardView` only has to mount it
 * (same division of responsibility as `BoardFileGalleryView`).
 */
const BoardChartView: React.FC<BoardChartViewProps> = ({ board_id, view_id }) => {
  const chart = useBoardChart({ board_id, view_id });

  if (chart.is_loading) {
    return <BoardLoadingSpinner />;
  }

  if (chart.error && !chart.data) {
    return <CenteredMessage title="Something went wrong" detail={chart.error} />;
  }

  if (!chart.data) {
    return null;
  }

  const { data } = chart;
  const selected_source = data.source_views.find((view) => view.id === data.config.source_view_id);
  const has_other_sources = data.source_views.length > 1;

  return (
    <div className="flex flex-col gap-1">
      {chart.error && (
        <div className="mb-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-500">
          {chart.error}
        </div>
      )}

      {/* The config panel stays visible even with nothing to chart yet — the picker itself
          is the fix (switch "Data from" to a tab that has items), not a dead end. */}
      <ChartConfigPanel data={data} onChangeConfig={chart.updateConfig} />

      {!data.has_data ? (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
            <ChartViewIcon size={26} />
          </span>
          <h2 className="text-lg font-semibold text-shell-text">Nothing to chart yet</h2>
          <p className="text-[13.5px] text-shell-text-muted">
            {selected_source
              ? `"${selected_source.label}" doesn't have any items yet. Add some items to it${
                  has_other_sources ? ', or pick a different tab from "Data from" above' : ""
                } to see them charted here.`
              : "This board doesn't have any tables with items yet. Add one, then come back to chart it."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-0.5 pb-2">
            <span className="text-[12.5px] font-medium text-shell-text-muted">
              {data.total.toLocaleString()} {data.config.aggregate_fn === "count" ? "items" : "total"}
            </span>
            {chart.is_saving && <span className="text-[12px] text-shell-text-faint">Saving…</span>}
          </div>

          <div className="rounded-xl border border-shell-border bg-shell-panel px-4 pb-2 pt-5">
            <BoardChart
              type={data.config.chart_type === "stacked_bar" ? "bar" : data.config.chart_type}
              options={chart.apex_options}
              series={chart.apex_series}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default BoardChartView;
