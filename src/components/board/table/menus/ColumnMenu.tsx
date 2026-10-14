"use client";

import React, { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import PopoverPanel from "./PopoverPanel";
import ColumnPicker from "./ColumnPicker";
import ColumnTypeIcon from "./ColumnTypeIcon";
import ColumnSettingsPanel, { ButtonSettingsPanel, ColumnValidationPanel, ProgressTrackingSettingsPanel, RatingSettingsPanel, ReminderSettingsPanel, hasValidationRules } from "./ColumnSettingsPanel";
import type { ProgressStatusColumn } from "../progressTracking";
import { ratingIconOf, ratingMaxOf } from "../cells/VoteRatingCells";
import BoardPickerMenu from "./BoardPickerMenu";
import ToggleSwitch from "../../toolbar/ToggleSwitch";
import { boardTreeFontClassName } from "@/components/board/board-tree-font";
import {
  BellIcon,
  ChangeTypeIcon,
  CheckIcon,
  ChevronRightIcon,
  DeleteIcon,
  DuplicateIcon,
  EyeIcon,
  EyeOffIcon,
  FilterIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  SaveAsTemplateIcon,
  SortArrowsIcon,
} from "@/icons/workspace-icons";
import {
  AutomateIcon,
  BoardCopyIcon,
  ButtonColumnIcon,
  CollapseColumnIcon,
  ColumnOptionsIcon,
  CustomizeColumnIcon,
  DependencyIcon,
  DescriptionIcon,
  ExtensionsIcon,
  GroupByIcon,
  RequiredIcon,
  SettingsGearIcon,
  ValidationIcon,
} from "./column-menu-icons";
import { CHANGE_TYPE_TARGETS, COLUMN_TYPE_GALLERY, QUICK_ADD_COLUMN_KINDS, type ColumnTypeDef } from "../constants";
import type { ColumnDef, ColumnKind, ColumnSettingsPatch, ColumnValidation } from "../types";
import "@/components/ui/dropdown/action-menu.css";
import "./column-menu.css";

/** What the menu needs to know about a real column. */
export type ColumnMenuColumn = Pick<ColumnDef, "id" | "kind" | "width"> &
  Partial<
    Pick<
      ColumnDef,
      "options" | "validation" | "aggregation" | "reminder" | "button" | "dependency" | "dependency_date_columns" | "description" | "linkage" | "hide_summary" | "rating_max" | "rating_icon" | "progress_columns"
    >
  > & {
    /** Progress tracking columns only: the Status columns of the same table its settings can pick from. */
    progress_status_columns?: ProgressStatusColumn[];
  };

interface ColumnMenuProps {
  title: string;
  /** Undefined for the item-title/sub-title virtual columns, which get the reduced menu (sort, collapse and rename only). */
  column?: ColumnMenuColumn;
  can_delete: boolean;
  sort_dir: "asc" | "desc" | null;
  is_group_by_eligible: boolean;
  /** "Rename": turns the header title into its inline input. */
  onStartRename: () => void;
  onSort: (direction: "asc" | "desc" | null) => void;
  onUpdateSettings: (patch: ColumnSettingsPatch) => void;
  onEditLabels?: () => void;
  /** Formula columns only: opens the operation/source-columns settings modal. */
  onEditFormula?: () => void;
  /** Mirror columns only: opens the linked-column settings modal. */
  onEditMirror?: () => void;
  /** Connect-board columns only: opens the linked-board settings modal. */
  onEditConnectBoard?: () => void;
  /** Dependency columns only: opens "Set up dependencies between items". */
  onEditDependency?: () => void;
  /** Opens the "Column description" dialog. Omitted for the item-title/sub-title virtual columns. */
  onEditDescription?: () => void;
  has_description?: boolean;
  onRequestFilter: () => void;
  onRequestGroupBy: () => void;
  onCollapseAll: () => void;
  /** `with_values` is "Column and cell values", false is "Column only". */
  onDuplicate: (with_values: boolean) => void;
  /** Undefined for the item-title/sub-title virtual columns, which have no real column to copy onto another board. */
  onDuplicateToBoard?: (target_board_id: string) => void;
  onAddColumnRight: (kind: ColumnKind, label: string, default_width: number) => void;
  onChangeType: (kind: ColumnKind, default_width: number) => void;
  onDelete: () => void;
  onClose: () => void;
  /** Opens the column permissions dialog. Only passed for board owners on a real column. */
  onRequestPermissions?: () => void;
  /** "Automate": opens the automation builder with a trigger for this column. `count` automations already use it. */
  automation?: { count: number; onOpen: () => void };
}

const NOT_AVAILABLE_REASON = "Not available yet";
/** Kinds whose group summary footer shows something, so "Hide column summary" has an effect. */
const SUMMARY_KINDS: ColumnKind[] = ["status", "number", "timeline", "vote", "rating", "progress_tracking"];
const VIEWPORT_MARGIN = 8;
/** The flyout's top edge sits this far above its row, so its first row lines up with the row that opened it. */
const FLYOUT_TOP_OFFSET = 8;
/**
 * Rows sit directly on top of each other while their flyouts render off to the side,
 * so a diagonal mouse move toward a flyout briefly crosses a neighboring row's box.
 * Delaying the switch/close while a flyout is already open gives the cursor time to
 * land on it instead of the hover state flipping mid-transit.
 */
const HOVER_INTENT_DELAY_MS = 250;

const typeDefOf = (kind: ColumnKind): ColumnTypeDef | undefined => COLUMN_TYPE_GALLERY.find((type) => type.kind === kind);

/**
 * Which flyout of one menu level is open. Hover opens one right away when none
 * is open, and switches or closes it after `HOVER_INTENT_DELAY_MS` when one is,
 * so the cursor can cross a neighboring row on its way into the open flyout.
 */
function useSubmenu<K extends string>() {
  const [open_key, setOpenKey] = useState<K | null>(null);
  const timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = () => {
    if (timeout_ref.current === null) return;
    clearTimeout(timeout_ref.current);
    timeout_ref.current = null;
  };

  useEffect(() => clearPending, []);

  const openNow = (next: K | null) => {
    clearPending();
    setOpenKey(next);
  };

  const requestOpen = (next: K | null) => {
    if (open_key === next) return clearPending();
    if (open_key === null) return openNow(next);
    clearPending();
    timeout_ref.current = setTimeout(() => {
      timeout_ref.current = null;
      setOpenKey(next);
    }, HOVER_INTENT_DELAY_MS);
  };

  return { open_key, openNow, requestOpen };
}

const MENU_ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])';

