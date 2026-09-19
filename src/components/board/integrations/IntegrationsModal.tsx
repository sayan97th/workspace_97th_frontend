"use client";
import React, { useState } from "react";
import SlackLogo from "@/components/slack/SlackLogo";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import type { BoardAutomationDto, CreateBoardAutomationPayload } from "@/types/board-automation";
import { AutomateIcon } from "@/icons/board-icons";
import { ChatBubbleIcon, LinkIcon } from "@/icons/workspace-icons";
import type { ColumnDef, PersonDef } from "../table/types";
import AutomationsList from "../automations/AutomationsList";
import { COMMUNICATION_ACTION_TYPES } from "../automations/communicationTemplates";
import CommunicationView, { type ChannelFilter } from "./CommunicationView";
import ConnectionsView from "./ConnectionsView";
import { EnvelopeIcon } from "./integrationUi";

/** What the Communication and Active automations categories need. Omitted on boards without an automations engine, which hides both. */
export type IntegrationsAutomationTools = {
  automations: BoardAutomationDto[];
  /** This tab's item-scope columns, for the trigger and recipient pickers. */
  columns: ColumnDef[];
  people: PersonDef[];
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
};

export type IntegrationsModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_label: string;
  /**
   * In-app path Slack sends the browser back to after an OAuth round trip. It should reopen this
   * dialog, e.g. `/boards/42?integrate=slack`, see `TableBoardView`.
   */
  return_path: string;
  automation_tools?: IntegrationsAutomationTools;
};

type Mode = "create" | "manage";
type View = "connections" | "communication";

const NAV_ROW = "flex h-10 w-full items-center gap-3 rounded-[6px] px-3 text-left text-[14px] transition-colors";

/**
 * Board header's "Integrate" button. A wide dialog with Create and Manage tabs in its header. Create has
 * a Categories sidebar that switches the right side between Connections (Email and Slack) and
 * Communication (the email and Slack automation templates). Manage lists the email and Slack
 * automations already set up on this table. Boards without an automations engine only get Connections.
 */
export default function IntegrationsModal({ is_open, onClose, board_label, return_path, automation_tools }: IntegrationsModalProps) {
  if (!is_open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Integrations"
        onClick={(e) => e.stopPropagation()}
        className="flex h-[82vh] max-h-[860px] w-[1120px] max-w-[96vw] flex-col overflow-hidden rounded-[14px] bg-boardtree-surface shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <IntegrationsModalBody board_label={board_label} onClose={onClose} return_path={return_path} automation_tools={automation_tools} />
      </div>
    </div>
  );
}

/** Split from the shell so Slack's status is only fetched once the dialog is actually open. */
function IntegrationsModalBody({ board_label, onClose, return_path, automation_tools }: Pick<IntegrationsModalProps, "board_label" | "onClose" | "return_path" | "automation_tools">) {
  const slack = useSlackIntegration();
  const [mode, setMode] = useState<Mode>("create");
  const [view, setView] = useState<View>("connections");
  const [channel_filter, setChannelFilter] = useState<ChannelFilter>("all");

  const communication_automations = (automation_tools?.automations ?? []).filter((a) => COMMUNICATION_ACTION_TYPES.includes(a.action_type));
  const is_slack_connected = slack.status?.is_connected === true;

  const nav_items: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "connections", label: "Connections", icon: <LinkIcon size={17} /> },
    ...(automation_tools ? [{ id: "communication" as const, label: "Communication", icon: <ChatBubbleIcon size={17} /> }] : []),
  ];

  const browseTemplates = (filter: ChannelFilter) => {
    setChannelFilter(filter);
    setView("communication");
    setMode("create");
  };

  const header = (
    <div className="relative flex flex-none items-center justify-between gap-4 border-b border-boardtree-border-soft px-6 py-3.5">
      <div className="min-w-0 truncate text-[17px] text-boardtree-text">
        <span className="font-bold">Integrations</span> <span className="font-normal">{board_label}</span>
      </div>

      {automation_tools && (
        <div role="tablist" aria-label="Integrations mode" className="absolute left-1/2 flex -translate-x-1/2 overflow-hidden rounded-[6px] border border-boardtree-border text-[14px]">
          {(["create", "manage"] as const).map((mode_id) => (
            <button
              key={mode_id}
              type="button"
              role="tab"
              aria-selected={mode === mode_id}
              onClick={() => setMode(mode_id)}
              className={`px-7 py-2 capitalize ${mode === mode_id ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
            >
              {mode_id}
              {mode_id === "manage" && communication_automations.length > 0 ? ` (${communication_automations.length})` : ""}
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
        <svg viewBox="0 0 14 14" width="13" height="13"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
    </div>
  );

  return (
    <>
      {header}
      <div className="flex min-h-0 flex-1">
        {mode === "create" && (
          <nav aria-label="Categories" className="flex w-[250px] flex-none flex-col justify-between border-r border-boardtree-border-soft bg-boardtree-panel-alt px-4 py-5">
            <div>
              <div className="mb-3 px-3 text-[18px] font-semibold text-boardtree-text">Categories</div>
              <div className="flex flex-col gap-1">
                {nav_items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    aria-current={view === item.id ? "page" : undefined}
                    className={`${NAV_ROW} ${view === item.id ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
                  >
                    <span className="flex flex-none items-center">{item.icon}</span>
                    <span className="flex-1 truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[8px] border border-boardtree-border bg-boardtree-surface px-3 py-2.5">
              <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-boardtree-text-faint">Channels</div>
              <div className="flex flex-col gap-1.5 text-[12.5px] text-boardtree-text-secondary">
                <div className="flex items-center gap-2">
                  <span className="flex w-[18px] justify-center text-boardtree-text-muted"><EnvelopeIcon size={15} /></span>
                  <span className="flex-1">Email</span>
                  <span className="h-2 w-2 rounded-full bg-[#00c875]" aria-label="Ready" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex w-[18px] justify-center"><SlackLogo size={14} /></span>
                  <span className="flex-1">Slack</span>
                  <span className={`h-2 w-2 rounded-full ${is_slack_connected ? "bg-[#00c875]" : "bg-boardtree-text-faint"}`} aria-label={is_slack_connected ? "Connected" : "Not connected"} />
                </div>
              </div>
            </div>
          </nav>
        )}

        <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
          {mode === "create" && view === "connections" && <ConnectionsView slack={slack} return_path={return_path} onBrowseTemplates={automation_tools ? browseTemplates : undefined} />}

          {mode === "create" && view === "communication" && automation_tools && (
            <CommunicationView
              slack={slack}
              columns={automation_tools.columns}
              people={automation_tools.people}
              channel_filter={channel_filter}
              onChannelFilterChange={setChannelFilter}
              onCreate={automation_tools.onCreate}
              onCreated={() => setMode("manage")}
              onGoToConnections={() => setView("connections")}
            />
          )}

          {mode === "manage" && automation_tools && (
            <div className="max-w-[720px]">
              <h2 className="text-[20px] font-semibold text-boardtree-text">Manage</h2>
              <p className="mb-4 mt-1 text-[13px] text-boardtree-text-muted">Email and Slack automations on this table. Board actions live under Automate.</p>
              <AutomationsList
                automations={communication_automations}
                columns={automation_tools.columns}
                groups={[]}
                people={automation_tools.people}
                onToggle={automation_tools.onToggle}
                onDelete={automation_tools.onDelete}
                empty_state={
                  <>
                    No email or Slack automations yet.{" "}
                    <button type="button" onClick={() => browseTemplates("all")} className="font-medium text-boardtree-accent hover:underline">Browse templates</button>
                  </>
                }
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
