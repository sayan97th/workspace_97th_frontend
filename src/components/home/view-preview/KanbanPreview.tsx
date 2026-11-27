import React from "react";
import type { RecentBoardKanbanCard, RecentBoardPreview } from "@/types/personal";
import { cssVars, percent } from "./previewHelpers";

/** Drawn for a Kanban that has no lanes yet. */
const SAMPLE_LANES = [
  { label: "To do", color: "#579bfc", item_count: 0, cards: [] },
  { label: "Working on it", color: "#fdab3d", item_count: 0, cards: [] },
  { label: "Done", color: "#00c875", item_count: 0, cards: [] },
];

/** The most cards a lane draws, the sheet crops the rest anyway. */
const CARDS_PER_LANE = 3;

const KanbanCard: React.FC<{ card: RecentBoardKanbanCard }> = ({ card }) => (
  <span className="vp-kanban__card">
    <i className="vp-kanban__title" style={{ width: percent(card.name_ratio) }} />
    <i className="vp-kanban__title vp-kanban__title--short" style={{ width: percent(card.name_ratio * 0.55) }} />
    {(card.people_count > 0 || card.has_date) && (
      <span className="vp-kanban__foot">
        {card.has_date && <i className="vp-kanban__date" />}
        {card.people_count > 0 && <i className="vp-kanban__avatar" />}
      </span>
    )}
  </span>
);

/**
 * A mini Kanban: one tinted lane per Status label with its real name and
 * count, holding cards shaped like the board's real items.
 */
const KanbanPreview: React.FC<{ preview: RecentBoardPreview }> = ({ preview }) => {
  const lanes = preview.kanban?.lanes.length ? preview.kanban.lanes : SAMPLE_LANES;

  return (
    <div className="vp-sheet vp-kanban" style={cssVars({ "--vp-lanes": lanes.length })}>
      {lanes.map((lane, index) => (
        <div key={index} className="vp-kanban__lane" style={cssVars({ "--vp-color": lane.color })}>
          <span className="vp-kanban__lane-head">
            <span className="vp-kanban__lane-name">{lane.label}</span>
            <span className="vp-kanban__count">{lane.item_count}</span>
          </span>
          {lane.cards.length > 0 ? (
            lane.cards.slice(0, CARDS_PER_LANE).map((card, card_index) => <KanbanCard key={card_index} card={card} />)
          ) : (
            <span className="vp-kanban__card vp-kanban__card--ghost" />
          )}
        </div>
      ))}
    </div>
  );
};

export default KanbanPreview;
