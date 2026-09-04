"use client";

import type { CellValue, ColumnDef } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { contrastFg, findDef, pillColors } from "../colorUtils";
import { DROPDOWN_OPTION_COLORS } from "../constants";
import { encodeRangeValue, fmtDate, fmtRange, parseRangeValue } from "../dateUtils";
import AvatarBadge from "../menus/AvatarBadge";
import StatusMenu from "../menus/StatusMenu";
import LabelMenu from "../menus/LabelMenu";
import PeopleMenu from "../menus/PeopleMenu";
import DateMenu from "../menus/DateMenu";
import TimelineMenu from "../menus/TimelineMenu";
import ProgressMenu from "../menus/ProgressMenu";
import DropdownMenu from "../menus/DropdownMenu";
import TagsMenu from "../menus/TagsMenu";

interface CellRendererProps {
  node_id: string;
  column: ColumnDef;
  values: Record<string, CellValue>;
  state: BoardTableState;
  actions: BoardTableActions;
}

function asString(v: CellValue): string {
  return typeof v === "string" ? v : "";
}
function asArray(v: CellValue): string[] {
  return Array.isArray(v) ? v : [];
}

export default function CellRenderer({ node_id, column, values, state, actions }: CellRendererProps) {
  const scope_key = `${node_id}:${column.id}`;
  const is_menu_open = state.open_cell_menu_key === scope_key;
  const value = values[column.id];
  const openMenu = () => actions.openCellMenu(scope_key);

  if (column.kind === "text" || column.kind === "phone" || column.kind === "email") {
    return (
      <input
        value={asString(value)}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value)}
        title={asString(value)}
        className="h-full w-full truncate bg-transparent px-3 font-[inherit] text-[12.5px] text-boardtree-text outline-none"
      />
    );
  }

  if (column.kind === "longtext") {
    return (
      <textarea
        value={asString(value)}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value)}
        placeholder="Add text"
        className="box-border h-full w-full resize-none bg-transparent px-3 py-1.5 font-[inherit] text-[12.5px] leading-[15px] text-boardtree-text-secondary outline-none"
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
              return <AvatarBadge key={id} initials={person?.initials || id} color={person?.color || "#9aa0b6"} />;
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
      <div className="relative flex flex-1 items-center gap-1.5 px-2.5">
        {/* `h-full` keeps the button clickable when there are no chips yet —
            without it, `items-center` on the wrapping div shrinks the button
            to its (empty) content height, leaving nothing for a click to
            actually hit. */}
        <button type="button" onClick={openMenu} className="flex h-full flex-1 items-center gap-1.5 overflow-hidden">
          {selected.map((entry) => {
            const def = findDef(defs, entry);
            return (
              <span key={entry} className="flex-none whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: def?.color || "#9aa0b6" }}>
                {def?.label ?? entry}
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
    // Real per-column tag options come from `column.options` (read/select
    // only in this pass); the mock demo's own global palette (`state.tag_defs`)
    // also supports creating new tags inline, since it isn't backed by a
    // real column that would need persisting.
    const is_real_column = Boolean(column.options);
    const defs = column.options ?? state.tag_defs;
    const selected = asArray(value);
    // See the Dropdown cell's own comment above — `overflow-hidden` stays off
    // this wrapping div so `TagsMenu` isn't clipped either.
    return (
      <div className="relative flex flex-1 items-center gap-2.5 px-2.5">
        {/* See the Dropdown cell's own comment above — same fix, same reason. */}
        <button type="button" onClick={openMenu} className="flex h-full flex-1 items-center gap-2.5 overflow-hidden">
          {selected.map((entry) => {
            const def = findDef(defs, entry);
            return (
              <span key={entry} className="flex-none whitespace-nowrap text-[12px] font-medium" style={{ color: def?.color || "#9aa0b6" }}>
                {def?.label ?? entry}
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
            onCreateTag={
              is_real_column
                ? undefined
                : () => {
                    const label = state.tag_query.trim();
                    if (!label) return;
                    actions.addTagDef(label);
                    actions.toggleArrayValue(node_id, column.id, label);
                    actions.setTagQuery("");
                  }
            }
            onManageTags={is_real_column ? undefined : actions.openTagEditor}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  return null;
}
