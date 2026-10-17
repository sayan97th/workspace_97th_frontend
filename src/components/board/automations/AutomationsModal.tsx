"use client";
import React, { useEffect, useMemo, useState } from "react";
import type { PersonDef } from "../table/types";
import type {
  AccountAutomationTemplateDto,
  BoardAutomationDefinition,
  BoardAutomationDto,
  BoardAutomationSource,
  BoardAutomationTeamDto,
  BoardAutomationTemplateDto,
  CreateBoardAutomationPayload,
  UpdateBoardAutomationPayload,
} from "@/types/board-automation";
import { useAuth } from "@/context/AuthContext";
import { useIntegrationOverview } from "@/hooks/useIntegrationOverview";
import { useSlackAutomationOptions } from "@/hooks/useSlackAutomationOptions";
import { useSlackIntegration } from "@/hooks/useSlackIntegration";
import { boardAutomationService } from "@/services/board-automation.service";
import { boardContentService } from "@/services/board-content.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { SearchIcon } from "@/icons/workspace-icons";
import ConnectionsView from "../integrations/ConnectionsView";
import ManageView from "../integrations/manage/ManageView";
import { automationSource } from "../integrations/manage/manageFormat";
import AutomationBuilder, { type AutomationBuilderSaveMeta } from "./builder/AutomationBuilder";
import ButtonAutomationBuilder from "./builder/ButtonAutomationBuilder";
import TemplateGallery from "./builder/TemplateGallery";
import type { AutomationBoardTarget, AutomationBuilderContext, AutomationColumn, NamedOption } from "./builder/automationCatalog";
import { draftFromAutomation, draftFromDefinition, emptyDraft, type AutomationDraft } from "./builder/builderDraft";
import { definitionFromAccountTemplate, describeColumnNeed } from "./builder/accountTemplates";
import { draftForColumn } from "./builder/automationColumns";
import type { AutomationRecipe } from "./builder/automationTemplates";
import AutomationCenterSidebar from "./center/AutomationCenterSidebar";
import EmailAppPage from "./center/EmailAppPage";
import IntegrationsOverview from "./center/IntegrationsOverview";
import { DEFAULT_AUTOMATIONS_PAGE, DEFAULT_INTEGRATIONS_PAGE, type CenterPage, type IntegrationPage } from "./center/centerNav";
import ConnectedAppFlow from "./connected/ConnectedAppFlow";
import ConnectedAppPage from "./connected/ConnectedAppPage";
import { connectedRecipeFor, type ConnectedRecipe } from "./connected/connectedRecipes";
import SlackAppPage from "./slack/SlackAppPage";
import SlackIntegrationFlow from "./slack/SlackIntegrationFlow";
import type { SlackRecipe } from "./slack/slackRecipes";
import "./center/automation-center.scss";

export type AutomationsModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  /** The active tab, automations and their history are scoped to it. */
  view_id: number | null;
  board_label: string;
  /**
   * In-app path Slack, Google and Microsoft send the browser back to after an OAuth round trip. It
   * should reopen the Integrations dialog on Connections, e.g. `/boards/42?integrate=slack`, see `TableBoardView`.
   */
  return_path: string;
  /**
   * `board` (the default) is the Automate button's Automations dialog: automations that stay inside
   * the app. `integrations` is the Integrate button's Integrations dialog: email, Slack, Gmail,
   * Outlook and Google Calendar. Each one only lists, builds and counts its own automations.
   */
  variant?: BoardAutomationSource;
  /** Integrations dialog only: the page it opens on, e.g. Connections after an OAuth round trip. */
  initial_integration_page?: IntegrationPage;
  /**
   * Automations are scoped to a Table view. Without one (Kanban, Calendar...) the Integrations
   * dialog only offers the overview and the connection setup, and nothing below is fetched.
   */
  has_automations?: boolean;
  /** Every automation of the tab, each dialog keeps its own, see `automationSource`. */
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
  /** Opens straight into the builder for this automation, e.g. from an item's automations panel or a link. */
  edit_automation_id?: number | null;
  /** Opens straight into a new automation watching this column, the column header's "Automate". */
  create_for_column_id?: string | null;
  /** This board's form views, for the "form is submitted" trigger. */
  forms?: NamedOption[];
  /** Items of this table a test run can use. */
  test_items?: NamedOption[];
  /** Replaces one automation after a change made inside the dialog, such as a restored version. */
  onReplaceAutomation?: (automation: BoardAutomationDto) => void;
  /** Reloads the automations after bulk changes or a copy. */
  onReloadAutomations?: () => Promise<void>;
  /** Automations dialog only: opens the Integrations dialog, from Manage's "Integration template" entry. */
  onOpenIntegrations?: (page?: IntegrationPage) => void;
};

