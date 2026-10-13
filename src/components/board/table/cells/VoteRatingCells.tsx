"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { BoardTableGroup, CellValue, ColumnDef, PersonDef, RatingIcon } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { useCellTooltip } from "./CellTooltip";
import "./vote-rating-cells.css";

/** A Rating column's scale when the column has none of its own, see `ColumnDef.rating_max`. */
export const DEFAULT_RATING_MAX = 5;
/** The largest scale the column settings offer, matches the API's `BoardColumn::RATING_MAX_LIMIT`. */
export const RATING_MAX_LIMIT = 10;
/** How many voter names the Vote bar's tooltip lists before it sums up the rest. */
const VOTE_TOOLTIP_MAX_NAMES = 6;

export const ratingMaxOf = (column: Pick<ColumnDef, "rating_max">): number =>
  Math.min(RATING_MAX_LIMIT, Math.max(1, Math.round(column.rating_max ?? DEFAULT_RATING_MAX)));

export const ratingIconOf = (column: Pick<ColumnDef, "rating_icon">): RatingIcon => column.rating_icon ?? "star";

/** A Rating cell's stored value as a whole number inside the column's scale. */
export function ratingValueOf(value: CellValue, rating_max: number): number {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(number) ? Math.min(rating_max, Math.max(0, Math.round(number))) : 0;
}

/** A Vote cell's voter ids. */
export const voterIdsOf = (value: CellValue): string[] => (Array.isArray(value) ? (value as unknown[]).filter((id): id is string => typeof id === "string") : []);

/** The glyph each Rating icon is drawn with, on a 20px box. */
const RATING_ICON_PATHS: Record<RatingIcon, ReactNode> = {
  star: <path d="M10 1.9l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.52l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />,
  heart: <path d="M10 17.4s-7.2-4.4-7.2-9.4A4.05 4.05 0 0 1 10 5.4a4.05 4.05 0 0 1 7.2 2.6c0 5-7.2 9.4-7.2 9.4z" />,
  thumbs_up: (
    <path d="M2.5 8.5h3v9h-3a.75.75 0 0 1-.75-.75v-7.5a.75.75 0 0 1 .75-.75zm4.5 9V8.4l3.6-6.1a1.7 1.7 0 0 1 3.1 1.27l-.9 3.73h4.2a1.8 1.8 0 0 1 1.76 2.17l-1.35 6.4a2.1 2.1 0 0 1-2.05 1.63z" />
  ),
  smiley: (
    <path
      fillRule="evenodd"
      d="M10 1.75a8.25 8.25 0 1 1 0 16.5 8.25 8.25 0 0 1 0-16.5zM7.2 7.1a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3zm5.6 0a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3zm-6.55 4.65a.75.75 0 0 0-.6 1.2A5.4 5.4 0 0 0 10 15.2a5.4 5.4 0 0 0 4.35-2.25.75.75 0 0 0-1.2-.9A3.9 3.9 0 0 1 10 13.7a3.9 3.9 0 0 1-3.15-1.65.75.75 0 0 0-.6-.3z"
    />
  ),
};

export const RATING_ICON_LABELS: Record<RatingIcon, string> = {
  star: "Star",
  heart: "Heart",
  thumbs_up: "Thumbs up",
  smiley: "Smiley",
};

export function RatingGlyph({ icon, className }: { icon: RatingIcon; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden="true">
      {RATING_ICON_PATHS[icon]}
    </svg>
  );
}

interface VoteRatingCellProps {
  node_id: string;
  column: ColumnDef;
  value: CellValue;
  state: BoardTableState;
  actions: BoardTableActions;
}

/**
 * monday style Rating cell: the column's scale of icons, filled up to the value.
 * Hovering previews the value under the pointer, clicking the current value
 * again clears it, and a small "×" clears it too.
 */
