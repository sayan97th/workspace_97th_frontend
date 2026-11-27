import React from "react";
import type { RecentBoardGanttPreview, RecentBoardPreview } from "@/types/personal";
import { cssVars, paletteColor, percent } from "./previewHelpers";

/** Week columns drawn behind the bars. */
const GRID_COLUMNS = 6;

/** Thinnest bar drawn, so a one day task stays visible. */
const MIN_BAR_WIDTH = 0.05;

/** A sample plan, in the board's group colors, for a Gantt with nothing scheduled yet. */
const sampleGantt = (preview: RecentBoardPreview): RecentBoardGanttPreview => {
  const spans = [
    [0.02, 0.32],
    [0.18, 0.5],
    [0.36, 0.62],
    [0.5, 0.86],
    [0.7, 0.7],
  ];
  return {
    bars: spans.map(([start, end], index) => ({
      start,
      end,
      color: paletteColor(preview.groups[index % Math.max(1, preview.groups.length)]?.color, index),
      is_milestone: start === end,
    })),
    today: 0.44,
  };
};

/**
 * A mini Gantt: a task list on the left and the real timeline bars on the
 * right, laid over week columns with a line marking today.
 */
const GanttPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const is_sample = !preview.gantt?.bars.length;
  const gantt = is_sample ? sampleGantt(preview) : (preview.gantt as RecentBoardGanttPreview);

  return (
    <div className="vp-sheet vp-gantt" data-sample={is_sample}>
      <div className="vp-gantt__list">
        {gantt.bars.map((bar, index) => (
          <span key={index} className="vp-gantt__task" style={cssVars({ "--vp-color": bar.color })}>
            <i style={{ width: percent(0.45 + ((index * 37) % 50) / 100) }} />
          </span>
        ))}
      </div>
      <div className="vp-gantt__chart" style={cssVars({ "--vp-grid": GRID_COLUMNS })}>
        <div className="vp-gantt__scale">
          {Array.from({ length: GRID_COLUMNS }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        {gantt.bars.map((bar, index) => (
          <span key={index} className="vp-gantt__track">
            {bar.is_milestone ? (
              <i className="vp-gantt__milestone" style={{ left: percent(bar.start), background: bar.color }} />
            ) : (
              <i
                className="vp-gantt__bar"
                style={{ left: percent(bar.start), width: percent(Math.max(MIN_BAR_WIDTH, bar.end - bar.start)), background: bar.color }}
              />
            )}
          </span>
        ))}
        {gantt.today !== null && <span className="vp-gantt__today" style={{ left: percent(gantt.today) }} />}
      </div>
    </div>
  );
};

export default GanttPreview;
