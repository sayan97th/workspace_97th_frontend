"use client";

import { useEffect, useState } from "react";
import type { CellFile, CellFileSource, CellValue, ChecklistItemValue, ColumnDef, LinkValue, TimeTrackingValue } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { contrastFg, findDef, timelineFillBackground } from "../colorUtils";
import { encodeRangeValue, fmtDate, fmtDateWithWeekday, fmtRange, isPastDate, parseRangeValue, rangeDayCount, rangeElapsedRatio } from "../dateUtils";
import { collectColumnValues, findNode } from "../treeUtils";
import { computeFormulaOutcome, formulaResultType } from "../formulaUtils";
import AvatarBadge from "../menus/AvatarBadge";
import ButtonSetupPopover from "../menus/ButtonSetupPopover";
import StatusMenu from "../menus/StatusMenu";
import LabelMenu, { LabelPill } from "../menus/LabelMenu";
import PeopleMenu from "../menus/PeopleMenu";
import DateMenu from "../menus/DateMenu";
import TimelineMenu from "../menus/TimelineMenu";
import ProgressMenu from "../menus/ProgressMenu";
import DropdownMenu from "../menus/DropdownMenu";
import DropdownCellChips from "./DropdownCellChips";
import TagsMenu from "../menus/TagsMenu";
import { formatTagLabel, tagSearchKey } from "../tagLabels";
import { PlusIcon } from "@/icons/board-icons";
import { openSearchEverything } from "@/layout/shell-events";
import LinkMenu from "../menus/LinkMenu";
import FilesMenu from "../menus/FilesMenu";
import FileLinkModal from "../menus/FileLinkModal";
import WebcamCaptureModal from "../menus/WebcamCaptureModal";
import CellHyperlink from "./CellHyperlink";
import ConnectItemsCell from "./ConnectItemsCell";
import MirrorCell from "./MirrorCell";
import { RatingCell, VoteCell } from "./VoteRatingCells";
import { ProgressTrackingCell } from "./ProgressTrackingCells";
import DependencyCell from "./DependencyCell";
import ChecklistMenu from "../menus/ChecklistMenu";
import { containsSearchQuery, highlightSearchMatches } from "../searchHighlight";
import {
  ColorPickerCell,
  CountryCell,
  CreationLogCell,
  DocCell,
  HourCell,
  ItemNumberCell,
  LastUpdatedCell,
  WeekCell,
  type ColumnCenterCellProps,
} from "./ColumnCenterCells";
import { LocationCell, PhoneCell, WorldClockCell } from "./ClockPhoneLocationCells";

/** People cell avatar stack, monday style: up to three 28px avatars, then a "+N" bubble. */
const PEOPLE_CELL_MAX_AVATARS = 3;
const PEOPLE_CELL_AVATAR_SIZE = 28;
/** How far each stacked avatar tucks under the previous one, matches `AvatarBadge`'s own overlap. */
const PEOPLE_CELL_OVERLAP = Math.round(PEOPLE_CELL_AVATAR_SIZE * 0.27);

interface CellRendererProps {
  node_id: string;
  column: ColumnDef;
  values: Record<string, CellValue>;
  /** The row's own name, read by a formula column's `{Item}` reference. */
  node_name?: string;
  state: BoardTableState;
  actions: BoardTableActions;
  /** The row's group color, which fills a set Timeline pill like monday.com does. Falls back to the accent color. */
  group_color?: string;
}

function asString(v: CellValue): string {
  return typeof v === "string" ? v : "";
}
/** Narrows to `string[]` for the array-valued kinds (people/dropdown/tags). `CellValue`'s other array member, `CellFile[]`, only ever reaches a `files` column's own branch, which reads it separately. */
function asArray(v: CellValue): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