export function RatingCell({ node_id, column, value, actions }: VoteRatingCellProps) {
  const rating_max = ratingMaxOf(column);
  const icon = ratingIconOf(column);
  const rating = ratingValueOf(value, rating_max);
  const can_edit = actions.canEditCell(node_id, column.id);
  const [hover_value, setHoverValue] = useState(0);
  const preview = can_edit && hover_value > 0 ? hover_value : rating;
  const clear_tooltip = useCellTooltip<HTMLButtonElement>("Clear rating");

  const rate = (next: number) => {
    setHoverValue(0);
    actions.setCellValue(node_id, column.id, next === rating ? 0 : next);
  };

  return (
    <div className={`rating-cell rating-cell--${icon}${can_edit ? "" : " is-read-only"}`} onMouseLeave={() => setHoverValue(0)}>
      <div className="rating-cell__scale" role="radiogroup" aria-label={`${column.title}, ${rating} of ${rating_max}`}>
        {Array.from({ length: rating_max }, (_, index) => {
          const step = index + 1;
          const is_filled = step <= preview;
          return (
            <button
              key={step}
              type="button"
              role="radio"
              aria-checked={step === rating}
              aria-label={`Rate ${step} of ${rating_max}`}
              disabled={!can_edit}
              onMouseEnter={() => setHoverValue(step)}
              onFocus={() => setHoverValue(step)}
              onBlur={() => setHoverValue(0)}
              onClick={() => rate(step)}
              className={`rating-cell__step${is_filled ? " is-filled" : ""}${is_filled && hover_value > 0 && step > rating ? " is-preview" : ""}`}
            >
              <RatingGlyph icon={icon} className="rating-cell__glyph" />
            </button>
          );
        })}
      </div>
      {can_edit && rating > 0 && (
        <>
          <button
            type="button"
            {...clear_tooltip.anchor_props}
            aria-label="Clear rating"
            onClick={() => {
              clear_tooltip.hide();
              actions.setCellValue(node_id, column.id, 0);
            }}
            className="rating-cell__clear"
          >
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <path d="M2.5 2.5l7 7m0-7l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {clear_tooltip.tooltip}
        </>
      )}
    </div>
  );
}

/** Every column's vote total per row set (a group's items, or one item's subitems), cached per `groups` snapshot so each cell reads it in constant time. */
const vote_total_cache = new WeakMap<BoardTableGroup[], Map<string, number>>();

/** The total votes of `column_id` among `node_id` and its siblings, which is what monday sizes each Vote bar against. */
function siblingVoteTotal(groups: BoardTableGroup[], node_id: string, column_id: string): number {
  let totals = vote_total_cache.get(groups);
  if (!totals) {
    totals = new Map();
    vote_total_cache.set(groups, totals);
  }
  const cache_key = `${column_id}:${node_id}`;
  const cached = totals.get(cache_key);
  if (cached !== undefined) return cached;

  const countVotes = (rows: { id: string; values: Record<string, CellValue> }[]) => {
    const total = rows.reduce((sum, row) => sum + voterIdsOf(row.values[column_id]).length, 0);
    rows.forEach((row) => totals.set(`${column_id}:${row.id}`, total));
    return total;
  };

  for (const group of groups) {
    if (group.items.some((item) => item.id === node_id)) return countVotes(group.items);
    for (const item of group.items) {
      if (item.subs.some((sub) => sub.id === node_id)) return countVotes(item.subs);
    }
  }
  return 0;
}

/** The Vote bar's tooltip: who voted, or that nobody has yet. */
function VotersTooltip({ voter_ids, people, current_user_id }: { voter_ids: string[]; people: PersonDef[]; current_user_id?: string | null }) {
  if (voter_ids.length === 0) return <>No votes yet...</>;

  const names = voter_ids.map((id) => (id === current_user_id ? "You" : people.find((person) => person.id === id)?.name ?? "Former member"));
  const shown = names.slice(0, VOTE_TOOLTIP_MAX_NAMES);
  const hidden_count = names.length - shown.length;
  return (
    <span className="vote-cell__tooltip">
      <span className="vote-cell__tooltip-title">{voter_ids.length === 1 ? "1 vote" : `${voter_ids.length} votes`}</span>
      {shown.map((name, index) => (
        <span key={`${voter_ids[index]}-${index}`} className="vote-cell__tooltip-name">{name}</span>
      ))}
      {hidden_count > 0 && <span className="vote-cell__tooltip-name">and {hidden_count} more</span>}
    </span>
  );
}