/** The enabled rows of one menu level, leaving out the rows of flyouts nested inside it. */
const levelRows = (list_el: HTMLElement): HTMLElement[] =>
  [...list_el.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)].filter((row) => row.closest('[role="menu"]') === list_el);

interface MenuListProps {
  aria_label: string;
  className?: string;
  /** Focus the first row on mount, when the level was opened from the keyboard. */
  focus_first?: boolean;
  /** ArrowLeft inside a flyout hands focus back to the row that opened it. */
  onExitLeft?: () => void;
  /** Closes (after the hover delay) whatever flyout of this level is open once the cursor leaves it. */
  onMouseLeave?: () => void;
  children: ReactNode;
}

/** One menu level: the `action-menu` card plus arrow key, Home and End navigation between its own rows. */
function MenuList({ aria_label, className = "", focus_first = false, onExitLeft, onMouseLeave, children }: MenuListProps) {
  const list_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list_el = list_ref.current;
    if (!list_el) return;
    // The popover renders hidden on its first frame while it measures itself, and hidden elements can't take focus.
    const frame = requestAnimationFrame(() => {
      if (focus_first) levelRows(list_el)[0]?.focus();
      else if (!onExitLeft) list_el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focus_first, onExitLeft]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const list_el = list_ref.current;
    if (!list_el || (event.target as HTMLElement).closest('[role="menu"]') !== list_el) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      const rows = levelRows(list_el);
      if (rows.length === 0) return;
      event.preventDefault();
      const current_index = rows.indexOf(document.activeElement as HTMLElement);
      const next_index =
        event.key === "Home" ? 0
        : event.key === "End" ? rows.length - 1
        : event.key === "ArrowDown" ? (current_index + 1) % rows.length
        : current_index <= 0 ? rows.length - 1
        : current_index - 1;
      rows[next_index].focus();
      return;
    }
    if (event.key === "ArrowLeft" && onExitLeft) {
      event.preventDefault();
      event.stopPropagation();
      onExitLeft();
    }
  };

  return (
    <div ref={list_ref} role="menu" aria-label={aria_label} tabIndex={-1} onKeyDown={handleKeyDown} onMouseLeave={onMouseLeave} className={`action-menu ${className}`}>
      {children}
    </div>
  );
}

