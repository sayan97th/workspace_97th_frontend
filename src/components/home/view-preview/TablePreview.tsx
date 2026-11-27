import React from "react";
import type { RecentBoardPreview, RecentBoardPreviewCell, RecentBoardPreviewRow } from "@/types/personal";
import { cssVars, paletteColor, percent } from "./previewHelpers";

/** Rows the sheet has room for, shared between the groups it draws. */
const ROW_BUDGET = 6;

/** Drawn for a board without columns yet, so the rows never look bare. */
const SAMPLE_COLUMNS = ["status", "people", "date"];

/** Drawn when a board has no groups yet. */
const SAMPLE_GROUPS = [
  { id: -1, color: "#579bfc", rows: 2 },
  { id: -2, color: "#a25ddc", rows: 1 },
];

type DrawnGroup = { id: number; color: string; rows: Array<RecentBoardPreviewRow | null> };

/**
 * Splits the row budget between the first three groups: each one gets its
 * real sample rows, a group without items gets one ghost row.
 */
const drawnGroups = (preview: RecentBoardPreview): DrawnGroup[] => {
  if (preview.groups.length === 0) {
    return SAMPLE_GROUPS.map((group) => ({ id: group.id, color: group.color, rows: Array(group.rows).fill(null) }));
  }

  const visible_groups = preview.groups.slice(0, 3);
  let rows_left = ROW_BUDGET;
  return visible_groups.map((group, index) => {
    const reserved_for_rest = visible_groups.length - index - 1;
    const sample_rows = preview.table?.rows[String(group.id)] ?? [];
    const take = Math.max(1, Math.min(sample_rows.length, rows_left - reserved_for_rest));
    rows_left -= take;
    return {
      id: group.id,
      color: paletteColor(group.color, index),
      rows: sample_rows.length > 0 ? sample_rows.slice(0, take) : [null],
    };
  });
};

/** One mini cell, drawn the way its column kind looks in the real table. */
const PreviewCell: React.FC<{ kind: string; cell: RecentBoardPreviewCell | null }> = ({ kind, cell }) => {
  const is_filled = cell?.filled ?? false;

  switch (kind) {
    case "status":
    case "label":
      return (
        <span className="vp-cell vp-cell--status" data-filled={is_filled} style={cell?.color ? { background: cell.color } : undefined} />
      );
    case "people":
      return (
        <span className="vp-cell vp-cell--people">
          <i data-filled={is_filled} />
        </span>
      );
    case "checkbox":
      return (
        <span className="vp-cell vp-cell--checkbox">
          <i data-filled={is_filled} />
        </span>
      );
    case "timeline":
    case "progress":
      return (
        <span className={`vp-cell vp-cell--${kind}`}>
          <i data-filled={is_filled} />
        </span>
      );
    default:
      return (
        <span className={`vp-cell vp-cell--text vp-cell--${kind}`}>
          <i data-filled={is_filled} />
        </span>
      );
  }
};

/**
 * A mini Table: a column header, then each group's colored title and its real
 * first rows, with Status cells in their real colors, avatars where people
 * are assigned and dates where they are set.
 */
const TablePreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const columns = preview.table?.columns.length ? preview.table.columns : SAMPLE_COLUMNS;
  const is_sample = !preview.table?.columns.length;

  return (
    <div className="vp-sheet vp-table" style={cssVars({ "--vp-columns": columns.length })}>
      <div className="vp-table__head">
        <span className="vp-table__head-name" />
        {columns.map((kind, index) => (
          <span key={index} className="vp-table__head-cell" />
        ))}
      </div>
      {drawnGroups(preview).map((group) => (
        <div key={group.id} className="vp-table__group" style={cssVars({ "--vp-color": group.color })}>
          <span className="vp-table__group-title" />
          {group.rows.map((row, row_index) => (
            <div key={row_index} className="vp-table__row" data-ghost={row === null}>
              <span className="vp-table__name">
                <i style={{ width: percent(row?.name_ratio ?? 0.55) }} />
              </span>
              {columns.map((kind, cell_index) => (
                <PreviewCell key={cell_index} kind={kind} cell={is_sample ? null : row?.cells[cell_index] ?? null} />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default TablePreview;
