"use client";
import React, { useMemo, useState } from "react";
import BoardPopover from "./toolbar/BoardPopover";
import type { SelectionLevel } from "./table/selectionUtils";
import "./selection-action-bar.scss";

/** One choice of a "Move to" or "Convert" menu: a table (for items) or a parent item (for subitems). */
export type SelectionActionBarTarget = {
  id: string;
  label: string;
  /** Group color shown as a small swatch. */
  color?: string;
  /** Second line, e.g. the table a parent item lives in. */
  hint?: string;
};

export type SelectionActionBarProps = {
  /** Whether the checked rows are items or subitems. They are never mixed, see `selectionUtils.ts`. */
  level: SelectionLevel;
  /** Count of checked rows. The bar renders nothing at 0, so a caller can keep it mounted. */
  selected_count: number;
  /** Tables an item selection can move to. */
  group_targets: SelectionActionBarTarget[];
  /** Items a subitem selection can move under, or an item selection can be converted under. */
  parent_targets: SelectionActionBarTarget[];
  /** Why "Convert" is unavailable for this selection, e.g. an item that has its own subitems. */
  convert_disabled_reason?: string | null;
  /** Disables every action while a request is in flight, so repeated clicks can't stack overlapping mutations. */
  is_busy?: boolean;
  onDuplicate: () => void;
  onExport?: () => void;
  onArchive: () => void;
  onDelete: () => void;
  /** `parent_id` null turns subitems into items, an id turns items into subitems of that item. */
  onConvert: (parent_id: string | null) => void;
  /** A table id for items, a parent item id for subitems. */
  onMove: (target_id: string) => void;
  onClose: () => void;
};

type OpenMenu = "move" | "convert" | null;

const SEARCH_THRESHOLD = 7;

/**
 * The board table's floating batch actions bar (monday.com "Batch Actions"),
 * shown by `BoardShell`'s `selectionBar` slot once rows are checked. Works for
 * a selection of items or of subitems, each level with its own actions:
 *
 * - Items: Duplicate, Export, Archive, Delete, Convert (to subitems of
 *   another item) and Move to (another table).
 * - Subitems: Duplicate, Export, Archive, Delete, Convert (to items) and Move
 *   to (another parent item).
 *
 * Purely presentational: the caller (`TableBoardView`) owns the rows and
 * persists each action.
 */
const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  level,
  selected_count,
  group_targets,
  parent_targets,
  convert_disabled_reason = null,
  is_busy = false,
  onDuplicate,
  onExport,
  onArchive,
  onDelete,
  onConvert,
  onMove,
  onClose,
}) => {
  const [open_menu, setOpenMenu] = useState<OpenMenu>(null);
  const [move_anchor, setMoveAnchor] = useState<HTMLButtonElement | null>(null);
  const [convert_anchor, setConvertAnchor] = useState<HTMLButtonElement | null>(null);

  const is_subitem = level === "subitem";
  const move_targets = is_subitem ? parent_targets : group_targets;
  const noun = is_subitem ? (selected_count === 1 ? "Subitem" : "Subitems") : selected_count === 1 ? "Item" : "Items";

  if (selected_count === 0) return null;

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => setOpenMenu((current) => (current === menu ? null : menu));
  const closeMenu = () => setOpenMenu(null);

  return (
    <div className="selection-bar" role="toolbar" aria-label={`${selected_count} ${noun.toLowerCase()} selected`}>
      <div className="selection-bar__summary">
        <span className="selection-bar__count" aria-hidden="true">
          <span key={selected_count}>{selected_count}</span>
        </span>
        <span className="selection-bar__title">{noun} selected</span>
      </div>

      <div className="selection-bar__actions">
        <BarAction label="Duplicate" icon={<DuplicateGlyph />} onClick={onDuplicate} disabled={is_busy} />
        {onExport && <BarAction label="Export" icon={<ExportGlyph />} onClick={onExport} disabled={is_busy} />}
        <BarAction label="Archive" icon={<ArchiveGlyph />} onClick={onArchive} disabled={is_busy} />
        <BarAction label="Delete" icon={<DeleteGlyph />} onClick={onDelete} disabled={is_busy} tone="danger" />

        <BarAction
          ref={setConvertAnchor}
          label="Convert"
          icon={<ConvertGlyph />}
          onClick={() => toggleMenu("convert")}
          disabled={is_busy || !!convert_disabled_reason || (!is_subitem && parent_targets.length === 0)}
          title={convert_disabled_reason ?? undefined}
          is_open={open_menu === "convert"}
        />
        <BoardPopover anchor_el={convert_anchor} is_open={open_menu === "convert"} onClose={closeMenu} align="start" width={is_subitem ? 280 : 300}>
          {is_subitem ? (
            <div className="selection-menu">
              <div className="selection-menu__title">Convert to {selected_count === 1 ? "item" : "items"}</div>
              <p className="selection-menu__note">
                {selected_count === 1 ? "This subitem becomes an item" : `These ${selected_count} subitems become items`} in the same table as their
                parent. Values in subitem columns the table doesn&apos;t have are not kept.
              </p>
              <button
                type="button"
                className="selection-menu__confirm"
                onClick={() => {
                  closeMenu();
                  onConvert(null);
                }}
              >
                Convert
              </button>
            </div>
          ) : (
            <TargetMenu
              title="Convert to subitem of"
              placeholder="Search items"
              empty_text="No other items on this board"
              targets={parent_targets}
              onPick={(target_id) => {
                closeMenu();
                onConvert(target_id);
              }}
            />
          )}
        </BoardPopover>

        {move_targets.length > 0 && (
          <>
            <BarAction
              ref={setMoveAnchor}
              label="Move to"
              icon={<MoveGlyph />}
              onClick={() => toggleMenu("move")}
              disabled={is_busy}
              is_open={open_menu === "move"}
            />
            <BoardPopover anchor_el={move_anchor} is_open={open_menu === "move"} onClose={closeMenu} align="start" width={280}>
              <TargetMenu
                title={is_subitem ? "Move to item" : "Move to group"}
                placeholder={is_subitem ? "Search items" : "Search groups"}
                empty_text="Nothing matches your search"
                targets={move_targets}
                onPick={(target_id) => {
                  closeMenu();
                  onMove(target_id);
                }}
              />
            </BoardPopover>
          </>
        )}
      </div>

      <div className="selection-bar__divider" />
      <button type="button" onClick={onClose} aria-label="Clear selection" title="Clear selection" className="selection-bar__close">
        <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M5.5 5.5 L14.5 14.5 M14.5 5.5 L5.5 14.5" />
        </svg>
      </button>
    </div>
  );
};