/**
 * Places a flyout next to its row: to the right when it fits in the window, to
 * the left otherwise, and nudged up when it would run past the bottom edge.
 * It stays a DOM child of the row, so clicks in it count as inside the menu.
 */
function Flyout({ children }: { children: ReactNode }) {
  const flyout_ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ side: "left" | "right"; shift_y: number } | null>(null);

  useLayoutEffect(() => {
    const flyout_el = flyout_ref.current;
    const anchor_el = flyout_el?.parentElement;
    if (!flyout_el || !anchor_el) return;

    const measure = () => {
      const anchor_rect = anchor_el.getBoundingClientRect();
      const width = flyout_el.offsetWidth;
      const height = flyout_el.offsetHeight;
      const fits_right = anchor_rect.right + width <= window.innerWidth - VIEWPORT_MARGIN;
      const fits_left = anchor_rect.left - width >= VIEWPORT_MARGIN;
      // A nested flyout keeps going the way its parent went, so it never opens back over the menus behind it.
      const parent_side = anchor_el.parentElement?.closest<HTMLElement>(".column-menu__flyout")?.dataset.side;
      const side = parent_side === "left" ? (fits_left || !fits_right ? "left" : "right") : fits_right || !fits_left ? "right" : "left";
      const natural_top = anchor_rect.top - FLYOUT_TOP_OFFSET;
      const overflow_y = natural_top + height - (window.innerHeight - VIEWPORT_MARGIN);
      const shift_y = overflow_y > 0 ? -Math.round(Math.min(overflow_y, Math.max(0, natural_top - VIEWPORT_MARGIN))) : 0;
      setPlacement((current) => (current?.side === side && current.shift_y === shift_y ? current : { side, shift_y }));
    };

    measure();
    const resize_observer = new ResizeObserver(measure);
    resize_observer.observe(flyout_el);
    window.addEventListener("resize", measure);
    return () => {
      resize_observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div
      ref={flyout_ref}
      className="column-menu__flyout"
      data-side={placement?.side ?? "right"}
      data-measured={placement !== null}
      style={placement?.shift_y ? { transform: `translateY(${placement.shift_y}px)` } : undefined}
    >
      {children}
    </div>
  );
}

interface MenuRowProps {
  label: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  /** Keeps the row visible but faded and inert, with `disabled_reason` as its tooltip. */
  disabled?: boolean;
  disabled_reason?: string;
  danger?: boolean;
  /** Content after the label: a badge, a keyboard hint, a count, a check or a switch. */
  trailing?: ReactNode;
  has_submenu?: boolean;
  is_submenu_open?: boolean;
  role?: "menuitem" | "menuitemcheckbox" | "menuitemradio";
  is_checked?: boolean;
  title?: string;
  onMouseEnter?: () => void;
  onArrowRight?: () => void;
}

const MenuRow = React.forwardRef<HTMLButtonElement, MenuRowProps>(function MenuRow(
  { label, icon, onClick, disabled, disabled_reason, danger, trailing, has_submenu, is_submenu_open, role = "menuitem", is_checked, title, onMouseEnter, onArrowRight },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role={role}
      tabIndex={-1}
      aria-checked={role === "menuitem" ? undefined : !!is_checked}
      aria-disabled={disabled || undefined}
      aria-haspopup={has_submenu ? "menu" : undefined}
      aria-expanded={has_submenu ? !!is_submenu_open : undefined}
      data-danger={danger || undefined}
      data-submenu-open={is_submenu_open || undefined}
      title={disabled ? disabled_reason : title}
      className="action-menu__item"
      onMouseEnter={onMouseEnter}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" && has_submenu && !disabled && onArrowRight) {
          event.preventDefault();
          event.stopPropagation();
          onArrowRight();
        }
      }}
      onClick={() => {
        if (!disabled) onClick?.();
      }}
    >
      {icon && (
        <span className="action-menu__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="action-menu__label">{label}</span>
      {trailing}
      {has_submenu && (
        <span className="action-menu__chevron" aria-hidden="true">
          <ChevronRightIcon size={14} />
        </span>
      )}
    </button>
  );
});

