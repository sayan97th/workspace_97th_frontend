"use client";

import { useEffect, useState } from "react";
import type { CellFile, CellValue, ChecklistItemValue, ColumnDef, LinkValue, TimeTrackingValue } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { contrastFg, findDef, pillColors } from "../colorUtils";
import { DROPDOWN_OPTION_COLORS } from "../constants";
import { encodeRangeValue, fmtDate, fmtRange, parseRangeValue } from "../dateUtils";
import { dependencyCandidates, findNode } from "../treeUtils";
import { computeFormulaOutcome, formulaResultType } from "../formulaUtils";
import AvatarBadge from "../menus/AvatarBadge";
import ConnectBoardMenu from "../menus/ConnectBoardMenu";
import StatusMenu from "../menus/StatusMenu";
import LabelMenu from "../menus/LabelMenu";
import PeopleMenu from "../menus/PeopleMenu";
import DateMenu from "../menus/DateMenu";
import TimelineMenu from "../menus/TimelineMenu";
import ProgressMenu from "../menus/ProgressMenu";
import DropdownMenu from "../menus/DropdownMenu";
import TagsMenu from "../menus/TagsMenu";
import LinkMenu from "../menus/LinkMenu";
import FilesMenu from "../menus/FilesMenu";
import DependencyMenu from "../menus/DependencyMenu";
import ChecklistMenu from "../menus/ChecklistMenu";
import { containsSearchQuery, highlightSearchMatches } from "../searchHighlight";

interface CellRendererProps {
  node_id: string;
  column: ColumnDef;
  values: Record<string, CellValue>;
  /** The row's own name, read by a formula column's `{Item}` reference. */
  node_name?: string;
  state: BoardTableState;
  actions: BoardTableActions;
}

function asString(v: CellValue): string {
  return typeof v === "string" ? v : "";
}
/** Narrows to `string[]` for the array-valued kinds (people/dropdown/tags/vote) — `CellValue`'s other array member, `CellFile[]`, only ever reaches a `files` column's own branch, which reads it separately. */
function asArray(v: CellValue): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