type Mode = "create" | "manage";
type Screen =
  | { kind: "gallery" }
  | { kind: "builder"; draft: AutomationDraft; editing_id: number | null; key: number; notice?: string | null }
  /** The Button column's own full screen builder, see `ButtonAutomationBuilder`. Back returns to the center. */
  | { kind: "button"; draft: AutomationDraft; key: number };

/**
 * The board header's "Automate" button, modelled on monday.com's automation center: a Create tab
 * with the template categories and the sentence builder, and a Manage tab with this table's
 * automations, their run history and usage. Only automations that stay inside the app live here,
 * the same engine with `variant="integrations"` is the Integrations dialog (`IntegrationsModal`).
 */
export default function AutomationsModal(props: AutomationsModalProps) {
  if (!props.is_open) return null;

  return (
    <div className="automation-center" onClick={props.onClose}>
      <div role="dialog" aria-modal="true" aria-label={props.variant === "integrations" ? "Integrations" : "Automations"} onClick={(event) => event.stopPropagation()} className="automation-center__dialog">
        <AutomationCenter {...props} />
      </div>
    </div>
  );
}

/** Split from the shell so boards, templates and Slack are only fetched once the dialog is open. */
function AutomationCenter(props: AutomationsModalProps) {
  const { board_id, view_id, board_label, return_path, automations, columns, groups, people, onClose, edit_automation_id, create_for_column_id, forms = [], test_items = [], has_automations = true, variant = "board" } = props;
  const is_integrations = variant === "integrations";
  const { hasAnyRole, user } = useAuth();
  const is_account_admin = hasAnyRole("super_admin", "admin");
  const slack = useSlackIntegration();
  const slack_options = useSlackAutomationOptions(has_automations && is_integrations);
  const overview = useIntegrationOverview(is_integrations);
  const [board_targets, setBoardTargets] = useState<AutomationBoardTarget[]>([]);
  const [is_loading_boards, setIsLoadingBoards] = useState(true);
  const [saved_templates, setSavedTemplates] = useState<BoardAutomationTemplateDto[]>([]);
  const [is_loading_templates, setIsLoadingTemplates] = useState(true);
  const [account_templates, setAccountTemplates] = useState<AccountAutomationTemplateDto[]>([]);
  const [is_loading_account, setIsLoadingAccount] = useState(true);
  const [teams, setTeams] = useState<BoardAutomationTeamDto[]>([]);
  // This dialog's automations: the ones that stay inside the app, or the ones that use an integration.
  const own_automations = useMemo(() => automations.filter((automation) => automationSource(automation) === variant), [automations, variant]);
  const [page, setPage] = useState<CenterPage>(() => (is_integrations ? { section: "integrations", page: props.initial_integration_page ?? "overview" } : DEFAULT_AUTOMATIONS_PAGE));
  // Automate lands on Manage once the table has automations, Integrate always on its apps.
  const [mode, setMode] = useState<Mode>(has_automations && (edit_automation_id || (!is_integrations && own_automations.length > 0)) ? "manage" : "create");
  const [screen, setScreen] = useState<Screen>({ kind: "gallery" });
  const [search, setSearch] = useState("");
  const [is_saving, setIsSaving] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [slack_recipe, setSlackRecipe] = useState<SlackRecipe | null>(null);
  const [connected_recipe, setConnectedRecipe] = useState<ConnectedRecipe | null>(null);
  const item_columns = useMemo(() => columns.filter((column) => column.scope === "item"), [columns]);

  useEffect(() => {
    if (!has_automations) return;
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
    boardAutomationService
      .getAccountTemplates()
      .then((templates) => {
        if (!cancelled) setAccountTemplates(templates);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingAccount(false);
      });
    boardAutomationService
      .getTeams(board_id)
      .then((data) => {
        if (!cancelled) setTeams(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [board_id, has_automations]);

  const context: AutomationBuilderContext = useMemo(
    () => ({
      board_id,
      columns,
      groups,
      people,
      board_targets,
      slack_channels: slack_options.channels.map((channel) => ({ id: channel.id, name: channel.name })),
      is_slack_connected: slack_options.status?.is_connected === true,
      slack_team_id: slack_options.status?.workspace?.team_id ?? null,
      slack_team_name: slack_options.status?.workspace?.team_name ?? null,
      allow_integrations: is_integrations,
      teams,
      forms,
      viewer_id: user?.id != null ? String(user.id) : null,
    }),
    [board_id, columns, groups, people, board_targets, slack_options.channels, slack_options.status, is_integrations, teams, forms, user?.id]
  );

  const openBuilder = (draft: AutomationDraft, editing_id: number | null = null, notice: string | null = null) => {
    setSaveError(null);
    setMode("create");
    setScreen({ kind: "builder", draft, editing_id, key: Date.now(), notice });
  };

  // Opened from a column header's "Automate", straight into a builder watching that column.
  const [handled_column_id, setHandledColumnId] = useState<string | null>(null);
  if (create_for_column_id && create_for_column_id !== handled_column_id) {
    setHandledColumnId(create_for_column_id);
    const column = columns.find((entry) => entry.id === create_for_column_id);
    if (column?.kind === "button") {
      // A Button column gets monday's own builder on top of the center, Back lands on the center.
      setMode(own_automations.length > 0 ? "manage" : "create");
      setScreen({ kind: "button", draft: draftForColumn(column.id, context), key: Date.now() });
    } else if (column) {
      setMode("create");
      setScreen({ kind: "builder", draft: draftForColumn(column.id, context), editing_id: null, key: Date.now(), notice: `Starting from the ${column.title} column. Pick what should happen, or change the trigger.` });
    }
  }

  // Opened from another dialog, or a link of the account wide Automations center, to edit one
  // automation, straight into the builder. The automations may still be loading, so it waits for them.
  const [handled_edit_id, setHandledEditId] = useState<number | null>(null);
  if (edit_automation_id && edit_automation_id !== handled_edit_id) {
    const automation = automations.find((entry) => entry.id === edit_automation_id);
    if (automation) {
      setHandledEditId(edit_automation_id);
      setMode("create");
      setScreen({ kind: "builder", draft: draftFromAutomation(automation, context), editing_id: automation.id, key: Date.now() });
    }
  }

  const navigate = (next_page: CenterPage) => {
    setPage(next_page);
    setMode("create");
    setScreen({ kind: "gallery" });
  };

  const openIntegration = (integration_page: IntegrationPage) => navigate({ section: "integrations", page: integration_page });

  // A finished integration flow lands on Manage, and the sidebar badges may have changed.
  const finishIntegration = () => {
    setScreen({ kind: "gallery" });
    setMode("manage");
    void overview.reload();
  };

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

  const applyAccountTemplate = (template: AccountAutomationTemplateDto) => {
    const { definition, missing } = definitionFromAccountTemplate(template, context);
    const notice = missing.length ? `This template needs ${missing.map(describeColumnNeed).join(", ")}. Add it to the table, or choose another column in red.` : null;
    openBuilder({ ...draftFromDefinition(definition, context), name: template.name, description: template.description ?? "" }, null, notice);
  };

  const useRecipe = (recipe: AutomationRecipe) => openBuilder(draftFromDefinition(recipe.build(context), context));

  // Gmail, Outlook and Google Calendar recipes open their connect and fill flow, the builder when none fits.
  const startConnectedRecipe = (recipe: AutomationRecipe) => {
    const connected = connectedRecipeFor(recipe);
    if (connected) setConnectedRecipe(connected);
    else useRecipe(recipe);
  };

  const deleteAccountTemplate = async (template_id: number) => {
    await boardAutomationService.deleteAccountTemplate(template_id);
    setAccountTemplates((current) => current.filter((template) => template.id !== template_id));
  };

  const publishAccountTemplate = async (automation_id: number, name: string) => {
    const template = await boardAutomationService.publishAccountTemplate({ automation_id, name });
    setAccountTemplates((current) => [template, ...current]);
  };

  const editing_automation = screen.kind === "builder" && screen.editing_id ? automations.find((automation) => automation.id === screen.editing_id) ?? null : null;

  const is_in_builder = mode === "create" && screen.kind === "builder";

  const is_on_gallery = mode === "create" && screen.kind === "gallery";
  const search_text = search.trim().toLowerCase();

  let integration_content: React.ReactNode = null;
  if (is_on_gallery && page.section === "integrations") {
    const back = () => openIntegration("overview");
    if (page.page === "overview" || (!has_automations && page.page !== "connections")) {
      integration_content = <IntegrationsOverview overview={overview} search={search_text} has_automations={has_automations} onOpenApp={openIntegration} onOpenConnections={() => openIntegration("connections")} />;
    } else if (page.page === "connections") {
      integration_content = (
        <ConnectionsView slack={slack} return_path={return_path} can_manage_apps={overview.can_manage} onChanged={() => void overview.reload()} onBrowseTemplates={has_automations ? openIntegration : undefined} />
      );
    } else if (page.page === "email") {
      integration_content = (
        <EmailAppPage search={search_text} columns={item_columns} people={people} slack={slack_options} overview={overview.appFor("email")} onBack={back} onCreate={props.onCreate} onCreated={finishIntegration} onUseRecipe={useRecipe} />
      );
    } else if (page.page === "slack") {
      integration_content = <SlackAppPage search={search_text} overview={overview.appFor("slack")} onBack={back} onUse={setSlackRecipe} onUseRecipe={useRecipe} />;
    } else {
      integration_content = <ConnectedAppPage app={page.page} search={search_text} overview={overview.appFor(page.page)} onBack={back} onUse={startConnectedRecipe} />;
    }
  }

  return (
    <>
      <div className="automation-center__header">
        <div className="automation-center__title">
          <strong>{is_integrations ? "Integrations" : "Automations"}</strong>
          <span className="automation-center__board">{board_label}</span>
        </div>

        {has_automations && (
          <div role="tablist" aria-label={is_integrations ? "Integrations mode" : "Automations mode"} className="automation-center__modes">
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
                className="automation-center__mode capitalize"
              >
                {mode_id}
                {mode_id === "manage" ? ` / ${own_automations.length}` : ""}
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={onClose} aria-label="Close" className="automation-center__close">
          <svg viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><path d="M2.6 2.6 L11.4 11.4 M11.4 2.6 L2.6 11.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="automation-center__body">
        {is_on_gallery && (
          <AutomationCenterSidebar
            variant={variant}
            page={page}
            onNavigate={navigate}
            overview={overview}
            has_automations={has_automations}
            saved_count={saved_templates.length}
            account_count={account_templates.length}
          />
        )}

        {is_on_gallery && (
          <div className="automation-center__main automation-center__main--padded">
            {!(page.section === "integrations" && page.page === "connections") && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <label className="relative w-full max-w-[340px]">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-boardtree-text-faint"><SearchIcon size={14} /></span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={is_integrations ? "Search integrations" : "Search templates"}
                    aria-label={is_integrations ? "Search integrations" : "Search templates"}
                    className="h-9 w-full rounded-[6px] border border-boardtree-border bg-boardtree-surface pl-9 pr-3 text-[13px] text-boardtree-text outline-none placeholder:text-boardtree-text-faint focus:border-boardtree-accent"
                  />
                </label>
                {has_automations && (
                  <button type="button" onClick={() => openBuilder(emptyDraft())} className="flex h-9 items-center gap-1.5 rounded-[4px] bg-boardtree-accent px-3.5 text-[13px] font-medium text-white hover:bg-boardtree-accent-hover">
                    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                    Create custom automation
                  </button>
                )}
              </div>
            )}

            {page.section === "automations" && (
              <TemplateGallery
                context={context}
                category={page.category}
                search={search_text}
                saved_templates={saved_templates}
                is_loading_saved={is_loading_templates}
                account_templates={account_templates}
                is_loading_account={is_loading_account}
                can_manage_account_templates={is_account_admin}
                onUseRecipe={useRecipe}
                onUseSaved={(template) => openBuilder({ ...draftFromDefinition(template.definition, context), name: template.name, description: template.description ?? "" })}
                onUseAccount={applyAccountTemplate}
                onDeleteSaved={deleteTemplate}
                onDeleteAccount={deleteAccountTemplate}
                onCustom={() => openBuilder(emptyDraft())}
              />
            )}

            {integration_content}
          </div>
        )}

        {is_in_builder && screen.kind === "builder" && (
          <div className="automation-center__main automation-center__main--padded">
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
              automation={editing_automation}
              test_items={test_items}
              onTestRun={
                view_id == null
                  ? undefined
                  : (definition, item_id, payload) => boardAutomationService.testRun(board_id, { ...definition, view_id, item_id, payload, name: editing_automation?.name ?? null })
              }
              onRegenerateWebhook={
                editing_automation
                  ? async () => {
                      const updated = await boardAutomationService.regenerateWebhookUrl(board_id, editing_automation.id);
                      props.onReplaceAutomation?.(updated);
                    }
                  : undefined
              }
              notice={
                screen.notice ? (
                  <div role="status" className="mb-6 max-w-[720px] rounded-[10px] border border-boardtree-accent/30 bg-boardtree-accent-surface px-4 py-3 text-[13px] text-boardtree-text">
                    {screen.notice}
                  </div>
                ) : undefined
              }
            />
          </div>
        )}

        {mode === "manage" && has_automations && (
          <div className="automation-center__main automation-center__main--padded automation-center__main--muted">
            <ManageView
              board_id={board_id}
              view_id={view_id}
              board_label={board_label}
              source={variant}
              slack={slack}
              return_path={return_path}
              automations={own_automations}
              context={context}
              onToggle={props.onToggle}
              onUpdate={props.onUpdate}
              onDuplicate={props.onDuplicate}
              onDelete={props.onDelete}
              onEdit={editAutomation}
              onSaveAsTemplate={saveAsTemplate}
              onPublishAccountTemplate={is_account_admin ? publishAccountTemplate : undefined}
              onReplaceAutomation={props.onReplaceAutomation}
              onReloadAutomations={props.onReloadAutomations}
              onExploreTemplates={() => navigate(is_integrations ? DEFAULT_INTEGRATIONS_PAGE : DEFAULT_AUTOMATIONS_PAGE)}
              onCreateCustom={() => openBuilder(emptyDraft())}
              onExploreCommunication={!is_integrations && props.onOpenIntegrations ? () => props.onOpenIntegrations?.() : undefined}
              onOpenConnections={() => (is_integrations ? openIntegration("connections") : props.onOpenIntegrations?.("connections"))}
            />
          </div>
        )}
      </div>

      {screen.kind === "button" && (
        <div className="fixed inset-0 z-[320] bg-[rgba(30,34,55,0.35)] p-1.5" onClick={(event) => event.stopPropagation()}>
          <div role="dialog" aria-modal="true" aria-label="Button automation" className="h-full overflow-hidden rounded-[10px] shadow-[0_24px_60px_rgba(30,34,55,0.30)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
            <ButtonAutomationBuilder
              key={screen.key}
              context={context}
              initial_draft={screen.draft}
              is_loading_boards={is_loading_boards}
              is_saving={is_saving}
              save_error={save_error}
              onBack={() => {
                setSaveError(null);
                setScreen({ kind: "gallery" });
              }}
              onClose={onClose}
              onSave={(definition, meta) => void save(definition, meta, null)}
            />
          </div>
        </div>
      )}

      {connected_recipe && (
        <ConnectedAppFlow
          key={connected_recipe.recipe.id}
          connected={connected_recipe}
          columns={item_columns}
          groups={groups}
          people={people}
          can_manage={is_account_admin}
          return_path={return_path}
          onBack={() => setConnectedRecipe(null)}
          onCreate={props.onCreate}
          onCreated={() => {
            setConnectedRecipe(null);
            finishIntegration();
          }}
        />
      )}

      {slack_recipe && (
        <SlackIntegrationFlow
          key={slack_recipe.id}
          recipe={slack_recipe}
          columns={item_columns}
          people={people}
          items={test_items}
          slack_status={slack.status}
          return_path={return_path}
          onBack={() => setSlackRecipe(null)}
          onCreate={props.onCreate}
          onCreated={() => {
            setSlackRecipe(null);
            finishIntegration();
            void slack.reloadStatus();
          }}
        />
      )}
    </>
  );
}
