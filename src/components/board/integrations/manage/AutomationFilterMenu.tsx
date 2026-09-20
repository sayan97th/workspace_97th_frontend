"use client";
import React, { useState } from "react";
import { FilterIcon } from "@/icons/workspace-icons";
import { useOutsideClick } from "../../table/useOutsideClick";
import { Radio } from "../../automations/automationFormParts";
import { AUTOMATION_KIND_LABELS, type AutomationKind } from "./manageFormat";
import { MENU_PANEL, TOOLBAR_BUTTON } from "./manageUi";

export type StatusFilter = "all" | "enabled" | "disabled";
export type KindFilter = "all" | AutomationKind;

export type AutomationFilters = { status: StatusFilter; kind: KindFilter };

export const NO_FILTERS: AutomationFilters = { status: "all", kind: "all" };

export const countActiveFilters = (filters: AutomationFilters): number => Number(filters.status !== "all") + Number(filters.kind !== "all");

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "enabled", label: "Enabled" },
  { id: "disabled", label: "Disabled" },
];

const KIND_OPTIONS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "email", label: AUTOMATION_KIND_LABELS.email },
  { id: "slack", label: AUTOMATION_KIND_LABELS.slack },
  { id: "board", label: AUTOMATION_KIND_LABELS.board },
];

const GROUP_LABEL = "px-3 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint";
const OPTION = "flex h-8 w-full items-center gap-2.5 px-3 text-left text-[13px] text-boardtree-text hover:bg-boardtree-hover";

/** The Filter button of the Automations tab, a small popover with the status and type filters. */
export default function AutomationFilterMenu({ filters, onChange }: { filters: AutomationFilters; onChange: (filters: AutomationFilters) => void }) {
  const [is_open, setIsOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(is_open, () => setIsOpen(false));
  const active_count = countActiveFilters(filters);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setIsOpen((open) => !open)} aria-haspopup="dialog" aria-expanded={is_open} className={`${TOOLBAR_BUTTON} ${active_count > 0 ? "text-boardtree-accent" : ""}`}>
        <FilterIcon size={15} />
        Filter
        {active_count > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-boardtree-accent px-1 text-[11px] font-semibold text-white">{active_count}</span>}
      </button>

      {is_open && (
        <div role="dialog" aria-label="Filter automations" className={`${MENU_PANEL} left-0 w-[210px]`}>
          <div className={GROUP_LABEL}>Status</div>
          {STATUS_OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => onChange({ ...filters, status: option.id })} className={OPTION}>
              <Radio checked={filters.status === option.id} />
              {option.label}
            </button>
          ))}
          <div className={GROUP_LABEL}>Type</div>
          {KIND_OPTIONS.map((option) => (
            <button key={option.id} type="button" onClick={() => onChange({ ...filters, kind: option.id })} className={OPTION}>
              <Radio checked={filters.kind === option.id} />
              {option.label}
            </button>
          ))}
          {active_count > 0 && (
            <button type="button" onClick={() => onChange(NO_FILTERS)} className="mt-1 flex h-8 w-full items-center border-t border-boardtree-border-soft px-3 text-[12.5px] font-medium text-boardtree-accent hover:bg-boardtree-hover">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