export default function CellRenderer({ node_id, column, values, node_name, state, actions }: CellRendererProps) {
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

  // Files cell's own "Upload" in-flight state, so the popover can disable its
  // button and show a "Uploading…" label while a request is pending.
  const [is_uploading, setIsUploading] = useState(false);

  // Text cell: whether it was clicked out of its search highlighted display into the input.
  const [is_text_editing, setIsTextEditing] = useState(false);

  // Connect-board cell's linked item names — declared unconditionally (Rules
  // of Hooks, same as `running_since` above) even though only the
  // "connect_board" branch below reads `state.connect_board_items`.
  // `ensureLinkedBoardItems` itself is a no-op past the first call for a
  // given board id, so every cell in the column re-triggering this on every
  // render is cheap.
  useEffect(() => {
    if (column.kind === "connect_board" && column.linked_board_id) actions.ensureLinkedBoardItems(column.linked_board_id);
  }, [column.kind, column.linked_board_id, actions]);

  if (column.kind === "text" || column.kind === "phone" || column.kind === "email") {
    // While the board is searched, a matching cell shows its text with the match highlighted
    // (an input can't), and turns back into the input as soon as it is clicked.
    if (!is_text_editing && containsSearchQuery(asString(value), state.search_query)) {
      return (
        <button
          type="button"
          onClick={() => setIsTextEditing(true)}
          title={asString(value)}
          className="h-full w-full min-w-0 truncate px-3 text-left font-[inherit] text-[12.5px] text-boardtree-text"
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
        className="h-full w-full min-w-0 truncate bg-transparent px-3 font-[inherit] text-[12.5px] text-boardtree-text outline-none"
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
        className="box-border h-full w-full min-w-0 resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words bg-transparent px-3 py-1.5 font-[inherit] text-[12.5px] leading-[15px] text-boardtree-text-secondary outline-none"
      />
    );
  }

  if (column.kind === "number") {
    return (
      <input
        inputMode="numeric"
        value={asString(value)}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value.replace(/[^0-9.-]/g, ""))}
        title={asString(value)}
        className="h-full w-full truncate bg-transparent px-2.5 text-center font-mono text-[12px] text-boardtree-text outline-none"
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
        <button type="button" onClick={openMenu} title={def?.label ?? asString(value)} className="flex h-full w-full min-w-0 items-center justify-center px-2 text-[12.5px] font-medium" style={{ background: bg, color: contrastFg(bg) }}>
          <span className="truncate">{def?.label ?? asString(value)}</span>
        </button>
        {is_menu_open && (
          <StatusMenu
            status_defs={defs}
            onPick={(id) => actions.setCellValue(node_id, column.id, id)}
            onEditLabels={() => actions.openLabelEditor("status", column.id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "label") {
    const defs = column.options ?? state.label_defs;
    const def = findDef(defs, asString(value));
    const pill = pillColors(def?.color || "");
    return (
      <div className="relative flex-1">
        <button type="button" onClick={openMenu} title={def?.label} className="flex h-full w-full min-w-0 items-center justify-center px-2">
          {def && (
            <span className="max-w-full truncate rounded-[4px] border px-2.5 py-0.5 text-[11.5px] font-medium" style={{ color: pill.fg, borderColor: pill.bd, background: pill.bg }}>
              {def.label}
            </span>
          )}
        </button>
        {is_menu_open && (
          <LabelMenu
            label_defs={defs}
            selected={def ? [def.id] : []}
            onPick={(id) => actions.setCellValue(node_id, column.id, id)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "date") {
    const iso = asString(value);
    return (
      <div className="relative flex-1">
        <button type="button" onClick={openMenu} title={iso ? fmtDate(iso) : undefined} className="flex h-full w-full min-w-0 items-center justify-center px-2 text-[12.5px] text-boardtree-text-secondary">
          <span className="truncate">{iso ? fmtDate(iso) : "—"}</span>
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
    const { start_iso, end_iso } = parseRangeValue(asString(value));
    return (
      <div className="relative flex flex-1 items-center px-3">
        <button
          type="button"
          onClick={openMenu}
          title={start_iso ? fmtRange(start_iso, end_iso || start_iso) : undefined}
          className="flex h-6 w-full min-w-0 items-center justify-center rounded-full border px-2 text-[11.5px] font-medium"
          style={{ background: start_iso ? "var(--color-boardtree-accent-surface)" : "var(--color-boardtree-bg)", borderColor: start_iso ? "var(--color-boardtree-accent-soft)" : "var(--color-boardtree-border-soft)", color: "var(--color-boardtree-accent-hover)" }}
        >
          <span className="truncate">{start_iso ? fmtRange(start_iso, end_iso || start_iso) : "—"}</span>
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
        <button type="button" onClick={openMenu} className="flex h-full w-full items-center justify-center">
          <div className="flex items-center pl-[7px]">
            {owner_ids.slice(0, 3).map((id) => {
              const person = state.people.find((p) => p.id === id);
              return (
                <AvatarBadge
                  key={id}
                  initials={person?.initials || id}
                  color={person?.color || "#9aa0b6"}
                  name={person?.name}
                  is_deactivated={person?.is_deactivated}
                />
              );
            })}
            {owner_ids.length > 3 && (
              <div className="-ml-[7px] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-boardtree-surface bg-boardtree-hover text-[9.5px] font-semibold text-boardtree-text-secondary">
                +{owner_ids.length - 3}
              </div>
            )}
            {owner_ids.length === 0 && (
              <div className="-ml-[7px] flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-boardtree-border text-[12px] text-boardtree-text-faint">+</div>
            )}
          </div>
        </button>
        {is_menu_open && (
          <PeopleMenu
            people={state.people}
            selected={owner_ids}
            query={state.people_query}
            onQueryChange={actions.setPeopleQuery}
            onToggle={(person_id) => actions.toggleArrayValue(node_id, column.id, person_id)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
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
    // below) — every dropdown column owns its own, independent option list,
    // starting empty, so two dropdown columns never show/edit the same set.
    const defs = column.options ?? [];
    const selected = asArray(value);
    // `overflow-hidden` stays on the button (below), not the wrapping div —
    // there it would also clip `DropdownMenu`, which renders as that div's
    // other child and needs to overflow past the cell's edges.
    return (
      <div className="relative flex min-w-0 flex-1 items-center gap-1.5 px-2.5">
        {/* `h-full` keeps the button clickable when there are no chips yet —
            without it, `items-center` on the wrapping div shrinks the button
            to its (empty) content height, leaving nothing for a click to
            actually hit. */}
        <button type="button" onClick={openMenu} className="flex h-full min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
          {selected.map((entry) => {
            const def = findDef(defs, entry);
            const label = def?.label ?? entry;
            return (
              // `min-w-0 truncate` (not `flex-none whitespace-nowrap`) so an
              // abnormally long option value — e.g. a "tags"/"dropdown"
              // column repurposed to hold free-form text — clips with an
              // ellipsis instead of forcing the chip past its own width and
              // bleeding into the next column.
              <span key={entry} title={label} className="min-w-0 max-w-full truncate rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: def?.color || "#9aa0b6" }}>
                {label}
              </span>
            );
          })}
        </button>
        {is_menu_open && (
          <DropdownMenu
            options={defs}
            selected={selected}
            onToggle={(id) => actions.toggleArrayValue(node_id, column.id, id)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
            onAddOption={(label) =>
              actions.addColumnOption(column.id, { label, color: DROPDOWN_OPTION_COLORS[defs.length % DROPDOWN_OPTION_COLORS.length] })
            }
            onRenameOption={(id, label) => actions.renameColumnOption(column.id, id, label)}
            onRecolorOption={(id, color) => actions.recolorColumnOption(column.id, id, color)}
            onDeleteOption={(id) => actions.deleteColumnOption(column.id, id)}
          />
        )}
      </div>
    );
  }

  if (column.kind === "tags") {
    // Tags is board-wide (`state.tag_defs`), never per-column — unlike
    // Status/Dropdown/Label, monday.com's Tags column shares one option list
    // across every Tags column on the board, so `column.options` is never
    // consulted here even when set.
    const defs = state.tag_defs;
    const selected = asArray(value);
    // See the Dropdown cell's own comment above — `overflow-hidden` stays off
    // this wrapping div so `TagsMenu` isn't clipped either.
    return (
      <div className="relative flex min-w-0 flex-1 items-center gap-2.5 px-2.5">
        {/* See the Dropdown cell's own comment above — same fix, same reason. */}
        <button type="button" onClick={openMenu} className="flex h-full min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
          {selected.map((entry) => {
            const def = findDef(defs, entry);
            const label = def?.label ?? entry;
            return (
              // See the Dropdown cell's own chip comment above — same fix, same reason.
              <span key={entry} title={label} className="min-w-0 max-w-full truncate text-[12px] font-medium" style={{ color: def?.color || "#9aa0b6" }}>
                {label}
              </span>
            );
          })}
        </button>
        {is_menu_open && (
          <TagsMenu
            tag_defs={defs}
            selected={selected}
            query={state.tag_query}
            onQueryChange={actions.setTagQuery}
            onToggle={(id) => actions.toggleArrayValue(node_id, column.id, id)}
            onCreateTag={() => {
              actions.createTagOnCell(node_id, column.id, state.tag_query);
              actions.setTagQuery("");
            }}
            onManageTags={actions.openTagEditor}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "rating") {
    const rating = typeof value === "number" ? value : 0;
    return (
      <div className="flex h-full w-full items-center justify-center gap-0.5 px-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => actions.setCellValue(node_id, column.id, rating === n ? 0 : n)}
            className="flex h-4 w-4 items-center justify-center"
          >
            <svg viewBox="0 0 16 16" width="14" height="14">
              <path
                d="M8 1.7 l1.8 3.9 4.3 .5 -3.2 2.9 .9 4.2 -3.8 -2.2 -3.8 2.2 .9 -4.2 -3.2 -2.9 4.3 -.5z"
                fill={n <= rating ? "#fdab3d" : "none"}
                stroke={n <= rating ? "none" : "var(--color-boardtree-text-faint)"}
                strokeWidth={n <= rating ? undefined : "1.2"}
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ))}
      </div>
    );
  }

  if (column.kind === "vote") {
    const voter_ids = asArray(value);
    const has_voted = !!state.current_user_id && voter_ids.includes(state.current_user_id);
    return (
      <button
        type="button"
        disabled={!state.current_user_id}
        onClick={() => state.current_user_id && actions.toggleArrayValue(node_id, column.id, state.current_user_id)}
        title={state.current_user_id ? undefined : "Sign in to vote"}
        className="flex h-full w-full items-center justify-center gap-1.5 disabled:opacity-50"
      >
        <svg viewBox="0 0 16 16" width="14" height="14">
          <path
            d="M8 13.4 C8 13.4 2 9.6 2 5.7 A3 3 0 0 1 8 4.6 A3 3 0 0 1 14 5.7 C14 9.6 8 13.4 8 13.4 Z"
            fill={has_voted ? "#e2445c" : "none"}
            stroke={has_voted ? "none" : "var(--color-boardtree-text-faint)"}
            strokeWidth={has_voted ? undefined : "1.3"}
          />
        </svg>
        <span className="font-mono text-[11.5px] text-boardtree-text-secondary">{voter_ids.length}</span>
      </button>
    );
  }

  if (column.kind === "link") {
    const link = value && typeof value === "object" && !Array.isArray(value) && "url" in value ? (value as LinkValue) : null;
    return (
      <div className="relative flex flex-1 items-center gap-1.5 px-2.5">
        <button type="button" onClick={openMenu} className="flex h-full min-w-0 flex-1 items-center overflow-hidden">
          {link?.url ? (
            <span className="min-w-0 truncate text-[12.5px] font-medium text-boardtree-accent underline">{link.text || link.url}</span>
          ) : (
            <span className="text-[12.5px] text-boardtree-text-faint">Add link</span>
          )}
        </button>
        {link?.url && (
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open link"
            className="flex-none text-boardtree-text-faint hover:text-boardtree-accent"
          >
            <svg viewBox="0 0 14 14" width="12" height="12">
              <path d="M5.5 8.5 L11 3 M7 3 H11 V7 M9.5 3 H3.5 V11 H10.5 V7.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
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
    return (
      <div className="relative flex h-full w-full items-center justify-center px-2">
        <button type="button" onClick={openMenu} className="flex items-center gap-1.5 text-boardtree-text-faint hover:text-boardtree-accent">
          <svg viewBox="0 0 14 14" width="13" height="13">
            <path d="M9.5 2.5 L3.8 8.2 a2 2 0 0 0 2.8 2.8 L12 5.6 a3.2 3.2 0 0 0 -4.5 -4.5 L2.3 6.3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {files.length > 0 && <span className="font-mono text-[11px]">{files.length}</span>}
        </button>
        {is_menu_open && (
          <FilesMenu
            files={files}
            is_uploading={is_uploading}
            onUpload={(picked) => {
              setIsUploading(true);
              void actions.uploadCellFiles(node_id, column.id, picked).finally(() => setIsUploading(false));
            }}
            onDelete={(file_id) => void actions.deleteCellFile(node_id, column.id, file_id)}
            onClose={actions.closeCellMenu}
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
    const dependency_ids = asArray(value);
    const selected = dependency_ids
      .map((id) => ({ id, name: findNode(state.groups, id)?.name }))
      .filter((entry): entry is { id: string; name: string } => Boolean(entry.name));
    const visible = selected.slice(0, 2);
    const overflow = selected.length - visible.length;
    return (
      <div className="relative flex min-w-0 flex-1 items-center gap-1.5 px-2.5">
        <button type="button" onClick={openMenu} className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {visible.length > 0 ? (
            <>
              {visible.map((entry) => (
                <span key={entry.id} title={entry.name} className="flex max-w-[110px] items-center gap-1 truncate rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] font-medium text-boardtree-text-secondary">
                  <svg viewBox="0 0 14 14" width="10" height="10" className="flex-none"><path d="M5.5 8.5 L11 3 M7 3 H11 V7 M9.5 3 H3.5 V11 H10.5 V7.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="truncate">{entry.name}</span>
                </span>
              ))}
              {overflow > 0 && (
                <span className="flex-none rounded-full bg-boardtree-hover-strong px-1.5 py-0.5 text-[10.5px] font-semibold text-boardtree-text-muted">+{overflow}</span>
              )}
            </>
          ) : (
            <span className="text-[12.5px] text-boardtree-text-faint">Add dependency</span>
          )}
        </button>
        {is_menu_open && (
          <DependencyMenu
            candidates={dependencyCandidates(state.groups, node_id, column.id)}
            selected={dependency_ids}
            onToggle={(id) => actions.toggleArrayValue(node_id, column.id, id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "auto_number") {
    return (
      <div className="flex h-full w-full items-center justify-center font-mono text-[12.5px] text-boardtree-text-faint">
        {typeof value === "number" ? value : "–"}
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
          className="flex h-full w-full items-center px-2.5 text-[12.5px] text-boardtree-text-faint underline decoration-dotted"
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
        className={`flex h-full w-full items-center px-2.5 font-mono text-[12.5px] text-boardtree-text-secondary ${is_numeric ? "justify-end" : "justify-start truncate"}`}
        title={outcome.text}
      >
        {outcome.text || "–"}
      </div>
    );
  }

  if (column.kind === "connect_board") {
    const linked_ids = asArray(value);
    const linked_board_id = column.linked_board_id;
    // `undefined` means `ensureLinkedBoardItems` (fired by the unconditional
    // effect above) hasn't resolved yet — falls back to a bare count until it
    // does, then swaps to the linked items' real names, mirroring monday.com.
    const linked_items = linked_board_id ? state.connect_board_items[linked_board_id] : undefined;
    const resolved_names = linked_items
      ? linked_ids.map((id) => linked_items.find((candidate) => candidate.id === id)?.name).filter((name): name is string => Boolean(name))
      : [];
    // Unconfigured (no `linked_board_id` yet — e.g. a column created before
    // this board ever had a second board to link to): there's no candidate
    // list to show in a popover, so the click instead opens the same
    // "Configure linked board" setup modal the column header's own "..."
    // menu does, rather than silently doing nothing.
    return (
      <div className="relative flex min-w-0 flex-1 items-center gap-1.5 px-2.5">
        <button
          type="button"
          onClick={linked_board_id ? openMenu : () => actions.openConfigEditor("connect_board", column.id)}
          className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-hidden"
        >
          {!linked_board_id ? (
            <span className="text-[12.5px] text-boardtree-text-faint underline decoration-dotted">Connect this column to a board</span>
          ) : linked_ids.length === 0 ? (
            <span className="text-[12.5px] text-boardtree-text-faint">Connect items</span>
          ) : !linked_items ? (
            <span className="flex-none rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] font-medium text-boardtree-text-secondary">
              {linked_ids.length} linked
            </span>
          ) : (
            <>
              {resolved_names.slice(0, 2).map((name, index) => (
                <span key={index} title={name} className="max-w-[110px] flex-none truncate rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] font-medium text-boardtree-text-secondary">
                  {name}
                </span>
              ))}
              {linked_ids.length > 2 && <span className="flex-none text-[11px] text-boardtree-text-faint">+{linked_ids.length - 2}</span>}
            </>
          )}
        </button>
        {is_menu_open && linked_board_id && (
          <ConnectBoardMenu
            candidates={linked_items ?? []}
            is_loading={linked_items === undefined}
            selected={linked_ids}
            onToggle={(id) => actions.toggleArrayValue(node_id, column.id, id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "mirror") {
    const raw_values = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];
    const display_values = raw_values.map((entry) =>
      typeof entry === "string" ? entry : typeof entry === "number" ? String(entry) : typeof entry === "boolean" ? (entry ? "Yes" : "No") : ""
    ).filter(Boolean);
    return (
      <div className="flex h-full w-full min-w-0 items-center gap-1 overflow-hidden px-2.5">
        {display_values.length > 0 ? (
          display_values.map((text, index) => (
            <span key={index} className="max-w-[110px] flex-none truncate rounded-full bg-boardtree-hover px-2 py-0.5 text-[11px] font-medium text-boardtree-text-secondary">
              {text}
            </span>
          ))
        ) : (
          <span className="text-[12.5px] text-boardtree-text-faint">–</span>
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
            <span className="text-[12.5px] text-boardtree-text-faint">Add sub-tasks</span>
          )}
        </button>
        {is_menu_open && <ChecklistMenu items={items} onChange={(next) => actions.setCellValue(node_id, column.id, next)} onClose={actions.closeCellMenu} />}
      </div>
    );
  }

  return null;
}