type BarActionProps = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  is_open?: boolean;
  tone?: "danger";
  title?: string;
};

const BarAction = React.forwardRef<HTMLButtonElement, BarActionProps>(function BarAction(
  { label, icon, onClick, disabled = false, is_open, tone, title },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      aria-haspopup={is_open === undefined ? undefined : "menu"}
      aria-expanded={is_open}
      data-open={is_open || undefined}
      className={`selection-bar__action${tone === "danger" ? " selection-bar__action--danger" : ""}`}
    >
      {icon}
      <span className="selection-bar__label">{label}</span>
    </button>
  );
});

type TargetMenuProps = {
  title: string;
  placeholder: string;
  empty_text: string;
  targets: SelectionActionBarTarget[];
  onPick: (target_id: string) => void;
};

/** A titled pick one list, searchable once it gets long. */
function TargetMenu({ title, placeholder, empty_text, targets, onPick }: TargetMenuProps) {
  const [query, setQuery] = useState("");
  const visible_targets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return targets;
    return targets.filter((target) => target.label.toLowerCase().includes(needle) || target.hint?.toLowerCase().includes(needle));
  }, [targets, query]);

  return (
    <div className="selection-menu" role="menu" aria-label={title}>
      <div className="selection-menu__title">{title}</div>
      {targets.length > SEARCH_THRESHOLD && (
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="selection-menu__search"
        />
      )}
      <div className="selection-menu__list">
        {visible_targets.length === 0 ? (
          <div className="selection-menu__empty">{empty_text}</div>
        ) : (
          visible_targets.map((target) => (
            <button key={target.id} type="button" role="menuitem" onClick={() => onPick(target.id)} className="selection-menu__option">
              {target.color && <span className="selection-menu__swatch" style={{ background: target.color }} />}
              <span className="selection-menu__option-text">
                <span className="selection-menu__option-label">{target.label}</span>
                {target.hint && <span className="selection-menu__option-hint">{target.hint}</span>}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Thin line glyphs, drawn on one grid so the row of actions reads as a set ──

const Glyph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const DuplicateGlyph = () => (
  <Glyph>
    <rect x="6.5" y="6.5" width="10" height="10" rx="1.8" />
    <path d="M3.5 13 V5.3 A1.8 1.8 0 0 1 5.3 3.5 H13" />
  </Glyph>
);

const ExportGlyph = () => (
  <Glyph>
    <path d="M10 12.5 V3.5" />
    <path d="M6.5 7 L10 3.5 L13.5 7" />
    <path d="M4 11.5 V15 A1.5 1.5 0 0 0 5.5 16.5 H14.5 A1.5 1.5 0 0 0 16 15 V11.5" />
  </Glyph>
);

const ArchiveGlyph = () => (
  <Glyph>
    <rect x="3" y="3.5" width="14" height="3.5" rx="1" />
    <path d="M4.3 7 V15 A1.5 1.5 0 0 0 5.8 16.5 H14.2 A1.5 1.5 0 0 0 15.7 15 V7" />
    <path d="M8.2 10.3 H11.8" />
  </Glyph>
);

const DeleteGlyph = () => (
  <Glyph>
    <path d="M3.5 5.5 H16.5" />
    <path d="M7.5 5.5 V4 A1 1 0 0 1 8.5 3 H11.5 A1 1 0 0 1 12.5 4 V5.5" />
    <path d="M5 5.5 L5.8 15.6 A1.5 1.5 0 0 0 7.3 17 H12.7 A1.5 1.5 0 0 0 14.2 15.6 L15 5.5" />
    <path d="M8.5 9 V13.5 M11.5 9 V13.5" />
  </Glyph>
);

const ConvertGlyph = () => (
  <Glyph>
    <path d="M4 4 V9.5 A2 2 0 0 0 6 11.5 H15" />
    <path d="M12 8.5 L15 11.5 L12 14.5" />
  </Glyph>
);

const MoveGlyph = () => (
  <Glyph>
    <path d="M3.5 10 H16" />
    <path d="M11.5 5.5 L16 10 L11.5 14.5" />
  </Glyph>
);

export default SelectionActionBar;
