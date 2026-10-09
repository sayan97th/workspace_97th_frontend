"use client";
import React, { useState } from "react";
import SlackLogo from "@/components/slack/SlackLogo";
import { useSlackConnections } from "@/hooks/useSlackConnections";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { CreateBoardAutomationPayload } from "@/types/board-automation";
import type { SlackStatusDto } from "@/types/slack";
import type { ColumnDef, PersonDef } from "../../table/types";
import type { NamedOption } from "../builder/automationCatalog";
import SlackAccountStep from "./SlackAccountStep";
import { SLACK_PURPLE } from "./SlackAppPage";
import SlackRecipeEditor from "./SlackRecipeEditor";
import type { SlackRecipe } from "./slackRecipes";

export type SlackIntegrationFlowProps = {
  recipe: SlackRecipe;
  columns: ColumnDef[];
  people: PersonDef[];
  /** This tab's items, for the item scoped update recipes. */
  items?: NamedOption[];
  /** The account wide Slack status, direct message recipes go through the active workspace. */
  slack_status: SlackStatusDto | null;
  /** Where Slack sends the browser back to when the new tab was blocked. */
  return_path: string;
  onBack: () => void;
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  /** Called once the automation was saved, so the host can show it in Manage. */
  onCreated: () => void;
};

type Step = "account" | "editor";

/**
 * monday.com's Slack integration flow, drawn over the whole dialog in Slack purple: pick or connect
 * the Slack account, then fill the recipe sentence and create the automation. Channel recipes post
 * through the chosen account. Direct message recipes use the active workspace, so they only ask for
 * an account while no workspace is connected at all.
 */
export default function SlackIntegrationFlow({ recipe, columns, people, items, slack_status, return_path, onBack, onCreate, onCreated }: SlackIntegrationFlowProps) {
  const slack_connections = useSlackConnections(true);
  const needs_account = recipe.target === "channel" || slack_status?.is_connected !== true;
  const [step, setStep] = useState<Step>(needs_account ? "account" : "editor");
  const [selected_id, setSelectedId] = useState<number | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);

  // The account just connected in the Slack tab is picked and the recipe opens, once the list has it.
  const { connected_id, connections } = slack_connections;
  if (connected_id !== null && connections.some((connection) => connection.id === connected_id)) {
    slack_connections.consumeConnected();
    setSelectedId(connected_id);
    setStep("editor");
  }

  const effective_id = selected_id ?? connections[0]?.id ?? null;
  const connection = connections.find((entry) => entry.id === effective_id) ?? null;
  const active_workspace_name = slack_status?.workspace?.team_name ?? (recipe.target === "person" ? connection?.team_name ?? null : null);

  const create = async (payload: Omit<CreateBoardAutomationPayload, "view_id">) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onCreate(payload);
      onCreated();
    } catch (failure) {
      setSaveError(apiErrorMessage(failure, "The automation could not be created."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div role="region" aria-label="Slack integration" style={{ background: SLACK_PURPLE }} className="absolute inset-0 z-30 flex flex-col overflow-y-auto text-white">
      <div className="flex flex-none items-center px-8 pt-6">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-[14px] text-white/90 hover:text-white">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
      </div>

      {step === "account" || (recipe.target === "channel" && !connection) ? (
        <SlackAccountStep
          slack_connections={slack_connections}
          selected_id={effective_id}
          onSelect={setSelectedId}
          onContinue={() => setStep("editor")}
          can_manage={slack_status?.can_manage ?? false}
          return_path={return_path}
        />
      ) : (
        <SlackRecipeEditor
          recipe={recipe}
          columns={columns}
          people={people}
          items={items}
          connection={recipe.target === "channel" ? connection : null}
          active_workspace_name={active_workspace_name}
          is_saving={is_saving}
          save_error={save_error}
          onChangeAccount={recipe.target === "channel" ? () => setStep("account") : undefined}
          onCreate={(payload) => void create(payload)}
        />
      )}

      <div className="flex flex-none items-center gap-1.5 px-8 pb-6 text-[22px] font-bold tracking-tight" aria-hidden="true">
        <SlackLogo size={22} />
        slack
      </div>
    </div>
  );
}
