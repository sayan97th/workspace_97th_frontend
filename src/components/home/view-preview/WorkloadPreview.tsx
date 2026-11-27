import React from "react";
import type { RecentBoardPreview } from "@/types/personal";
import { cssVars, paletteColor, percent } from "./previewHelpers";

/** Loads drawn when nobody is assigned yet. */
const SAMPLE_LOADS = [6, 3, 8, 4];

/** Above this share of the busiest person, a bar reads as overloaded. */
const HIGH_LOAD = 0.85;

/**
 * A mini Workload: one row per person with an avatar and a capacity bar,
 * green when there is room, orange when busy, red at the top.
 */
const WorkloadPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const is_sample = !preview.workload?.loads.length;
  const loads = is_sample ? SAMPLE_LOADS : (preview.workload?.loads ?? []);
  const capacity = Math.max(...loads) * 1.15;

  return (
    <div className="vp-sheet vp-workload" data-sample={is_sample}>
      {loads.map((load, index) => {
        const share = load / capacity;
        const level = share >= HIGH_LOAD ? "high" : share >= 0.5 ? "busy" : "free";
        return (
          <span key={index} className="vp-workload__row" style={cssVars({ "--vp-color": paletteColor(null, index + 2) })}>
            <i className="vp-workload__avatar" />
            <span className="vp-workload__track">
              <i data-level={level} style={{ width: percent(share) }} />
            </span>
          </span>
        );
      })}
    </div>
  );
};

export default WorkloadPreview;
