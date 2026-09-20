import React from "react";
import type { ColumnDef, PersonDef } from "../table/types";
import type { BoardAutomationDto } from "@/types/board-automation";
import { describeAutomation, type NamedOption } from "./automationDescriptions";
import { ToggleSwitch } from "./automationFormParts";

export type AutomationsListProps = {
  automations: BoardAutomationDto[];
  columns: ColumnDef[];
  groups: NamedOption[];
  people: PersonDef[];
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
  /** Shown instead of the list when there are no automations. */
  empty_state: React.ReactNode;
};

/** The enable, disable and delete list shared by the Automations dialog and the Integrate dialog's "Active automations". */
export default function AutomationsList({ automations, columns, groups, people, onToggle, onDelete, empty_state }: AutomationsListProps) {
  if (automations.length === 0) {
    return <div className="text-[12.5px] text-boardtree-text-faint">{empty_state}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {automations.map((automation) => (
        <div key={automation.id} className="flex items-start gap-2.5 rounded-[8px] border border-boardtree-border-soft px-3 py-2.5">
          <div className="mt-0.5 flex-none">
            <ToggleSwitch checked={automation.is_enabled} onToggle={() => void onToggle(automation.id, !automation.is_enabled)} />
          </div>
          <div className="min-w-0 flex-1 text-[13px] text-boardtree-text">{describeAutomation(automation, columns, groups, people)}</div>
          <button type="button" onClick={() => void onDelete(automation.id)} aria-label="Delete automation" className="flex h-6 w-6 flex-none items-center justify-center rounded-[5px] text-boardtree-text-faint hover:bg-boardtree-danger-hover hover:text-boardtree-danger">
            <svg viewBox="0 0 16 16" width="13" height="13"><path d="M3.4 5 H12.6 M6.4 5 V3.2 H9.6 V5 M4.8 5 L5.4 13.2 H10.6 L11.2 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      ))}
    </div>
  );
}
