"use client";
import React, { useState } from "react";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import type { BoardAutomationDto } from "@/types/board-automation";
import { AutomateIcon } from "@/icons/board-icons";
import { ChevronDownIcon, PlusIcon } from "@/icons/workspace-icons";
import type { ColumnDef, PersonDef } from "../../table/types";
import type { NamedOption } from "../../automations/automationDescriptions";
import { useOutsideClick } from "../../table/useOutsideClick";
import ManageAutomationsTab from "./ManageAutomationsTab";
import MyConnectionsTab from "./MyConnectionsTab";
import RunHistoryTab from "./RunHistoryTab";
import UsageTab from "./UsageTab";
import { MENU_ITEM, MENU_PANEL } from "./manageUi";

export type ManageTab = "automations" | "runs" | "connections" | "usage";

export type ManageViewProps = {
  board_id: number;
  view_id: number | null;
  board_label: string;
  slack: SlackIntegrationApi;
  return_path: string;
  automations: BoardAutomationDto[];
  columns: ColumnDef[];
  groups: NamedOption[];
  people: PersonDef[];
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  onRename: (automation_id: number, name: string | null) => Promise<void>;
  onDuplicate: (automation_id: number) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
  /** Jumps to Create > Communication, where the email and Slack templates live. */
  onExploreTemplates: () => void;
  /** Jumps to Create > Connections. */
  onOpenConnections: () => void;
  /** Opens the Automate dialog, where the board actions are built; the menu entry is hidden when omitted. */
  onOpenBoardAutomations?: () => void;
};

const TABS: { id: ManageTab; label: string }[] = [
  { id: "automations", label: "Automations" },
  { id: "runs", label: "Run history" },
  { id: "connections", label: "My connections" },
  { id: "usage", label: "Usage" },
];

/**
 * The Manage tab of the Integrations dialog, modelled on monday.com's "Manage your board automations".
 * A header with the create menu, then four sub tabs: the automations on this table, their run history,
 * the connections they use and how much they ran.
 */
export default function ManageView(props: ManageViewProps) {
  const { board_id, view_id, board_label, slack, return_path, automations, columns, groups, people, onExploreTemplates, onOpenConnections, onOpenBoardAutomations } = props;
  const [tab, setTab] = useState<ManageTab>("automations");
  const [is_create_menu_open, setIsCreateMenuOpen] = useState(false);
  const create_menu_ref = useOutsideClick<HTMLDivElement>(is_create_menu_open, () => setIsCreateMenuOpen(false));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[26px] font-semibold text-boardtree-text">Manage your board automations</h2>

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setTab("usage")} className="flex h-9 items-center gap-2 rounded-[6px] px-2 text-[13px] text-boardtree-text-secondary hover:bg-boardtree-hover">
            <AutomateIcon size={16} />
            Automation hub
          </button>

          <div ref={create_menu_ref} className="relative flex">
            <button type="button" onClick={onExploreTemplates} className="h-9 rounded-l-[4px] bg-boardtree-accent px-3.5 text-[13px] font-medium text-white hover:bg-boardtree-accent-hover">
              Create automation
            </button>
            <button
              type="button"
              onClick={() => setIsCreateMenuOpen((open) => !open)}
              aria-label="More ways to create an automation"
              aria-haspopup="menu"
              aria-expanded={is_create_menu_open}
              className="flex h-9 w-8 items-center justify-center rounded-r-[4px] border-l border-white/30 bg-boardtree-accent text-white hover:bg-boardtree-accent-hover"
            >
              <ChevronDownIcon size={14} />
            </button>
            {is_create_menu_open && (
              <div role="menu" className={`${MENU_PANEL} right-0 top-full w-[230px]`}>
                <button type="button" role="menuitem" onClick={() => { setIsCreateMenuOpen(false); onExploreTemplates(); }} className={MENU_ITEM}>
                  <PlusIcon size={14} />
                  Email and Slack template
                </button>
                {onOpenBoardAutomations && (
                  <button type="button" role="menuitem" onClick={() => { setIsCreateMenuOpen(false); onOpenBoardAutomations(); }} className={MENU_ITEM}>
                    <AutomateIcon size={14} />
                    Board automation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Manage sections" className="mb-5 flex gap-1 border-b border-boardtree-border-soft">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] transition-colors ${tab === item.id ? "border-boardtree-accent text-boardtree-text" : "border-transparent text-boardtree-text-muted hover:text-boardtree-text"}`}
          >
            {item.label}
            {item.id === "automations" && automations.length > 0 && <span className="ml-1.5 text-[12px] text-boardtree-text-faint">{automations.length}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "automations" && (
          <ManageAutomationsTab
            board_label={board_label}
            automations={automations}
            columns={columns}
            groups={groups}
            people={people}
            onToggle={props.onToggle}
            onRename={props.onRename}
            onDuplicate={props.onDuplicate}
            onDelete={props.onDelete}
            onExploreTemplates={onExploreTemplates}
          />
        )}
        {tab === "runs" && <RunHistoryTab board_id={board_id} view_id={view_id} automations={automations} onAddAutomation={onExploreTemplates} />}
        {tab === "connections" && <MyConnectionsTab slack={slack} return_path={return_path} automations={automations} onOpenSetup={onOpenConnections} />}
        {tab === "usage" && <UsageTab board_id={board_id} view_id={view_id} />}
      </div>
    </div>
  );
}
