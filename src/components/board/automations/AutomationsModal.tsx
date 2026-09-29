"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { PersonDef } from "../table/types";
import type {
  BoardAutomationDefinition,
  BoardAutomationDto,
  BoardAutomationTemplateDto,
  CreateBoardAutomationPayload,
  UpdateBoardAutomationPayload,
} from "@/types/board-automation";
import { useSlackAutomationOptions } from "@/hooks/useSlackAutomationOptions";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { boardAutomationService } from "@/services/board-automation.service";
import { boardContentService } from "@/services/board-content.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import ManageView from "../integrations/manage/ManageView";
import AutomationBuilder, { type AutomationBuilderSaveMeta } from "./builder/AutomationBuilder";
import TemplateGallery from "./builder/TemplateGallery";
import type { AutomationBoardTarget, AutomationBuilderContext, AutomationColumn, NamedOption } from "./builder/automationCatalog";
import { draftFromAutomation, draftFromDefinition, emptyDraft, type AutomationDraft } from "./builder/builderDraft";

export type AutomationsModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  /** The active tab, automations and their history are scoped to it. */
  view_id: number | null;
  board_label: string;
  /** In-app path Slack sends the browser back to after connecting, see `IntegrationsModal`. */
  return_path: string;
  automations: BoardAutomationDto[];
  /** Every item and subitem column of this tab, hidden ones included. */
  columns: AutomationColumn[];
  groups: NamedOption[];
  people: PersonDef[];
  onCreate: (payload: Omit<CreateBoardAutomationPayload, "view_id">) => Promise<void>;
  onUpdate: (automation_id: number, payload: UpdateBoardAutomationPayload) => Promise<void>;
  onToggle: (automation_id: number, is_enabled: boolean) => Promise<void>;
  onDuplicate: (automation_id: number) => Promise<void>;
  onDelete: (automation_id: number) => Promise<void>;
  /** Opens straight into the builder for this automation, e.g. from the Integrations dialog's Manage list. */
  edit_automation_id?: number | null;
  /** Opens the Integrations dialog's email and Slack templates, the menu entry is hidden when omitted. */
  onOpenCommunicationTemplates?: () => void;
};

type Mode = "create" | "manage";
type Screen = { kind: "gallery" } | { kind: "builder"; draft: AutomationDraft; editing_id: number | null; key: number };

/**
 * The board header's "Automate" button, modelled on monday's automation center: a Create tab with
 * the template gallery and the sentence builder, and a Manage tab with this table's automations,
 * their run history, connections and usage.
 */
export default function AutomationsModal(props: AutomationsModalProps) {
  if (!props.is_open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(30,34,55,0.35)]" onClick={props.onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Automations"
        onClick={(event) => event.stopPropagation()}
        className="flex h-[88vh] max-h-[920px] w-[1200px] max-w-[96vw] flex-col overflow-hidden rounded-[14px] bg-boardtree-surface shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <AutomationCenter {...props} />
      </div>
    </div>
  );
}