export default function CellRenderer({ node_id, column, values, node_name, state, actions, group_color }: CellRendererProps) {
  const scope_key = `${node_id}:${column.id}`;
  const is_menu_open = state.open_cell_menu_key === scope_key;
  const value = values[column.id];
  const openMenu = () => actions.openCellMenu(scope_key);

  // Time Tracking's live-ticking elapsed display, while its timer is running
  // — declared unconditionally (Rules of Hooks) even though it's only ever
  // read by the "time_tracking" branch below.
  const running_since = column.kind === "time_tracking" ? (value as TimeTrackingValue | undefined)?.running_since ?? null : null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running_since) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running_since]);

  // Files cell's own "Upload" and "Doc" in-flight state, so the popover can
  // disable its options and show a progress label while a request is pending,
  // plus the last failure's message, which link dialog is open (by source) and
  // whether the webcam dialog is open.
  const [is_uploading, setIsUploading] = useState(false);
  const [is_creating_doc, setIsCreatingDoc] = useState(false);
  const [upload_error, setUploadError] = useState<string | null>(null);
  const [file_link_source, setFileLinkSource] = useState<CellFileSource | null>(null);
  const [is_webcam_open, setIsWebcamOpen] = useState(false);

  // Text cell: whether it was clicked out of its search highlighted display into the input.
  const [is_text_editing, setIsTextEditing] = useState(false);

  // Button cell: in flight while its press runs, then the result flashes on it for a moment.
  const [is_pressing, setIsPressing] = useState(false);
  const [press_feedback, setPressFeedback] = useState<string | null>(null);
  useEffect(() => {
    if (!press_feedback) return;
    const timer = setTimeout(() => setPressFeedback(null), 2600);
    return () => clearTimeout(timer);
  }, [press_feedback]);

  // The Column Center types each own a small component (with its own hooks), see `ColumnCenterCells`.
  const center_props: ColumnCenterCellProps = { node_id, column, value, node_name, state, actions, is_menu_open, openMenu };
  switch (column.kind) {
    case "country":
      return <CountryCell {...center_props} />;
    case "world_clock":
      return <WorldClockCell {...center_props} />;
    case "week":
      return <WeekCell {...center_props} />;
    case "hour":
      return <HourCell {...center_props} />;
    case "color_picker":
      return <ColorPickerCell {...center_props} />;
    case "location":
      return <LocationCell {...center_props} />;
    case "phone":
      return <PhoneCell {...center_props} />;
    case "doc":
      return <DocCell {...center_props} />;
    case "creation_log":
      return <CreationLogCell {...center_props} />;
    case "last_updated":
      return <LastUpdatedCell {...center_props} />;
    case "item_number":
      return <ItemNumberCell {...center_props} />;
    case "progress_tracking":
      return <ProgressTrackingCell node_id={node_id} column={column} values={values} state={state} />;
  }

  if (column.kind === "text" || column.kind === "email") {
    // While the board is searched, a matching cell shows its text with the match highlighted
    // (an input can't), and turns back into the input as soon as it is clicked.
    if (!is_text_editing && containsSearchQuery(asString(value), state.search_query)) {
      return (
        <button
          type="button"
          onClick={() => setIsTextEditing(true)}
          title={asString(value)}
          className="h-full w-full min-w-0 truncate px-3 text-left font-[inherit] text-board-cell text-boardtree-text"
        >
          {highlightSearchMatches(asString(value), state.search_query)}
        </button>
      );
    }
    return (
      <input
        autoFocus={is_text_editing}
        value={asString(value)}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value)}
        onBlur={() => setIsTextEditing(false)}
        title={asString(value)}
        className="h-full w-full min-w-0 truncate bg-transparent px-3 font-[inherit] text-board-cell text-boardtree-text outline-none"
      />
    );
  }

  if (column.kind === "longtext") {
    return (
      <textarea
        value={asString(value)}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value)}
        placeholder="Add text"
        title={asString(value)}
        className="box-border h-full w-full min-w-0 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-3 py-1.5 font-[inherit] text-board-cell leading-[15px] text-boardtree-text-secondary outline-none"
      />
    );
  }

  if (column.kind === "number") {
    // Automations and imports store a JSON number, the cell editor stores text, both read the same.
    const number_text = typeof value === "number" ? String(value) : asString(value);
    return (
      <input
        inputMode="numeric"
        value={number_text}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value.replace(/[^0-9.-]/g, ""))}
        title={number_text}
        className="h-full w-full truncate bg-transparent px-2.5 text-center text-board-cell text-boardtree-text tabular-nums outline-none"
      />
    );
  }

  if (column.kind === "checkbox") {
    const checked = value === true;
    return (
      <button type="button" onClick={() => actions.setCellValue(node_id, column.id, !checked)} className="flex h-full w-full items-center justify-center">
        {checked ? (
          <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[4px] bg-boardtree-accent">
            <svg viewBox="0 0 14 14" width="11" height="11"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </span>
        ) : (
          <span className="h-[17px] w-[17px] rounded-[4px] border-[1.5px] border-boardtree-border bg-boardtree-surface" />
        )}
      </button>
    );
  }

  if (column.kind === "status") {
    const defs = column.options ?? state.status_defs;
    const def = findDef(defs, asString(value));
    const bg = def?.color || "#c9ccd4";
    return (
      <div className="relative flex-1">
        <button type="button" onClick={openMenu} title={def?.label ?? asString(value)} className="flex h-full w-full min-w-0 items-center justify-center px-2 text-board-cell" style={{ background: bg, color: contrastFg(bg) }}>
          <span className="truncate">{def?.label ?? asString(value)}</span>
        </button>
        {is_menu_open && (
          <StatusMenu
            status_defs={defs}
            selected_id={def?.id ?? null}
            onPick={(id) => actions.setCellValue(node_id, column.id, id)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            option_actions={
              column.options
                ? {
                    onRename: (id, label) => actions.renameColumnOption(column.id, id, label),
                    onRecolor: (id, color) => actions.recolorColumnOption(column.id, id, color),
                    onDelete: (id) => actions.deleteColumnOption(column.id, id),
                    onToggleActive: (id) => actions.toggleColumnOptionActive(column.id, id),
                    onSetDescription: (id, description) => actions.setColumnOptionDescription(column.id, id, description),
                    onReorder: (ordered_ids) => actions.reorderColumnOptions(column.id, ordered_ids),
                  }
                : {
                    onRename: actions.renameStatusDef,
                    onRecolor: actions.setStatusDefColor,
                    onDelete: actions.deleteStatusDef,
                    onToggleActive: actions.toggleStatusDefActive,
                    onSetDescription: actions.setStatusDefDescription,
                    onReorder: actions.reorderStatusDefs,
                  }
            }
            used_option_ids={collectColumnValues(state.groups, column.id)}
            onCreateOption={
              column.options
                ? (option) => actions.addColumnOption(column.id, option)
                : (option) => actions.addStatusDef(option)
            }
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "label") {
    const defs = column.options ?? state.label_defs;
    const def = findDef(defs, asString(value));
    return (
      <div className="relative flex-1">
        <button type="button" onClick={openMenu} title={def?.description || def?.label} className="flex h-full w-full min-w-0 items-center justify-center px-2">
          {def?.label && <LabelPill label={def.label} color={def.color} is_inactive={def.is_active === false} />}
        </button>
        {is_menu_open && (
          <LabelMenu
            label_defs={defs}
            selected_id={def?.id ?? null}
            onPick={(id) => actions.setCellValue(node_id, column.id, id)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
            onCreateAndSelect={
              column.options
                ? (option) => actions.createColumnOptionOnCell(node_id, column.id, option, "set")
                : (option) => actions.createLabelDefOnCell(node_id, column.id, option)
            }
            onAddOption={column.options ? (option) => actions.addColumnOption(column.id, option) : (option) => actions.addLabelDef(option)}
            option_actions={
              column.options
                ? {
                    onRename: (id, label) => actions.renameColumnOption(column.id, id, label),
                    onRecolor: (id, color) => actions.recolorColumnOption(column.id, id, color),
                    onDelete: (id) => actions.deleteColumnOption(column.id, id),
                    onToggleActive: (id) => actions.toggleColumnOptionActive(column.id, id),
                    onSetDescription: (id, description) => actions.setColumnOptionDescription(column.id, id, description),
                    onReorder: (ordered_ids) => actions.reorderColumnOptions(column.id, ordered_ids),
                  }
                : {
                    onRename: actions.renameLabelDef,
                    onRecolor: actions.setLabelDefColor,
                    onDelete: actions.deleteLabelDef,
                    onToggleActive: actions.toggleLabelDefActive,
                    onSetDescription: actions.setLabelDefDescription,
                    onReorder: actions.reorderLabelDefs,
                  }
            }
            used_option_ids={collectColumnValues(state.groups, column.id)}
          />
        )}
      </div>
    );
  }

  if (column.kind === "date") {
    const iso = asString(value);
    return (
      <div className="relative flex-1">
        {/* While the picker is open the cell reads like monday's: "Fri, Sep 18" plus a red alert when the date has passed. */}
        <button
          type="button"
          onClick={openMenu}
          title={iso ? fmtDate(iso) : undefined}
          className="flex h-full w-full min-w-0 items-center justify-center gap-1.5 px-2 text-board-cell text-boardtree-text"
        >
          {is_menu_open && isPastDate(iso) && (
            <svg viewBox="0 0 16 16" width="15" height="15" className="shrink-0 text-[#d83a52]" aria-label="Past date">
              <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.75 V8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.1" r="0.85" fill="currentColor" />
            </svg>
          )}
          <span className="truncate">{iso ? (is_menu_open ? fmtDateWithWeekday(iso) : fmtDate(iso)) : ""}</span>
        </button>
        {is_menu_open && (
          <DateMenu
            selected_iso={iso}
            onPick={(picked) => actions.setCellValue(node_id, column.id, picked)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "timeline") {
    const { start_iso, end_iso } = parseRangeValue(value);
    const range_label = start_iso ? fmtRange(start_iso, end_iso || start_iso) : "";
    // On hover a set pill trades its dates for the range length ("7d") and an empty one reads "Set Dates", like monday.com.
    const hover_label = start_iso ? `${rangeDayCount(start_iso, end_iso)}d` : "Set Dates";
    return (
      <div className="relative flex flex-1 items-center px-3">
        <button
          type="button"
          onClick={openMenu}
          title={range_label || undefined}
          aria-label={range_label ? `Timeline ${range_label}` : "Set dates"}
          className="group/timeline relative flex h-6 w-full min-w-0 items-center justify-center rounded-full px-2 text-board-cell text-white transition-[filter] duration-150 hover:brightness-90"
          style={{
            background: start_iso
              ? timelineFillBackground(group_color ?? "var(--color-boardtree-accent)", rangeElapsedRatio(start_iso, end_iso))
              : "var(--color-boardtree-empty)",
          }}
        >
          <span className="truncate group-hover/timeline:invisible">{range_label || "-"}</span>
          <span className="invisible absolute inset-0 flex items-center justify-center truncate px-2 group-hover/timeline:visible">{hover_label}</span>
        </button>
        {is_menu_open && (
          <TimelineMenu
            start_iso={start_iso}
            end_iso={end_iso}
            onChange={(s, e) => actions.setCellValue(node_id, column.id, encodeRangeValue(s, e))}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "people") {
    const owner_ids = asArray(value);
    return (
      <div className="relative flex-1">
        <button type="button" onClick={openMenu} className="flex h-full w-full items-center justify-center" aria-label="Assign people">
          {/* The left padding offsets the first avatar's overlap margin, so the stack stays centered. */}
          <div className="flex items-center" style={{ paddingLeft: PEOPLE_CELL_OVERLAP }}>
            {owner_ids.slice(0, PEOPLE_CELL_MAX_AVATARS).map((id) => {
              const person = state.people.find((p) => p.id === id);
              return (
                <AvatarBadge
                  key={id}
                  size={PEOPLE_CELL_AVATAR_SIZE}
                  initials={person?.initials || id}
                  color={person?.color || "#9aa0b6"}
                  name={person?.name}
                  avatar_url={person?.avatar_url}
                  is_deactivated={person?.is_deactivated}
                />
              );
            })}
            {owner_ids.length > PEOPLE_CELL_MAX_AVATARS && (
              <div
                className="flex flex-none items-center justify-center rounded-full border-2 border-boardtree-surface bg-boardtree-hover-strong text-[11px] font-medium leading-none text-boardtree-text"
                style={{ width: PEOPLE_CELL_AVATAR_SIZE, height: PEOPLE_CELL_AVATAR_SIZE, marginLeft: -PEOPLE_CELL_OVERLAP }}
                title={owner_ids
                  .slice(PEOPLE_CELL_MAX_AVATARS)
                  .map((id) => state.people.find((p) => p.id === id)?.name ?? id)
                  .join(", ")}
              >
                +{owner_ids.length - PEOPLE_CELL_MAX_AVATARS}
              </div>
            )}
            {owner_ids.length === 0 && (
              // Empty person placeholder, an outlined avatar like monday.com's.
              <div
                className="flex items-center justify-center text-boardtree-control-border"
                style={{ marginLeft: -PEOPLE_CELL_OVERLAP }}
                aria-label="No one assigned"
              >
                <svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
                  <circle cx="13" cy="13" r="12.25" fill="var(--color-boardtree-surface)" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="13" cy="10.4" r="3.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5.6 21.4 a8.2 6.6 0 0 1 14.8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
        </button>
        {is_menu_open && (
          <PeopleMenu
            people={state.people}
            selected={owner_ids}
            query={state.people_query}
            onQueryChange={actions.setPeopleQuery}
            onSave={(person_ids) => {
              // One write (and one undo step) for the whole confirmed selection, instead of one per tick.
              actions.setCellValue(node_id, column.id, person_ids.length ? person_ids : null);
              actions.closeCellMenu();
            }}
            onClose={actions.closeCellMenu}
            notify_on_assignment={column.notify_on_assignment}
            onToggleNotifyOnAssignment={() => actions.toggleColumnNotifyOnAssignment(column.id)}
          />
        )}
      </div>
    );
  }

  if (column.kind === "progress") {
    const pct = Number(asString(value) || 0);
    const bar_color = pct >= 100 ? "#12c46b" : pct > 0 ? "#f2a53c" : "var(--color-boardtree-track)";
    return (
      <div className="relative flex flex-1 items-center gap-2 px-3.5">
        <button type="button" onClick={openMenu} className="flex flex-1 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-boardtree-track">
            <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: bar_color }} />
          </div>
          <div className="w-8 flex-none text-right font-mono text-[10.5px] text-boardtree-text-muted">{pct}%</div>
        </button>
        {is_menu_open && (
          <ProgressMenu
            value={pct}
            onChange={(v) => actions.setCellValue(node_id, column.id, String(v))}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "dropdown") {
    // Never falls back to the shared `label_defs` palette (unlike `label`
    // below), every dropdown column owns its own, independent option list,
    // starting empty, so two dropdown columns never show/edit the same set.
    const defs = column.options ?? [];
    const selected = asArray(value);
    const selected_labels = selected.map((entry) => findDef(defs, entry) ?? { id: entry, label: entry, color: "" });
    // `overflow-hidden` stays on the chips (inside the button), not the wrapping
    // div, where it would also clip `DropdownMenu`, which renders as that div's
    // other child and needs to overflow past the cell's edges.
    return (
      <div className="relative flex min-w-0 flex-1 items-center px-2">
        {/* `h-full` keeps the button clickable when there are no chips yet. */}
        <button type="button" onClick={openMenu} className="flex h-full min-w-0 flex-1 items-center overflow-hidden">
          <DropdownCellChips labels={selected_labels} />
        </button>
        {is_menu_open && (
          <DropdownMenu
            options={defs}
            selected={selected}
            onToggle={(id) => actions.toggleArrayValue(node_id, column.id, id)}
            onClear={() => actions.setCellValue(node_id, column.id, null)}
            onClose={actions.closeCellMenu}
            onCreateAndSelect={(option) => actions.createColumnOptionOnCell(node_id, column.id, option)}
            onAddOption={(option) => actions.addColumnOption(column.id, option)}
            option_actions={{
              onRename: (id, label) => actions.renameColumnOption(column.id, id, label),
              onRecolor: (id, color) => actions.recolorColumnOption(column.id, id, color),
              onDelete: (id) => actions.deleteColumnOption(column.id, id),
              onToggleActive: (id) => actions.toggleColumnOptionActive(column.id, id),
              onSetDescription: (id, description) => actions.setColumnOptionDescription(column.id, id, description),
              onReorder: (ordered_ids) => actions.reorderColumnOptions(column.id, ordered_ids),
            }}
            used_option_ids={collectColumnValues(state.groups, column.id)}
          />
        )}
      </div>
    );
  }

  if (column.kind === "tags") {
    // Tags is board-wide (`state.tag_defs`), never per-column. Like monday.com,
    // every Tags column shares one list, the board's own tags plus the public
    // tags of the account, so `column.options` is never consulted here.
    const defs = state.tag_defs;
    const selected = asArray(value);
    const can_edit = actions.canEditCell(node_id, column.id);
    // `overflow-hidden` stays off this host (see the Dropdown cell above) so `TagsMenu` isn't clipped.
    return (
      <div className="tags-cell" data-open={is_menu_open} onClick={can_edit ? openMenu : undefined}>
        {can_edit && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openMenu();
            }}
            aria-label="Add tags"
            className="tags-cell__add"
          >
            <PlusIcon size={12} />
          </button>
        )}
        <div className="tags-cell__list">
          {selected.map((entry) => {
            // Imported cells may hold the raw label ("design") instead of an id, those match by label like in `TagsMenu`.
            const def = findDef(defs, entry) ?? defs.find((tag) => tagSearchKey(tag.label) === tagSearchKey(entry));
            const label = formatTagLabel(def?.label ?? entry);
            return (
              <button
                key={entry}
                type="button"
                title={`Search ${label}`}
                onClick={(event) => {
                  // Clicking a tag searches every item that uses it, like monday.com, instead of opening the picker.
                  event.stopPropagation();
                  openSearchEverything({ query: label, tab: "boards" });
                }}
                className="tags-cell__tag"
                style={{ color: def?.color || "#9699a6" }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {is_menu_open && (
          <TagsMenu
            tag_defs={defs}
            selected={selected}
            query={state.tag_query}
            onQueryChange={actions.setTagQuery}
            onToggle={(id) => actions.toggleArrayValue(node_id, column.id, id)}
            onCreateTag={() => {
              actions.createTagOnCell(node_id, column.id, formatTagLabel(state.tag_query));
              actions.setTagQuery("");
            }}
            onManageTags={actions.openTagEditor}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "rating") return <RatingCell node_id={node_id} column={column} value={value} state={state} actions={actions} />;

  if (column.kind === "vote") return <VoteCell node_id={node_id} column={column} value={value} state={state} actions={actions} />;

  if (column.kind === "link") {
    const link = value && typeof value === "object" && !Array.isArray(value) && "url" in value ? (value as LinkValue) : null;
    const can_edit = actions.canEditCell(node_id, column.id);
    return (
      <div className="cell-link-host">
        <button type="button" onClick={openMenu} aria-label={link?.url ? "Edit link" : "Add link"} className="cell-link-host__hit-area" />
        <div className="cell-link-host__content">
          {link?.url ? (
            <CellHyperlink
              href={link.url}
              label={link.text || link.url}
              tooltip={link.url}
              onRemove={can_edit ? () => actions.clearCellValue(node_id, column.id) : undefined}
              remove_label="Remove link"
            />
          ) : (
            can_edit && <AddGlyph />
          )}
        </div>
        {is_menu_open && (
          <LinkMenu
            url={link?.url ?? ""}
            text={link?.text ?? ""}
            onSave={(url, text) => actions.setCellValue(node_id, column.id, { url, text })}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "files") {
    const files = Array.isArray(value) && value.every((f) => typeof f === "object" && f !== null) ? (value as CellFile[]) : [];
    const can_edit = actions.canEditCell(node_id, column.id);
    const first_file = files[0];
    const reportFailure = (fallback: string) => (error: { errors?: Record<string, string[]>; message?: string }) => {
      const first_field_error = error?.errors ? Object.values(error.errors).flat()[0] : undefined;
      setUploadError(first_field_error ?? error?.message ?? fallback);
    };
    return (
      <div className="cell-link-host">
        <button type="button" onClick={openMenu} aria-label={files.length > 0 ? "Manage files" : "Add file"} className="cell-link-host__hit-area" />
        <div className="cell-link-host__content">
          {first_file ? (
            <>
              <CellHyperlink
                href={first_file.url}
                label={first_file.file_name}
                // Links show their URL like monday, uploads and Docs their full name (a storage URL means nothing to people).
                tooltip={first_file.kind === "link" ? first_file.url : first_file.file_name}
                onRemove={can_edit ? () => void actions.deleteCellFile(node_id, column.id, first_file.id) : undefined}
                remove_label={`Remove ${first_file.file_name}`}
              />
              {files.length > 1 && (
                <button type="button" onClick={openMenu} className="cell-link-host__count" aria-label={`Show all ${files.length} files`}>
                  +{files.length - 1}
                </button>
              )}
            </>
          ) : (
            can_edit && <AddGlyph />
          )}
        </div>
        {is_menu_open && (
          <FilesMenu
            files={files}
            is_uploading={is_uploading}
            is_creating_doc={is_creating_doc}
            upload_error={upload_error}
            can_edit={can_edit}
            onUpload={(picked) => {
              setIsUploading(true);
              setUploadError(null);
              // `Promise.resolve`: the read only guard returns undefined instead of a promise.
              Promise.resolve(actions.uploadCellFiles(node_id, column.id, picked))
                .catch(reportFailure("The file could not be uploaded."))
                .finally(() => setIsUploading(false));
            }}
            onOpenWebcam={() => {
              actions.closeCellMenu();
              setIsWebcamOpen(true);
            }}
            onCreateDoc={() => {
              setIsCreatingDoc(true);
              setUploadError(null);
              Promise.resolve(actions.addCellFileDoc(node_id, column.id))
                .then(() => actions.closeCellMenu())
                .catch(reportFailure("The doc could not be created."))
                .finally(() => setIsCreatingDoc(false));
            }}
            onAddLink={(source) => {
              actions.closeCellMenu();
              setFileLinkSource(source);
            }}
            onDelete={(file_id) => void actions.deleteCellFile(node_id, column.id, file_id)}
            onClose={() => {
              setUploadError(null);
              actions.closeCellMenu();
            }}
          />
        )}
        {file_link_source && (
          <FileLinkModal
            source={file_link_source}
            onSave={async (url, text) => {
              await actions.addCellFileLink(node_id, column.id, url, text, file_link_source);
            }}
            onClose={() => setFileLinkSource(null)}
          />
        )}
        {is_webcam_open && (
          <WebcamCaptureModal
            onUpload={async (photo) => {
              await actions.uploadCellFiles(node_id, column.id, [photo]);
            }}
            onClose={() => setIsWebcamOpen(false)}
          />
        )}
      </div>
    );
  }

  if (column.kind === "time_tracking") {
    const tv = (value as TimeTrackingValue | undefined) ?? { seconds: 0, running_since: null };
    const is_running = !!tv.running_since;
    const live_seconds = tv.seconds + (is_running ? Math.max(0, (now - new Date(tv.running_since!).getTime()) / 1000) : 0);
    const total = Math.floor(live_seconds);
    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");

    return (
      <button
        type="button"
        onClick={() =>
          actions.setCellValue(
            node_id,
            column.id,
            is_running ? { seconds: Math.floor(live_seconds), running_since: null } : { seconds: tv.seconds, running_since: new Date().toISOString() }
          )
        }
        className="flex h-full w-full items-center justify-center gap-2 px-2"
      >
        <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-full ${is_running ? "bg-[#e2445c]" : "bg-boardtree-hover-strong"}`}>
          {is_running ? (
            <svg viewBox="0 0 14 14" width="8" height="8"><rect x="3" y="3" width="8" height="8" fill="#fff" /></svg>
          ) : (
            <svg viewBox="0 0 14 14" width="9" height="9"><path d="M4 2.5 L11.5 7 L4 11.5 Z" fill="var(--color-boardtree-text-secondary)" /></svg>
          )}
        </span>
        <span className="font-mono text-[12px] text-boardtree-text-secondary">
          {hh}:{mm}:{ss}
        </span>
      </button>
    );
  }

  if (column.kind === "dependency") {
    return <DependencyCell node_id={node_id} column={column} values={values} state={state} actions={actions} />;
  }

  if (column.kind === "auto_number") {
    // Item ID is the item's own id, like monday.com. The API stores it as the cell value, a row
    // that has not been reloaded since its column was added falls back to its id (a saved row's
    // id is all digits, a row still being created has a temporary one and shows a dash).
    const item_id = typeof value === "number" || typeof value === "string" ? String(value) : /^\d+$/.test(node_id) ? node_id : "";
    return (
      <div
        className="flex h-full w-full min-w-0 items-center justify-center px-2 text-board-cell tabular-nums text-boardtree-text"
        title={item_id ? `Item ID ${item_id}` : undefined}
      >
        <span className="truncate">{item_id || <span className="text-boardtree-text-faint">–</span>}</span>
      </div>
    );
  }

  if (column.kind === "formula") {
    // Unconfigured (no expression written yet, e.g. a column created before
    // this board had other columns to compute from): there's nothing to
    // compute, so the cell offers the same "Configure formula" setup the
    // column header's own "..." menu does, rather than sitting there as a
    // dead, unexplained "–".
    const outcome = computeFormulaOutcome(column, values, node_name);
    if (!outcome) {
      return (
        <button
          type="button"
          onClick={() => actions.openConfigEditor("formula", column.id)}
          className="flex h-full w-full items-center px-2.5 text-board-cell text-boardtree-text-faint underline decoration-dotted"
        >
          Set up formula
        </button>
      );
    }
    if (!outcome.ok) {
      return (
        <button
          type="button"
          onClick={() => actions.openConfigEditor("formula", column.id)}
          className="flex h-full w-full items-center px-2.5 font-mono text-[12px] font-medium text-boardtree-danger"
          title={outcome.message}
        >
          {outcome.code}
        </button>
      );
    }
    const is_numeric = formulaResultType(column) === "number";
    return (
      <div
        className={`flex h-full w-full items-center px-2.5 font-mono text-board-cell text-boardtree-text-secondary ${is_numeric ? "justify-end" : "justify-start truncate"}`}
        title={outcome.text}
      >
        {outcome.text || "–"}
      </div>
    );
  }

  if (column.kind === "connect_board") {
    return <ConnectItemsCell node_id={node_id} column={column} value={value} state={state} actions={actions} />;
  }

  if (column.kind === "mirror") {
    return <MirrorCell node_id={node_id} column={column} values={values} state={state} actions={actions} />;
  }

  if (column.kind === "button") {
    const label = column.button?.label?.trim() || "Click me";
    const color = column.button?.color ?? "#579bfc";
    // monday's flow: until an automation watches the button, a click explains it and offers "Set up".
    const needs_set_up = column.button?.is_set_up === false;
    const press = async () => {
      if (needs_set_up) {
        openMenu();
        return;
      }
      if (is_pressing) return;
      setIsPressing(true);
      try {
        const result = actions.pressButton(node_id, column.id) as Promise<string> | undefined;
        setPressFeedback(result ? await result : "You cannot press this button.");
      } catch {
        setPressFeedback("The button could not run its automations.");
      } finally {
        setIsPressing(false);
      }
    };
    return (
      <div className="relative flex h-full w-full min-w-0 items-center justify-center px-2">
        <button
          type="button"
          onClick={() => void press()}
          disabled={is_pressing}
          aria-haspopup={needs_set_up ? "dialog" : undefined}
          aria-expanded={needs_set_up ? is_menu_open : undefined}
          title={press_feedback ?? (needs_set_up ? "Set up what this button does" : `Run the automations of "${label}"`)}
          className="h-7 max-w-full truncate rounded-[4px] px-2.5 text-[14px] leading-7 transition-[filter,opacity] hover:brightness-95 active:brightness-90 disabled:opacity-60"
          style={{ background: color, color: contrastFg(color) }}
        >
          {is_pressing ? "Running..." : press_feedback ? "Done" : label}
        </button>
        {press_feedback && (
          <div role="status" className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-max max-w-[240px] -translate-x-1/2 rounded-[6px] bg-boardtree-text px-2 py-1 text-[11.5px] text-boardtree-surface shadow-lg">
            {press_feedback}
          </div>
        )}
        {needs_set_up && is_menu_open && (
          <ButtonSetupPopover onSetUp={actions.canSetUpButtons() ? () => actions.setUpButton(column.id) : undefined} onClose={actions.closeCellMenu} />
        )}
      </div>
    );
  }

  if (column.kind === "checklist") {
    const items = Array.isArray(value) && value.every((v) => typeof v === "object" && v !== null && "is_done" in v) ? (value as ChecklistItemValue[]) : [];
    const done_count = items.filter((it) => it.is_done).length;
    const pct = items.length > 0 ? Math.round((done_count / items.length) * 100) : 0;
    return (
      <div className="relative flex flex-1 items-center gap-2 px-3">
        <button type="button" onClick={openMenu} className="flex min-w-0 flex-1 items-center gap-2">
          {items.length > 0 ? (
            <>
              <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-boardtree-track">
                <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: pct >= 100 ? "#00c875" : "#fdab3d" }} />
              </div>
              <div className="flex-none font-mono text-[10.5px] text-boardtree-text-muted">{done_count}/{items.length}</div>
            </>
          ) : (
            <span className="text-board-cell text-boardtree-text-faint">Add sub-tasks</span>
          )}
        </button>
        {is_menu_open && <ChecklistMenu items={items} onChange={(next) => actions.setCellValue(node_id, column.id, next)} onClose={actions.closeCellMenu} />}
      </div>
    );
  }

  return null;
}

/** An empty Link or Files cell's hover "+", see `.cell-link-host__add`. */
function AddGlyph() {
  return (
    <span className="cell-link-host__add" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
        <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
