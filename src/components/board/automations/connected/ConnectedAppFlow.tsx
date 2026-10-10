"use client";
import React, { useState } from "react";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { useExternalAccounts } from "@/hooks/useExternalAccounts";
import { EXTERNAL_APPS } from "@/lib/externalApps";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import type { CreateBoardAutomationPayload } from "@/types/board-automation";
import type { ColumnDef, PersonDef } from "../../table/types";
import type { NamedOption } from "../builder/automationCatalog";
import ConnectedAccountStep from "./ConnectedAccountStep";
import ConnectedRecipeEditor from "./ConnectedRecipeEditor";
import type { ConnectedRecipe } from "./connectedRecipes";

export type ConnectedAppFlowProps = {
  connected: ConnectedRecipe;
  columns: ColumnDef[];
  groups: NamedOption[];
  people: PersonDef[];
  /** Administrators get a link to Administration > Integrations while the provider app is not set up. */
  can_manage: boolean;
  /** Where the provider sends the browser back to when the new tab was blocked. */
  return_path: string;
  onBack: () => void;
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  /** Called once the automation was saved, so the host can show it in Manage. */
  onCreated: () => void;
};

type Step = "account" | "editor";

/**
 * monday.com's integration flow for Gmail, Outlook and Google Calendar, drawn over the whole
 * dialog in the app's colour like the Slack one: pick or connect the account, then fill the recipe
 * sentence and create the automation.
 */
export default function ConnectedAppFlow({ connected, columns, groups, people, can_manage, return_path, onBack, onCreate, onCreated }: ConnectedAppFlowProps) {
  const accounts_api = useExternalAccounts(connected.app);
  const app = EXTERNAL_APPS[connected.app];
  const [step, setStep] = useState<Step>("account");
  const [selected_id, setSelectedId] = useState<number | null>(null);
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);

  // The account just connected in the provider's tab is picked and the recipe opens, once the list has it.
  const { connected_id, accounts } = accounts_api;
  if (connected_id !== null && accounts.some((account) => account.id === connected_id)) {
    accounts_api.consumeConnected();
    setSelectedId(connected_id);
    setStep("editor");
  }

  const effective_id = selected_id ?? accounts[0]?.id ?? null;
  const account = accounts.find((entry) => entry.id === effective_id) ?? null;

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
    <div role="region" aria-label={`${app.label} integration`} style={{ background: app.brand_color }} className="absolute inset-0 z-30 flex flex-col overflow-y-auto text-white">
      <div className="flex flex-none items-center px-8 pt-6">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-[14px] text-white/90 hover:text-white">
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2.5 L4 6 L7.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back
        </button>
      </div>

      {step === "account" || !account ? (
        <ConnectedAccountStep
          accounts_api={accounts_api}
          selected_id={effective_id}
          onSelect={setSelectedId}
          onContinue={() => setStep("editor")}
          can_manage={can_manage}
          return_path={return_path}
        />
      ) : (
        <ConnectedRecipeEditor
          connected={connected}
          columns={columns}
          groups={groups}
          people={people}
          account={account}
          is_saving={is_saving}
          save_error={save_error}
          onChangeAccount={() => setStep("account")}
          onCreate={(payload) => void create(payload)}
        />
      )}

      <div className="flex flex-none items-center gap-2 px-8 pb-6 text-[20px] font-semibold tracking-tight" aria-hidden="true">
        <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white"><ExternalAppLogo app={connected.app} size={20} /></span>
        {app.label}
      </div>
    </div>
  );
}