/** Split from the shell so boards, templates and Slack are only fetched once the dialog is open. */
function AutomationCenter(props: AutomationsModalProps) {
  const { board_id, view_id, board_label, return_path, automations, columns, groups, people, onClose, edit_automation_id } = props;
  const slack = useSlackIntegration();
  const slack_options = useSlackAutomationOptions(true);
  const [board_targets, setBoardTargets] = useState<AutomationBoardTarget[]>([]);
  const [is_loading_boards, setIsLoadingBoards] = useState(true);
  const [saved_templates, setSavedTemplates] = useState<BoardAutomationTemplateDto[]>([]);
  const [is_loading_templates, setIsLoadingTemplates] = useState(true);
  const [mode, setMode] = useState<Mode>(edit_automation_id || automations.length > 0 ? "manage" : "create");
  const [screen, setScreen] = useState<Screen>({ kind: "gallery" });
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    boardContentService
      .getItemMoveTargets(board_id)
      .then((targets) => {
        if (!cancelled) setBoardTargets(targets.map((target) => ({ id: target.id, label: target.label, groups: target.groups.map((group) => ({ id: group.id, name: group.name })) })));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingBoards(false);
      });
    boardAutomationService
      .getTemplates(board_id)
      .then((templates) => {
        if (!cancelled) setSavedTemplates(templates);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingTemplates(false);
      });
    return () => {
      cancelled = true;
    };
  }, [board_id]);

  const context: AutomationBuilderContext = useMemo(
    () => ({
      board_id,
      columns,
      groups,
      people,
      board_targets,
      slack_channels: slack_options.channels.map((channel) => ({ id: channel.id, name: channel.name })),
      is_slack_connected: slack_options.status?.is_connected === true,
    }),
    [board_id, columns, groups, people, board_targets, slack_options.channels, slack_options.status]
  );

  const openBuilder = (draft: AutomationDraft, editing_id: number | null = null) => {
    setSaveError(null);
    setMode("create");
    setScreen({ kind: "builder", draft, editing_id, key: Date.now() });
  };

  // Opened from another dialog to edit one automation, straight into the builder.
  const [handled_edit_id, setHandledEditId] = useState<number | null>(null);
  if (edit_automation_id && edit_automation_id !== handled_edit_id) {
    const automation = automations.find((entry) => entry.id === edit_automation_id);
    setHandledEditId(edit_automation_id);
    if (automation) {
      setMode("create");
      setScreen({ kind: "builder", draft: draftFromAutomation(automation, context), editing_id: automation.id, key: Date.now() });
    }
  }

  const editAutomation = (automation: BoardAutomationDto) => openBuilder(draftFromAutomation(automation, context), automation.id);

  const save = async (definition: BoardAutomationDefinition, meta: AutomationBuilderSaveMeta, editing_id: number | null) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const payload = { ...definition, ...meta };
      if (editing_id) await props.onUpdate(editing_id, payload);
      else await props.onCreate(payload);
      setScreen({ kind: "gallery" });
      setMode("manage");
    } catch (failure) {
      setSaveError(apiErrorMessage(failure, editing_id ? "The automation could not be saved." : "The automation could not be created."));
    } finally {
      setIsSaving(false);
    }
  };

  const saveAsTemplate = async (automation_id: number, name: string) => {
    const template = await boardAutomationService.saveAsTemplate(board_id, automation_id, { name });
    setSavedTemplates((current) => [template, ...current]);
  };

  const deleteTemplate = async (template_id: number) => {
    await boardAutomationService.deleteTemplate(board_id, template_id);
    setSavedTemplates((current) => current.filter((template) => template.id !== template_id));
  };

  const is_in_builder = mode === "create" && screen.kind === "builder";

  return (
    <>
      <div className="relative flex flex-none items-center justify-between gap-4 border-b border-boardtree-border-soft px-6 py-3.5">
        <div className="min-w-0 truncate text-[17px] text-boardtree-text">
          <span className="font-bold">Automations</span> <span className="font-normal">{board_label}</span>
        </div>

        <div role="tablist" aria-label="Automations mode" className="absolute left-1/2 flex -translate-x-1/2 overflow-hidden rounded-[6px] border border-boardtree-border text-[14px]">
          {(["create", "manage"] as const).map((mode_id) => (
            <button
              key={mode_id}
              type="button"
              role="tab"
              aria-selected={mode === mode_id}
              onClick={() => {
                setMode(mode_id);
                if (mode_id === "create") setScreen({ kind: "gallery" });
              }}
              className={`px-8 py-2 capitalize ${mode === mode_id ? "bg-boardtree-accent-surface font-medium text-boardtree-accent" : "text-boardtree-text-secondary hover:bg-boardtree-hover"}`}
            >
              {mode_id}
              {mode_id === "manage" ? ` / ${automations.length}` : ""}
            </button>
          ))}
        </div>

        <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 flex-none items-center justify-center rounded-[6px] text-boardtree-text-muted hover:bg-boardtree-hover">
          <svg viewBox="0 0 14 14" width="13" height="13"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 bg-boardtree-surface">
        {mode === "create" && screen.kind === "gallery" && (
          <TemplateGallery
            context={context}
            saved_templates={saved_templates}
            is_loading_saved={is_loading_templates}
            onUseRecipe={(recipe) => openBuilder(draftFromDefinition(recipe.build(context), context))}
            onUseSaved={(template) => openBuilder({ ...draftFromDefinition(template.definition, context), name: template.name, description: template.description ?? "" })}
            onDeleteSaved={deleteTemplate}
            onCustom={() => openBuilder(emptyDraft())}
          />
        )}

        {is_in_builder && screen.kind === "builder" && (
          <div className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
            <AutomationBuilder
              key={screen.key}
              context={context}
              initial_draft={screen.draft}
              mode={screen.editing_id ? "edit" : "create"}
              is_loading_boards={is_loading_boards}
              is_saving={is_saving}
              save_error={save_error}
              onBack={() => {
                setSaveError(null);
                if (screen.editing_id) setMode("manage");
                setScreen({ kind: "gallery" });
              }}
              onSave={(definition, meta) => void save(definition, meta, screen.editing_id)}
            />
          </div>
        )}

        {mode === "manage" && (
          <div className="min-w-0 flex-1 overflow-y-auto bg-boardtree-panel-alt px-8 py-6">
            <ManageView
              board_id={board_id}
              view_id={view_id}
              board_label={board_label}
              slack={slack}
              return_path={return_path}
              automations={automations}
              context={context}
              onToggle={props.onToggle}
              onUpdate={props.onUpdate}
              onDuplicate={props.onDuplicate}
              onDelete={props.onDelete}
              onEdit={editAutomation}
              onSaveAsTemplate={saveAsTemplate}
              onExploreTemplates={() => {
                setMode("create");
                setScreen({ kind: "gallery" });
              }}
              onCreateCustom={() => openBuilder(emptyDraft())}
              onExploreCommunication={props.onOpenCommunicationTemplates}
              onOpenConnections={props.onOpenCommunicationTemplates ?? (() => {})}
            />
          </div>
        )}
      </div>
    </>
  );
}
