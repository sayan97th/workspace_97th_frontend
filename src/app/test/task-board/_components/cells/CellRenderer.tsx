"use client";

import type { CellValue, ColumnDef } from "../../_types/board.types";
import type { TaskBoardActions, TaskBoardState } from "../../_hooks/useTaskBoard";
import { contrastFg, pillColors } from "../../_lib/color_utils";
import { encodeRangeValue, fmtDate, fmtRange, parseRangeValue } from "../../_lib/date_utils";
import { PEOPLE } from "../../_lib/constants";
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
  state: TaskBoardState;
  actions: TaskBoardActions;
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
    const def = state.status_defs.find((d) => d.label === value);
    const bg = def?.color || "#c9ccd4";
    return (
      <div className="relative flex-1">
        <button type="button" onClick={openMenu} className="flex h-full w-full items-center justify-center text-[12.5px] font-medium" style={{ background: bg, color: contrastFg(bg) }}>
          {asString(value)}
        </button>
        {is_menu_open && (
          <StatusMenu
            status_defs={state.status_defs}
            onPick={(label) => actions.setCellValue(node_id, column.id, label)}
            onEditLabels={() => actions.openLabelEditor("status")}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "label") {
    const label = asString(value);
    const pill = pillColors(state.label_defs.find((d) => d.label === label)?.color || "");
    return (
      <div className="relative flex-1">
        <button type="button" onClick={openMenu} className="flex h-full w-full items-center justify-center">
          {label && (
            <span className="rounded-[4px] border px-2.5 py-0.5 text-[11.5px] font-medium" style={{ color: pill.fg, borderColor: pill.bd, background: pill.bg }}>
              {label}
            </span>
          )}
        </button>
        {is_menu_open && (
          <LabelMenu
            label_defs={state.label_defs}
            selected={label ? [label] : []}
            onPick={(l) => actions.setCellValue(node_id, column.id, l)}
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
              const person = PEOPLE.find((p) => p.id === id);
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
    const selected = asArray(value);
    return (
      <div className="relative flex flex-1 items-center gap-1.5 overflow-hidden px-2.5">
        <button type="button" onClick={openMenu} className="flex flex-1 items-center gap-1.5 overflow-hidden">
          {selected.map((label) => {
            const def = state.label_defs.find((d) => d.label === label);
            return (
              <span key={label} className="flex-none whitespace-nowrap rounded-[4px] px-2 py-0.5 text-[11px] font-medium text-white" style={{ background: def?.color || "#9aa0b6" }}>
                {label}
              </span>
            );
          })}
        </button>
        {is_menu_open && (
          <DropdownMenu
            options={state.label_defs}
            selected={selected}
            onToggle={(label) => actions.toggleArrayValue(node_id, column.id, label)}
            onClear={() => actions.clearCellValue(node_id, column.id)}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  if (column.kind === "tags") {
    const selected = asArray(value);
    return (
      <div className="relative flex flex-1 items-center gap-2.5 overflow-hidden px-2.5">
        <button type="button" onClick={openMenu} className="flex flex-1 items-center gap-2.5 overflow-hidden">
          {selected.map((label) => {
            const def = state.tag_defs.find((t) => t.label === label);
            return (
              <span key={label} className="flex-none whitespace-nowrap text-[12px] font-medium" style={{ color: def?.color || "#9aa0b6" }}>
                {label}
              </span>
            );
          })}
        </button>
        {is_menu_open && (
          <TagsMenu
            tag_defs={state.tag_defs}
            selected={selected}
            query={state.tag_query}
            onQueryChange={actions.setTagQuery}
            onToggle={(label) => actions.toggleArrayValue(node_id, column.id, label)}
            onCreateTag={() => {
              const label = state.tag_query.trim();
              if (!label) return;
              actions.addTagDef(label);
              actions.toggleArrayValue(node_id, column.id, label);
              actions.setTagQuery("");
            }}
            onManageTags={actions.openTagEditor}
            onClose={actions.closeCellMenu}
          />
        )}
      </div>
    );
  }

  return null;
}