interface SubmenuRowProps<K extends string> extends Omit<MenuRowProps, "has_submenu" | "is_submenu_open" | "onMouseEnter" | "onArrowRight" | "onClick"> {
  submenu_key: K;
  submenu: ReturnType<typeof useSubmenu<K>>;
  /** The flyout's content, usually a `MenuList` or one of the settings forms. */
  renderFlyout: (focus_first: boolean, onExitLeft: () => void) => ReactNode;
}

/** A row that opens a side flyout on hover, click or ArrowRight. */
function SubmenuRow<K extends string>({ submenu_key, submenu, renderFlyout, disabled, ...row_props }: SubmenuRowProps<K>) {
  const row_ref = useRef<HTMLButtonElement>(null);
  const [focus_first, setFocusFirst] = useState(false);
  const is_open = submenu.open_key === submenu_key && !disabled;

  const open = (from_keyboard: boolean) => {
    setFocusFirst(from_keyboard);
    submenu.openNow(submenu_key);
  };

  return (
    <div className="column-menu__anchor" onMouseEnter={() => !disabled && submenu.requestOpen(submenu_key)}>
      <MenuRow
        {...row_props}
        ref={row_ref}
        disabled={disabled}
        has_submenu
        is_submenu_open={is_open}
        onClick={() => (is_open ? submenu.openNow(null) : open(false))}
        onArrowRight={() => open(true)}
      />
      {is_open && (
        <Flyout>
          {renderFlyout(focus_first, () => {
            submenu.openNow(null);
            row_ref.current?.focus();
          })}
        </Flyout>
      )}
    </div>
  );
}

/** The colored square monday.com shows next to each column type. */
function ColumnTypeChip({ type }: { type: ColumnTypeDef }) {
  return <ColumnTypeIcon kind={type.kind} glyph={type.glyph} accent={type.accent} />;
}

const Divider = () => <div className="action-menu__divider" role="separator" />;

type MainSub = "settings" | "sort" | "duplicate" | "add" | "type";
type SettingsSub = "button" | "progress" | "rating" | "reminder" | "validation" | "options";
type NestedSub = "board" | "more";

/**
 * The column header's "..." menu, styled after monday.com's own column menu:
 * Settings (with the column's own settings forms nested inside), Filter, Sort,
 * Collapse, Group by, Duplicate, Add column to the right, Change column type,
 * Rename and Delete, grouped by dividers. Rows open their flyouts on hover,
 * click or ArrowRight, and every flyout flips to the left near the window edge.
 */
