"use client";
import React, { useState } from "react";
import SlackLogo from "@/components/slack/SlackLogo";
import type { SlackIntegrationApi } from "@/hooks/useSlackIntegration";
import { useSlackAutomationOptions } from "@/hooks/useSlackAutomationOptions";
import type { CreateBoardAutomationPayload } from "@/types/board-automation";
import type { ColumnDef, PersonDef } from "../table/types";
import CommunicationRecipeForm from "../automations/CommunicationRecipeForm";
import CommunicationTemplateCard from "../automations/CommunicationTemplateCard";
import { COMMUNICATION_TEMPLATES, type CommunicationChannel, type CommunicationTemplate } from "../automations/communicationTemplates";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { EnvelopeIcon, SECONDARY_BUTTON } from "./integrationUi";

export type ChannelFilter = "all" | "email" | "slack";

export type CommunicationViewProps = {
  slack: SlackIntegrationApi;
  columns: ColumnDef[];
  people: PersonDef[];
  channel_filter: ChannelFilter;
  onChannelFilterChange: (filter: ChannelFilter) => void;
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  /** Called once an automation was saved, so the dialog can show it under "Active automations". */
  onCreated: () => void;
  onGoToConnections: () => void;
};

const channelMatchesFilter = (channel: CommunicationChannel, filter: ChannelFilter) =>
  filter === "all" || (filter === "email" ? channel === "email" : channel !== "email");

const TILE = "flex h-[70px] w-[190px] flex-none items-center justify-center gap-2.5 rounded-[6px] text-[26px] transition-shadow";

/**
 * Integrate dialog > Communication. The template library for messaging automations: pick a channel
 * tile (Email or Slack) to narrow the list, search, then "Use template" opens the form in place.
 */
export default function CommunicationView({ slack, columns, people, channel_filter, onChannelFilterChange, onCreate, onCreated, onGoToConnections }: CommunicationViewProps) {
  const slack_options = useSlackAutomationOptions(true);
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState<CommunicationTemplate | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);

  const search_text = search.trim().toLowerCase();
  const visible_templates = COMMUNICATION_TEMPLATES.filter((t) => channelMatchesFilter(t.channel, channel_filter) && t.search_text.includes(search_text));
  const is_slack_connected = slack.status?.is_connected === true;

  const toggleFilter = (filter: Exclude<ChannelFilter, "all">) => onChannelFilterChange(channel_filter === filter ? "all" : filter);

  const save = async (payload: Omit<CreateBoardAutomationPayload, "view_id">) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onCreate(payload);
      setTemplate(null);
      onCreated();
    } catch (failure) {
      setSaveError(apiErrorMessage(failure, "The automation could not be created."));
    } finally {
      setIsSaving(false);
    }
  };

  if (template) {
    return (
      <div className="max-w-[560px]">
        <button
          type="button"
          onClick={() => {
            setTemplate(null);
            setSaveError(null);
          }}
          className="mb-3 flex items-center gap-1.5 text-[12.5px] font-medium text-boardtree-text-muted hover:text-boardtree-text"
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M7.5 3 L4.3 6 L7.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to templates
        </button>
        {save_error && (
          <div role="alert" className="mb-3 rounded-[8px] border border-boardtree-danger/30 bg-boardtree-danger-hover px-3 py-2 text-[12.5px] text-boardtree-danger">{save_error}</div>
        )}
        <CommunicationRecipeForm template={template} columns={columns} people={people} slack={slack_options} is_saving={is_saving} onSave={save} onGoToConnections={onGoToConnections} />
      </div>
    );
  }

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search templates"
        aria-label="Search templates"
        className="mb-6 h-10 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface px-3.5 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
      />

      <h2 className="text-[22px] font-semibold text-boardtree-text">Communication</h2>
      <p className="mb-4 mt-1 text-[13px] text-boardtree-text-muted">Keep your team in the loop with notification and messaging templates.</p>

      <div className="mb-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => toggleFilter("email")}
          aria-pressed={channel_filter === "email"}
          className={`${TILE} bg-boardtree-panel-alt text-boardtree-text-secondary ${channel_filter === "email" ? "ring-2 ring-boardtree-accent" : "hover:shadow-[0_4px_14px_rgba(30,34,55,0.12)]"}`}
        >
          <EnvelopeIcon size={30} />
          <span>Email</span>
        </button>
        <button
          type="button"
          onClick={() => toggleFilter("slack")}
          aria-pressed={channel_filter === "slack"}
          className={`${TILE} bg-[#4a154b] font-bold tracking-tight text-white ${channel_filter === "slack" ? "ring-2 ring-boardtree-accent ring-offset-2 ring-offset-boardtree-surface" : "hover:shadow-[0_4px_14px_rgba(30,34,55,0.25)]"}`}
        >
          <SlackLogo size={26} />
          <span>slack</span>
        </button>
      </div>

      {channel_filter !== "email" && !slack.is_loading && !is_slack_connected && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-[8px] border border-boardtree-border-soft bg-boardtree-panel-alt px-3.5 py-2.5 text-[12.5px] text-boardtree-text-muted">
          <span>Slack is not connected yet, so Slack templates cannot be saved.</span>
          <button type="button" onClick={onGoToConnections} className={`${SECONDARY_BUTTON} flex-none`}>Go to Connections</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible_templates.map((t) => (
          <CommunicationTemplateCard key={t.id} template={t} onUse={setTemplate} />
        ))}
      </div>
      {visible_templates.length === 0 && <div className="text-[12.5px] text-boardtree-text-faint">No templates match your search.</div>}
    </div>
  );
}
