import React from "react";
import type { RecentBoardPreview } from "@/types/personal";
import { compactNumber, conicSlices, cssVars, paletteColor, percent } from "./previewHelpers";

/** Group shares drawn when the board has no items yet. */
const SAMPLE_SHARES = [5, 3, 2];

/**
 * A mini Dashboard of widgets built from the board's real groups: the item
 * count, a donut and a bar chart of items per group, and a progress strip.
 */
const DashboardPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const is_sample = preview.item_count === 0;
  const shares = is_sample
    ? SAMPLE_SHARES.map((value, index) => ({ value, color: paletteColor(null, index) }))
    : preview.groups.map((group, index) => ({ value: group.item_count, color: paletteColor(group.color, index) }));
  const max = Math.max(1, ...shares.map((share) => share.value));
  const total = shares.reduce((sum, share) => sum + share.value, 0) || 1;

  return (
    <div className="vp-dashboard" data-sample={is_sample}>
      <span className="vp-widget vp-widget--number">
        <i className="vp-widget__title" />
        <b>{is_sample ? "0" : compactNumber(preview.item_count)}</b>
      </span>
      <span className="vp-widget vp-widget--donut">
        <i className="vp-widget__donut" style={{ background: conicSlices(shares) }} />
      </span>
      <span className="vp-widget vp-widget--bars">
        <i className="vp-widget__title" />
        <span className="vp-widget__bars">
          {shares.map((share, index) => (
            <i key={index} style={{ height: percent(share.value / max), background: share.color }} />
          ))}
        </span>
      </span>
      <span className="vp-widget vp-widget--battery">
        <i className="vp-widget__title" />
        <span className="vp-widget__battery">
          {shares.map((share, index) => (
            <i key={index} style={cssVars({ "--vp-share": share.value / total, "--vp-color": share.color })} />
          ))}
        </span>
      </span>
    </div>
  );
};

export default DashboardPreview;