export default function ColumnMenu({
  title, column, can_delete, sort_dir, is_group_by_eligible,
  onStartRename, onSort, onUpdateSettings, onEditLabels, onEditFormula, onEditMirror, onEditConnectBoard, onEditDependency, onEditDescription, has_description, onRequestFilter, onRequestGroupBy, onCollapseAll,
  onDuplicate, onDuplicateToBoard, onAddColumnRight, onChangeType, onDelete, onClose, onRequestPermissions, automation,
}: ColumnMenuProps) {
  const main_sub = useSubmenu<MainSub>();
  const settings_sub = useSubmenu<SettingsSub>();
  const nested_sub = useSubmenu<NestedSub>();
  const [gallery_query, setGalleryQuery] = useState("");

  // A nested flyout never outlives its parent, so reopening Settings starts with nothing expanded.
  useEffect(() => {
    settings_sub.openNow(null);
    nested_sub.openNow(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main_sub.open_key]);

  /** Runs a row's action and closes the whole menu. */
  const run = (action: () => void) => () => {
    action();
    onClose();
  };

  const kind_label = column ? typeDefOf(column.kind)?.label ?? "this" : "this";
  const quick_add_types = QUICK_ADD_COLUMN_KINDS.map(typeDefOf).filter((type): type is ColumnTypeDef => !!type);
  const change_type_targets = column ? (CHANGE_TYPE_TARGETS[column.kind] ?? []).map(typeDefOf).filter((type): type is ColumnTypeDef => !!type) : [];

  /** "Customize ... column": whatever editor this kind has, a dialog or a nested form. */
  const renderCustomizeRow = () => {
    if (!column) return null;
    const label = `Customize ${kind_label} column`;
    const icon = <CustomizeColumnIcon />;
    if (column.kind === "button") {
      return (
        <SubmenuRow
          submenu_key="button"
          submenu={settings_sub}
          icon={<ButtonColumnIcon />}
          label={label}
          renderFlyout={() => <ButtonSettingsPanel button={column.button} fallback_label="Click me" onSave={(button) => { onUpdateSettings({ button }); onClose(); }} />}
        />
      );
    }
    if (column.kind === "rating") {
      return (
        <SubmenuRow
          submenu_key="rating"
          submenu={settings_sub}
          icon={icon}
          label={label}
          renderFlyout={() => <RatingSettingsPanel rating_max={ratingMaxOf(column)} rating_icon={ratingIconOf(column)} onChange={(patch) => onUpdateSettings(patch)} />}
        />
      );
    }
    if (column.kind === "progress_tracking") {
      return (
        <SubmenuRow
          submenu_key="progress"
          submenu={settings_sub}
          icon={icon}
          label={label}
          renderFlyout={() => (
            <ProgressTrackingSettingsPanel
              status_columns={column.progress_status_columns ?? []}
              progress_columns={column.progress_columns}
              onSave={(progress_columns) => {
                onUpdateSettings({ progress_columns });
                onClose();
              }}
            />
          )}
        />
      );
    }
    if (column.kind === "dependency") {
      if (!onEditDependency) return null;
      return <MenuRow icon={<DependencyIcon />} label={label} onMouseEnter={() => settings_sub.requestOpen(null)} onClick={run(onEditDependency)} />;
    }
    const open_editor = onEditLabels ?? (column.kind === "formula" ? onEditFormula : column.kind === "mirror" ? onEditMirror : column.kind === "connect_board" ? onEditConnectBoard : undefined);
    if (!open_editor) return null;
    return <MenuRow icon={icon} label={label} onMouseEnter={() => settings_sub.requestOpen(null)} onClick={run(open_editor)} />;
  };

  const renderSettingsFlyout = (focus_first: boolean, onExitLeft: () => void) => {
    if (!column) return null;
    const validation = column.validation;
    const is_required = !!validation?.required;
    const is_summary_hidden = !!column.hide_summary;
    const updateValidation = (patch: Partial<ColumnValidation>) => onUpdateSettings({ validation: { ...validation, ...patch } });
    const restrict_reason = "Only board owners can restrict this column";

    return (
      <MenuList aria_label="Column settings" className="w-[272px]" focus_first={focus_first} onExitLeft={onExitLeft} onMouseLeave={() => settings_sub.requestOpen(null)}>
          {renderCustomizeRow()}
          {onEditDescription && (
            <MenuRow
              icon={<DescriptionIcon />}
              label={has_description ? "Edit column description" : "Add column description"}
              onMouseEnter={() => settings_sub.requestOpen(null)}
              onClick={run(onEditDescription)}
            />
          )}
          {column.kind === "date" && (
            <SubmenuRow
              submenu_key="reminder"
              submenu={settings_sub}
              icon={<BellIcon size={16} />}
              label="Set due date reminder"
              renderFlyout={() => <ReminderSettingsPanel reminder={column.reminder} onChange={(reminder) => onUpdateSettings({ reminder })} />}
            />
          )}

          <Divider />
          <MenuRow
            role="menuitemcheckbox"
            is_checked={is_required}
            icon={<RequiredIcon />}
            label="Set column as required"
            title={is_required ? "New items need a value in this column" : undefined}
            trailing={<ToggleSwitch is_on={is_required} size="sm" />}
            onMouseEnter={() => settings_sub.requestOpen(null)}
            onClick={() => updateValidation({ required: !is_required })}
          />
          {hasValidationRules(column.kind) && (
            <SubmenuRow
              submenu_key="validation"
              submenu={settings_sub}
              icon={<ValidationIcon />}
              label="Set column validation"
              trailing={<span className="column-menu__badge">New</span>}
              renderFlyout={() => <ColumnValidationPanel kind={column.kind} validation={validation} onChange={updateValidation} />}
            />
          )}

          <Divider />
          <MenuRow
            icon={<LockIcon size={16} />}
            label="Restrict column editing"
            disabled={!onRequestPermissions}
            disabled_reason={restrict_reason}
            onMouseEnter={() => settings_sub.requestOpen(null)}
            onClick={onRequestPermissions ? run(onRequestPermissions) : undefined}
          />
          <MenuRow
            icon={<EyeOffIcon size={16} />}
            label="Restrict column view"
            disabled={!onRequestPermissions}
            disabled_reason={restrict_reason}
            onMouseEnter={() => settings_sub.requestOpen(null)}
            onClick={onRequestPermissions ? run(onRequestPermissions) : undefined}
          />

          <Divider />
          {SUMMARY_KINDS.includes(column.kind) && (
            <MenuRow
              icon={is_summary_hidden ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
              label={is_summary_hidden ? "Show column summary" : "Hide column summary"}
              onMouseEnter={() => settings_sub.requestOpen(null)}
              onClick={run(() => onUpdateSettings({ hide_summary: !is_summary_hidden }))}
            />
          )}
          <SubmenuRow
            submenu_key="options"
            submenu={settings_sub}
            icon={<ColumnOptionsIcon />}
            label="Column options"
            renderFlyout={() => (
              <ColumnSettingsPanel
                width={column.width}
                hideable
                pinnable
                kind={column.kind}
                aggregation={column.aggregation}
                onWidthChange={(width) => onUpdateSettings({ width })}
                onHideableChange={(value) => onUpdateSettings({ hideable: value })}
                onPinnableChange={(value) => onUpdateSettings({ pinnable: value })}
                onAggregationChange={(aggregation) => onUpdateSettings({ aggregation })}
              />
            )}
          />
          <MenuRow
            icon={<SaveAsTemplateIcon size={16} />}
            label="Save column as a template"
            disabled
            disabled_reason={NOT_AVAILABLE_REASON}
            onMouseEnter={() => settings_sub.requestOpen(null)}
          />
      </MenuList>
    );
  };

  const renderSortFlyout = (focus_first: boolean, onExitLeft: () => void) => (
    <MenuList aria_label="Sort" className="w-[264px]" focus_first={focus_first} onExitLeft={onExitLeft}>
      <MenuRow
        role="menuitemradio"
        is_checked={sort_dir === "asc"}
        label="Sort ascending"
        trailing={sort_dir === "asc" && <span className="column-menu__check"><CheckIcon size={14} /></span>}
        onClick={() => onSort(sort_dir === "asc" ? null : "asc")}
      />
      <MenuRow
        role="menuitemradio"
        is_checked={sort_dir === "desc"}
        label="Sort descending"
        trailing={sort_dir === "desc" && <span className="column-menu__check"><CheckIcon size={14} /></span>}
        onClick={() => onSort(sort_dir === "desc" ? null : "desc")}
      />
      {sort_dir && <MenuRow label="Remove sort" onClick={() => onSort(null)} />}
      <Divider />
      <MenuRow label="Add subsort" trailing={<span className="column-menu__hint">Ctrl+Click</span>} disabled disabled_reason={NOT_AVAILABLE_REASON} />
      <MenuRow label="Save order of items" disabled disabled_reason={NOT_AVAILABLE_REASON} />
    </MenuList>
  );

  const renderDuplicateFlyout = (focus_first: boolean, onExitLeft: () => void) => (
    <MenuList aria_label="Duplicate column" className="w-[248px]" focus_first={focus_first} onExitLeft={onExitLeft} onMouseLeave={() => nested_sub.requestOpen(null)}>
        <MenuRow label="Column only" onMouseEnter={() => nested_sub.requestOpen(null)} onClick={run(() => onDuplicate(false))} />
        <MenuRow label="Column and cell values" onMouseEnter={() => nested_sub.requestOpen(null)} onClick={run(() => onDuplicate(true))} />
        {onDuplicateToBoard && (
          <>
            <Divider />
            <SubmenuRow
              submenu_key="board"
              submenu={nested_sub}
              icon={<BoardCopyIcon />}
              label="Duplicate to another board"
              renderFlyout={() => (
                <div className="action-menu p-0">
                  <BoardPickerMenu inline onPick={(target_board_id) => { onDuplicateToBoard(target_board_id); onClose(); }} onClose={() => nested_sub.openNow(null)} />
                </div>
              )}
            />
          </>
        )}
    </MenuList>
  );

  const renderAddFlyout = (focus_first: boolean, onExitLeft: () => void) => (
    <MenuList aria_label="Add column to the right" className="w-[264px]" focus_first={focus_first} onExitLeft={onExitLeft} onMouseLeave={() => nested_sub.requestOpen(null)}>
        {quick_add_types.map((type) => (
          <MenuRow
            key={type.kind}
            icon={<ColumnTypeChip type={type} />}
            label={type.label}
            onMouseEnter={() => nested_sub.requestOpen(null)}
            onClick={run(() => onAddColumnRight(type.kind, type.label, type.default_width))}
          />
        ))}
        <Divider />
        <SubmenuRow
          submenu_key="more"
          submenu={nested_sub}
          label="More columns"
          renderFlyout={() => (
            <ColumnPicker
              inline
              query={gallery_query}
              onQueryChange={setGalleryQuery}
              onPick={(type) => { onAddColumnRight(type.kind, type.label, type.default_width); onClose(); }}
              onClose={() => nested_sub.openNow(null)}
            />
          )}
        />
    </MenuList>
  );

  const renderChangeTypeFlyout = (focus_first: boolean, onExitLeft: () => void) => (
    <MenuList aria_label="Change column type" className="w-[264px]" focus_first={focus_first} onExitLeft={onExitLeft}>
      <div className="column-menu__heading" aria-hidden="true">
        Change <strong>{kind_label}</strong> column to:
      </div>
      {change_type_targets.length === 0 && <div className="column-menu__empty">This column type can&apos;t be changed.</div>}
      {change_type_targets.map((type) => (
        <MenuRow key={type.kind} icon={<ColumnTypeChip type={type} />} label={type.label} onClick={run(() => onChangeType(type.kind, type.default_width))} />
      ))}
    </MenuList>
  );

  return (
    <PopoverPanel onClose={onClose} fit="shift" unstyled className="left-1/2 top-full mt-1 w-[256px] -translate-x-1/2">
      <div
        className={`column-menu ${boardTreeFontClassName}`}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <MenuList aria_label={`${title} column options`} onMouseLeave={() => main_sub.requestOpen(null)}>
            {column && (
              <>
                <SubmenuRow submenu_key="settings" submenu={main_sub} icon={<SettingsGearIcon />} label="Settings" renderFlyout={renderSettingsFlyout} />
                {automation && (
                  <MenuRow
                    icon={<AutomateIcon />}
                    label="Automate"
                    trailing={automation.count > 0 && <span className="column-menu__count" title={`${automation.count} automation(s) use this column`}>{automation.count}</span>}
                    onMouseEnter={() => main_sub.requestOpen(null)}
                    onClick={run(automation.onOpen)}
                  />
                )}
                <Divider />
                <MenuRow icon={<FilterIcon size={16} />} label="Filter" onMouseEnter={() => main_sub.requestOpen(null)} onClick={run(onRequestFilter)} />
              </>
            )}
            <SubmenuRow submenu_key="sort" submenu={main_sub} icon={<SortArrowsIcon size={16} />} label="Sort" renderFlyout={renderSortFlyout} />
            <MenuRow icon={<CollapseColumnIcon />} label="Collapse all groups" onMouseEnter={() => main_sub.requestOpen(null)} onClick={run(onCollapseAll)} />
            {column && (
              <MenuRow
                icon={<GroupByIcon />}
                label="Group by"
                disabled={!is_group_by_eligible}
                disabled_reason="Only Status and Label columns with labels can group the board"
                onMouseEnter={() => main_sub.requestOpen(null)}
                onClick={run(onRequestGroupBy)}
              />
            )}

            {column && (
              <>
                <Divider />
                <SubmenuRow submenu_key="duplicate" submenu={main_sub} icon={<DuplicateIcon size={16} />} label="Duplicate column" renderFlyout={renderDuplicateFlyout} />
                <SubmenuRow submenu_key="add" submenu={main_sub} icon={<PlusIcon size={16} />} label="Add column to the right" renderFlyout={renderAddFlyout} />
                <SubmenuRow submenu_key="type" submenu={main_sub} icon={<ChangeTypeIcon size={16} />} label="Change column type" renderFlyout={renderChangeTypeFlyout} />

                <Divider />
                <MenuRow
                  icon={<ExtensionsIcon />}
                  label="Column extensions"
                  has_submenu
                  disabled
                  disabled_reason="Coming soon"
                  onMouseEnter={() => main_sub.requestOpen(null)}
                />
              </>
            )}

            <Divider />
            <MenuRow icon={<PencilIcon size={16} />} label="Rename" onMouseEnter={() => main_sub.requestOpen(null)} onClick={run(onStartRename)} />
            {column && can_delete && (
              <MenuRow icon={<DeleteIcon size={16} />} label="Delete" onMouseEnter={() => main_sub.requestOpen(null)} onClick={run(onDelete)} />
            )}
        </MenuList>
      </div>
    </PopoverPanel>
  );
}