/**
 * monday style Vote cell: a round check button that adds or removes the
 * viewer's vote, a bar showing this row's share of the votes among its
 * siblings, and the vote count. Hovering the bar lists the voters.
 */
export function VoteCell({ node_id, column, value, state, actions }: VoteRatingCellProps) {
  const voter_ids = voterIdsOf(value);
  const current_user_id = state.current_user_id;
  const has_voted = !!current_user_id && voter_ids.includes(current_user_id);
  const can_vote = !!current_user_id && actions.canEditCell(node_id, column.id);
  const total = siblingVoteTotal(state.groups, node_id, column.id);
  const share_pct = total > 0 ? Math.round((voter_ids.length / total) * 100) : 0;
  const voters_tooltip = useCellTooltip<HTMLDivElement>(<VotersTooltip voter_ids={voter_ids} people={state.people} current_user_id={current_user_id} />);

  return (
    <div className="vote-cell">
      <button
        type="button"
        aria-pressed={has_voted}
        aria-label={!current_user_id ? "Sign in to vote" : has_voted ? "Remove your vote" : "Vote"}
        disabled={!can_vote}
        onClick={() => current_user_id && actions.toggleArrayValue(node_id, column.id, current_user_id)}
        className={`vote-cell__button${has_voted ? " is-voted" : ""}`}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3.5 8.4l3 2.9 6-6.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div {...voters_tooltip.anchor_props} className="vote-cell__meter" aria-label={`${voter_ids.length} of ${total} votes`}>
        <div
          className="vote-cell__bar"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={share_pct}
          aria-label={`${share_pct}% of the votes`}
        >
          <span className="vote-cell__fill" style={{ width: `${share_pct}%` }} />
        </div>
        <span className="vote-cell__count">{voter_ids.length}</span>
      </div>
      {voters_tooltip.tooltip}
    </div>
  );
}

/** The group summary footer's Vote ("Total votes 4") or Rating (average with its icon) cell. */
export function VoteRatingSummary({ column, kind, value, rating_max, is_compact = false }: { column: ColumnDef; kind: "vote" | "rating"; value: string; rating_max: number; is_compact?: boolean }) {
  if (kind === "vote") {
    return (
      <span className={`vote-rating-summary${is_compact ? " is-compact" : ""}`}>
        <span className="vote-rating-summary__caption">Total votes</span>
        <span className="vote-rating-summary__value">{value}</span>
      </span>
    );
  }
  const icon = ratingIconOf(column);
  if (!value) return <span className={`vote-rating-summary${is_compact ? " is-compact" : ""}`}><span className="vote-rating-summary__caption">No ratings yet</span></span>;
  return (
    <span className={`vote-rating-summary rating-cell--${icon}${is_compact ? " is-compact" : ""}`} title={`Average rating ${value} of ${rating_max}`}>
      <RatingGlyph icon={icon} className="vote-rating-summary__glyph" />
      <span className="vote-rating-summary__value">{value}</span>
      <span className="vote-rating-summary__caption">/ {rating_max} avg</span>
    </span>
  );
}

/** A read only rating, the same icons as the table cell, for shared views and linked item cards. */
export function RatingDisplay({ value, rating_max = DEFAULT_RATING_MAX, icon = "star", size = 14 }: { value: unknown; rating_max?: number; icon?: RatingIcon; size?: number }) {
  const scale = ratingMaxOf({ rating_max });
  const rating = ratingValueOf(typeof value === "number" || typeof value === "string" ? value : null, scale);
  return (
    <span className={`rating-display rating-cell--${icon}`} role="img" aria-label={`${rating} of ${scale}`} style={{ "--rating-display-size": `${size}px` } as CSSProperties}>
      {Array.from({ length: scale }, (_, index) => (
        <RatingGlyph key={index} icon={icon} className={`rating-display__glyph${index < rating ? " is-filled" : ""}`} />
      ))}
    </span>
  );
}
