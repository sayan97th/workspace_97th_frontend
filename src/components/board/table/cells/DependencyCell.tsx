"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import GiveFeedbackModal from "../../GiveFeedbackModal";
import type { CellValue, ColumnDef } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { fmtDate, fmtRange, parseRangeValue } from "../dateUtils";
import { dependencyPickerSections, findNode } from "../treeUtils";
import { describeLag, type DependencyMenuLink } from "../menus/DependencyLinkRow";
import DependencyPicker from "../menus/DependencyPicker";
import { useCellTooltip } from "./CellTooltip";
import "./dependency-cell.css";

/** Chips drawn in the closed cell before the rest fold into a "+N" bubble. */
const MAX_CLOSED_CHIPS = 2;

interface DependencyCellProps {
  node_id: string;
  column: ColumnDef;
  values: Record<string, CellValue>;
  state: BoardTableState;
  actions: BoardTableActions;
}

/** A Dependency cell value as predecessor ids. Automations may store numbers, the table stores strings. */
function dependencyIds(value: CellValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((id) => (typeof id === "string" || typeof id === "number" ? [String(id)] : []));
}

/**
 * A Dependency cell, monday.com style: the items this one depends on as light blue chips, a
 * hover "+" to add more, and the "Choose dependencies" picker. While the picker is open the cell
 * grows over the rows below into a card listing every chip with its remove button. A chip's
 * tooltip says how this item is scheduled from it ("Record Episode, 7 days after").
 */
