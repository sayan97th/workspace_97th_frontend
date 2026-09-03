"use client";

import type { CellValue, ColumnDef, StatusDef } from "../types";
import type { BoardTableActions, BoardTableState } from "../useBoardTable";
import { contrastFg, pillColors } from "../colorUtils";
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

/**
 * Looks up a status/label/dropdown/tags option by its stored value. Real
 * (API-backed) columns store an option's `id`; the mock demo data instead
 * stores its `label` text directly, so `findDef` tries both — matching by id
 * first keeps a real board correct even if a label happens to collide with
 * another option's id.
 */
function findDef(defs: StatusDef[], value: string): StatusDef | undefined {
  return defs.find((d) => d.id === value) ?? defs.find((d) => d.label === value);
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
        className="h-full w-full bg-transparent px-3 font-[inherit] text-[12.5px] text-[#262b45] outline-none"
      />
    );
  }

  if (column.kind === "longtext") {
    return (
      <textarea
        value={asString(value)}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value)}
        placeholder="Add text"
        className="box-border h-full w-full resize-none bg-transparent px-3 py-1.5 font-[inherit] text-[12.5px] leading-[15px] text-[#4a5068] outline-none"
      />
    );
  }

  if (column.kind === "number") {
    return (
      <input
        inputMode="numeric"
        value={asString(value)}
        onChange={(e) => actions.setCellValue(node_id, column.id, e.target.value.replace(/[^0-9.-]/g, ""))}
        className="h-full w-full bg-transparent px-2.5 text-center font-mono text-[12px] text-[#262b45] outline-none"
      />
    );
  }

  if (column.kind === "checkbox") {
    const checked = value === true;
    return (
      <button type="button" onClick={() => actions.setCellValue(node_id, column.id, !checked)} className="flex h-full w-full items-center justify-center">
        {checked ? (
          <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[4px] bg-[#4f6bed]">
            <svg viewBox="0 0 14 14" width="11" height="11"><path d="M2 7.4 L5.4 10.8 L12 3.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </span>
        ) : (
          <span className="h-[17px] w-[17px] rounded-[4px] border-[1.5px] border-[#ccd1de] bg-white" />
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
        <button type="button" onClick={openMenu} className="flex h-full w-full items-center justify-center text-[12.5px] font-medium" style={{ background: bg, color: contrastFg(bg) }}>
          {def?.label ?? asString(value)}
        </button>
        {is_menu_open && (
          <StatusMenu
            status_defs={defs}
            onPick={(id) => actions.setCellValue(node_id, column.id, id)}
            onEditLabels={() => actions.openLabelEditor("status")}
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
        <button type="button" onClick={openMenu} className="flex h-full w-full items-center justify-center">
          {def && (
            <span className="rounded-[4px] border px-2.5 py-0.5 text-[11.5px] font-medium" style={{ color: pill.fg, borderColor: pill.bd, background: pill.bg }}>
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
        <button type="button" onClick={openMenu} className="flex h-full w-full items-center justify-center text-[12.5px] text-[#4a5068]">
          {iso ? fmtDate(iso) : "—"}
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
          className="flex h-6 w-full items-center justify-center rounded-full border text-[11.5px] font-medium"
          style={{ background: start_iso ? "#dfe4fb" : "#f4f6fb", borderColor: start_iso ? "#c3cef9" : "#eceef5", color: "#3a52c8" }}
        >
          {start_iso ? fmtRange(start_iso, end_iso || start_iso) : "—"}
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
              <div className="-ml-[7px] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-[#eef1f9] text-[9.5px] font-semibold text-[#5b6180]">
                +{owner_ids.length - 3}
              </div>
            )}
            {owner_ids.length === 0 && (
              <div className="-ml-[7px] flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-[#d3d8e6] text-[12px] text-[#b6bbcd]">+</div>
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
    const bar_color = pct >= 100 ? "#12c46b" : pct > 0 ? "#f2a53c" : "#e9ecf4";
    return (
      <div className="relative flex flex-1 items-center gap-2 px-3.5">
        <button type="button" onClick={openMenu} className="flex flex-1 items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#e9ecf4]">
            <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: bar_color }} />
          </div>
          <div className="w-8 flex-none text-right font-mono text-[10.5px] text-[#8b90a6]">{pct}%</div>
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
    const defs = column.options ?? state.label_defs;
    const selected = asArray(value);
    return (
      <div className="relative flex flex-1 items-center gap-1.5 overflow-hidden px-2.5">
        <button type="button" onClick={openMenu} className="flex flex-1 items-center gap-1.5 overflow-hidden">
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
    return (
      <div className="relative flex flex-1 items-center gap-2.5 overflow-hidden px-2.5">
        <button type="button" onClick={openMenu} className="flex flex-1 items-center gap-2.5 overflow-hidden">
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