export default function DependencyCell({ node_id, column, values, state, actions }: DependencyCellProps) {
  const scope_key = `${node_id}:${column.id}`;
  const is_menu_open = state.open_cell_menu_key === scope_key;
  const can_edit = !state.read_only && Boolean(actions.canEditCell(node_id, column.id));
  const [is_feedback_open, setIsFeedbackOpen] = useState(false);

  const dependency_ids = dependencyIds(values[column.id]);
  const link_settings = findNode(state.groups, node_id)?.dependency_links?.[column.id];
  const date_column = column.dependency?.date_column_id ? column.dependency_date_columns?.find((c) => c.id === column.dependency?.date_column_id) : undefined;
  const is_timeline = date_column?.kind === "timeline";

  const links: DependencyMenuLink[] = useMemo(() => {
    const dateLabelOf = (predecessor_values: Record<string, CellValue> | undefined): string | null => {
      if (!date_column || !predecessor_values) return null;
      const date_value = predecessor_values[date_column.id];
      if (date_column.kind === "timeline") {
        const { start_iso, end_iso } = parseRangeValue(date_value);
        return start_iso ? fmtRange(start_iso, end_iso || start_iso) : null;
      }
      return typeof date_value === "string" && date_value ? fmtDate(date_value) : null;
    };
    return dependency_ids.flatMap((id) => {
      const predecessor = findNode(state.groups, id);
      if (!predecessor) return [];
      const settings = link_settings?.[id];
      return [{ id, name: predecessor.name, type: settings?.type ?? "fs", lag_days: settings?.lag_days ?? 0, date_label: dateLabelOf(predecessor.values) }];
    });
    // `dependency_ids` is rebuilt every render, its joined ids are the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dependency_ids.join(","), link_settings, date_column, state.groups]);

  const sections = useMemo(
    () => (is_menu_open ? dependencyPickerSections(state.groups, node_id, column.id, links.map((link) => link.id)) : []),
    [is_menu_open, state.groups, node_id, column.id, links]
  );

  const schedule_notice = !date_column
    ? "Dates are not scheduled yet. Pick a date column in this column's settings."
    : column.dependency?.mode === "none"
      ? "This column is set to No action, so dates will not move by themselves."
      : null;

  const openMenu = () => actions.openCellMenu(scope_key);
  const can_open_items = Boolean(state.can_open_board_items);
  const removeLink = (item_id: string) =>
    actions.setDependencyLinks(
      node_id,
      column.id,
      links.filter((link) => link.id !== item_id).map((link) => ({ predecessor_id: link.id }))
    );

  const closed_chips = links.slice(0, MAX_CLOSED_CHIPS);
  const overflow = links.slice(MAX_CLOSED_CHIPS);

  // The open cell, grown into a card over the rows below: "+" then every chip with its "x".
  const open_card = (
    <div className="dependency-cell-card">
      {can_edit && (
        <span className="dependency-cell-card__plus" aria-hidden="true">
          <PlusIcon />
        </span>
      )}
      {links.map((link) => (
        <span key={link.id} className="dependency-cell__chip" title={chipTitle(link)}>
          <span className="dependency-cell__chip-name">{link.name || "Untitled item"}</span>
          {can_edit && (
            <button type="button" className="dependency-cell__chip-remove" onClick={() => removeLink(link.id)} aria-label={`Remove dependency on ${link.name}`}>
              <CloseIcon />
            </button>
          )}
        </span>
      ))}
    </div>
  );

  return (
    <div className="dependency-cell">
      <button
        type="button"
        className="dependency-cell__hit-area"
        onClick={openMenu}
        aria-label={`Choose dependencies for ${column.title}`}
        aria-haspopup="dialog"
        aria-expanded={is_menu_open}
      />
      <div className="dependency-cell__content">
        {can_edit && links.length > 0 && (
          <button type="button" className="dependency-cell__add" onClick={openMenu} aria-label="Add dependency">
            <PlusIcon />
          </button>
        )}
        {closed_chips.map((link) => (
          <DependencyChip key={link.id} link={link} onClick={can_open_items ? () => actions.openBoardItem(link.id) : openMenu} />
        ))}
        {overflow.length > 0 && <OverflowBubble links={overflow} onClick={openMenu} />}
        {links.length === 0 && can_edit && (
          <span className="dependency-cell__empty-add" aria-hidden="true">
            <PlusIcon />
          </span>
        )}
      </div>

      {is_menu_open && (
        <DependencyPicker
          sections={sections}
          links={links}
          is_timeline={is_timeline}
          schedule_notice={schedule_notice}
          can_edit={can_edit}
          can_create={state.can_create_items && Boolean(state.can_create_named_items)}
          can_give_feedback={state.can_give_feedback}
          can_open_items={can_open_items}
          onChange={(next_links) => actions.setDependencyLinks(node_id, column.id, next_links)}
          onCreateItem={async (name) => {
            await actions.createDependencyItem(node_id, column.id, name);
          }}
          onOpenItem={(item_id) => actions.openBoardItem(item_id)}
          onGiveFeedback={() => {
            actions.closeCellMenu();
            setIsFeedbackOpen(true);
          }}
          onClose={actions.closeCellMenu}
          anchor_overlay={open_card}
        />
      )}

      {is_feedback_open &&
        typeof document !== "undefined" &&
        createPortal(
          <GiveFeedbackModal
            is_open
            description="Tell us what is working, what is not, or what you would like to see in the Dependency column."
            onSubmit={(message) => actions.submitFeedback(`[Dependency column] ${message}`)}
            onClose={() => setIsFeedbackOpen(false)}
          />,
          document.body
        )}
    </div>
  );
}

/** "Record Episode, 7 days after": the chip's tooltip, how this item is scheduled from the one it depends on. */
function chipTitle(link: DependencyMenuLink): string {
  return `${link.name || "Untitled item"}, ${describeLag(link.lag_days).toLowerCase()}`;
}

/** One item this row depends on, in the closed cell. Opens the item, the tooltip tells its lag. */
function DependencyChip({ link, onClick }: { link: DependencyMenuLink; onClick: () => void }) {
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(chipTitle(link));
  return (
    <>
      <button
        type="button"
        {...anchor_props}
        className="dependency-cell__chip dependency-cell__chip--button"
        aria-label={`Open ${link.name || "Untitled item"}`}
        onClick={() => {
          hide();
          onClick();
        }}
      >
        <span className="dependency-cell__chip-name">{link.name || "Untitled item"}</span>
      </button>
      {tooltip}
    </>
  );
}

/** The "+N" bubble for the chips that did not fit, naming them in its tooltip. */
function OverflowBubble({ links, onClick }: { links: DependencyMenuLink[]; onClick: () => void }) {
  const { anchor_props, hide, tooltip } = useCellTooltip<HTMLButtonElement>(
    <span className="dependency-cell__count-names">
      {links.map((link) => (
        <span key={link.id}>{chipTitle(link)}</span>
      ))}
    </span>
  );
  return (
    <>
      <button
        type="button"
        {...anchor_props}
        className="dependency-cell__count"
        aria-label={`Show all ${links.length + MAX_CLOSED_CHIPS} dependencies`}
        onClick={() => {
          hide();
          onClick();
        }}
      >
        +{links.length}
      </button>
      {tooltip}
    </>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" aria-hidden="true">
      <path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
