"use client";
import React, { useMemo } from "react";
import { EyeIcon, FormViewIcon } from "@/icons/board-icons";
import { BoardLoadingSpinner, CenteredMessage } from "@/app/(admin)/boards/_components/BoardRouteStates";
import CopyLinkField from "@/components/ui/CopyLinkField";
import ToggleSwitch from "@/components/board/toolbar/ToggleSwitch";
import { buildPublicFormUrl } from "@/services/board-form.service";
import type { BoardFormColumn, BoardFormQuestionConfig } from "@/types/board-forms";
import FormQuestionField from "./FormQuestionField";
import useBoardForm from "./useBoardForm";

export type BoardFormViewProps = {
  board_id: number;
  view_id: number;
  /** Changing a form changes the board's structure, members without that access only see the preview and the link. */
  can_edit: boolean;
};

/** The accent colors the builder offers, monday.com's form theme palette. */
const ACCENT_COLORS = ["#6161ff", "#00c875", "#fdab3d", "#e2445c", "#579bfc", "#a25ddc", "#333333"];

const FIELD_LABEL = "mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.04em] text-shell-text-muted";
const TEXT_INPUT =
  "w-full rounded-[9px] border border-shell-border-strong bg-shell-bg px-3 py-2 text-[13.5px] text-shell-text outline-none placeholder:text-shell-text-faint focus:border-brand-500 disabled:opacity-60";

/**
 * The "Form" board view, monday.com's WorkForms: pick which columns become
 * questions, reorder and word them, and share a public link. Every response
 * becomes a new item in the chosen group. Self-contained like
 * `BoardChartView`, `TableBoardView` only mounts it.
 */
const BoardFormView: React.FC<BoardFormViewProps> = ({ board_id, view_id, can_edit }) => {
  const form = useBoardForm(board_id, view_id);
  const builder = form.builder;

  const columns_by_id = useMemo(
    () => Object.fromEntries((builder?.columns ?? []).map((column) => [column.id, column])) as Record<number, BoardFormColumn>,
    [builder?.columns]
  );

  if (form.is_loading) return <BoardLoadingSpinner />;
  if (!builder) return <CenteredMessage title="Something went wrong" detail={form.error ?? "We couldn't load this form."} />;

  const { config } = builder;
  const questions = config.questions.filter((question) => columns_by_id[question.column_id]);
  const visible_questions = questions.filter((question) => question.is_visible);
  const hidden_questions = questions.filter((question) => !question.is_visible);
  const public_url = buildPublicFormUrl(builder.token);

  const setQuestions = (next: BoardFormQuestionConfig[]) => form.updateConfig({ questions: next });
  const patchQuestion = (column_id: number, patch: Partial<BoardFormQuestionConfig>) =>
    setQuestions(questions.map((question) => (question.column_id === column_id ? { ...question, ...patch } : question)));

  /** Moves a visible question one slot up or down among the visible ones, hidden questions keep their place at the end. */
  const moveQuestion = (column_id: number, direction: -1 | 1) => {
    const index = visible_questions.findIndex((question) => question.column_id === column_id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= visible_questions.length) return;
    const reordered = [...visible_questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setQuestions([...reordered, ...hidden_questions]);
  };

  const showQuestion = (column_id: number) => {
    const question = hidden_questions.find((candidate) => candidate.column_id === column_id);
    if (!question) return;
    setQuestions([...visible_questions, { ...question, is_visible: true }, ...hidden_questions.filter((candidate) => candidate.column_id !== column_id)]);
  };

  const hideQuestion = (column_id: number) => {
    const question = visible_questions.find((candidate) => candidate.column_id === column_id);
    if (!question) return;
    setQuestions([...visible_questions.filter((candidate) => candidate.column_id !== column_id), { ...question, is_visible: false }, ...hidden_questions]);
  };

  return (
    <div className="flex flex-col gap-4 pb-10 lg:flex-row lg:items-start">
      {/* ── Settings ── */}
      <aside className="flex w-full flex-none flex-col gap-4 lg:sticky lg:top-0 lg:w-[340px]">
        <section className="rounded-xl border border-shell-border bg-shell-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-shell-text">Share form</h2>
            {form.is_saving ? (
              <span className="text-[12px] text-shell-text-faint">Saving...</span>
            ) : (
              <a href={public_url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-brand-500 hover:underline">
                Open form
              </a>
            )}
          </div>
          <CopyLinkField link={public_url} is_disabled={!config.is_active} />
          <button
            type="button"
            disabled={!can_edit}
            onClick={() => form.updateConfig({ is_active: !config.is_active })}
            aria-pressed={config.is_active}
            className="mt-3 flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1.5 text-left text-[13px] text-shell-text disabled:cursor-default"
          >
            <span>
              Accepting responses
              <span className="block text-[12px] text-shell-text-muted">
                {config.is_active ? "Anyone with the link can submit." : "The link shows that the form is closed."}
              </span>
            </span>
            <ToggleSwitch is_on={config.is_active} size="sm" />
          </button>
          {can_edit && (
            <button
              type="button"
              onClick={() => void form.regenerateLink()}
              className="mt-1 text-[12.5px] font-medium text-shell-text-muted hover:text-shell-text hover:underline"
            >
              Create a new link (the current one stops working)
            </button>
          )}
        </section>

        <section className="flex flex-col gap-3.5 rounded-xl border border-shell-border bg-shell-panel p-4">
          <h2 className="text-[14px] font-semibold text-shell-text">Settings</h2>

          <div>
            <label htmlFor="form-source-view" className={FIELD_LABEL}>Questions come from</label>
            <select
              id="form-source-view"
              disabled={!can_edit}
              value={config.source_view_id ?? ""}
              onChange={(event) => form.updateConfig({ source_view_id: Number(event.target.value) })}
              className={TEXT_INPUT}
            >
              {builder.source_views.map((view) => (
                <option key={view.id} value={view.id}>{view.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="form-target-group" className={FIELD_LABEL}>Add responses to</label>
            <select
              id="form-target-group"
              disabled={!can_edit}
              value={config.target_group_id ?? ""}
              onChange={(event) => form.updateConfig({ target_group_id: event.target.value ? Number(event.target.value) : null })}
              className={TEXT_INPUT}
            >
              <option value="">First group of the table</option>
              {builder.groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="form-name-label" className={FIELD_LABEL}>Item name question</label>
            <input
              id="form-name-label"
              disabled={!can_edit}
              value={config.name_label}
              maxLength={255}
              onChange={(event) => form.updateConfig({ name_label: event.target.value })}
              className={TEXT_INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="form-submit-label" className={FIELD_LABEL}>Button text</label>
              <input
                id="form-submit-label"
                disabled={!can_edit}
                value={config.submit_label}
                maxLength={60}
                onChange={(event) => form.updateConfig({ submit_label: event.target.value })}
                className={TEXT_INPUT}
              />
            </div>
            <div>
              <span className={FIELD_LABEL}>Accent color</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={!can_edit}
                    onClick={() => form.updateConfig({ accent_color: color })}
                    aria-label={`Use ${color} as the accent color`}
                    aria-pressed={config.accent_color === color}
                    className="h-5 w-5 rounded-full transition-transform hover:scale-110 disabled:cursor-default"
                    style={{ background: color, boxShadow: config.accent_color === color ? `0 0 0 2px var(--color-shell-panel), 0 0 0 3.5px ${color}` : undefined }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="form-success-message" className={FIELD_LABEL}>Message after submitting</label>
            <textarea
              id="form-success-message"
              rows={2}
              disabled={!can_edit}
              value={config.success_message}
              maxLength={1000}
              onChange={(event) => form.updateConfig({ success_message: event.target.value })}
              className={`${TEXT_INPUT} resize-y`}
            />
          </div>
        </section>

        {form.error && (
          <p role="alert" className="rounded-[10px] border border-error-500/30 bg-error-500/10 px-3.5 py-3 text-[13px] text-error-400">
            {form.error}
          </p>
        )}
      </aside>

      {/* ── Live form ── */}
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-[680px] overflow-hidden rounded-2xl border border-shell-border bg-shell-panel">
          <div className="h-2" style={{ background: config.accent_color }} />
          <div className="flex flex-col gap-2 px-8 pb-2 pt-7">
            <input
              aria-label="Form title"
              disabled={!can_edit}
              value={config.title}
              maxLength={255}
              onChange={(event) => form.updateConfig({ title: event.target.value })}
              className="w-full bg-transparent text-[26px] font-bold tracking-[-0.01em] text-shell-text outline-none placeholder:text-shell-text-faint disabled:opacity-100"
              placeholder="Form title"
            />
            <textarea
              aria-label="Form description"
              disabled={!can_edit}
              value={config.description ?? ""}
              rows={2}
              maxLength={5000}
              onChange={(event) => form.updateConfig({ description: event.target.value || null })}
              className="w-full resize-none bg-transparent text-[14px] text-shell-text-secondary outline-none placeholder:text-shell-text-faint disabled:opacity-100"
              placeholder="Add a description (optional)"
            />
          </div>

          <div className="flex flex-col gap-3 px-6 pb-6">
            <div className="rounded-xl border border-shell-border px-4 py-4">
              <FormQuestionField
                question={{ column_id: 0, type: "text", label: config.name_label, description: null, is_required: true, options: [] }}
                value=""
                onChange={() => {}}
                accent_color={config.accent_color}
                is_preview
              />
            </div>

            {visible_questions.map((question, index) => {
              const column = columns_by_id[question.column_id];
              return (
                <div key={question.column_id} className="group rounded-xl border border-shell-border px-4 py-4 transition-colors hover:border-shell-border-strong">
                  <FormQuestionField
                    question={{
                      column_id: column.id,
                      type: column.type,
                      label: question.label || column.label,
                      description: question.description,
                      is_required: question.is_required,
                      options: column.options,
                    }}
                    value={null}
                    onChange={() => {}}
                    accent_color={config.accent_color}
                    is_preview
                  />

                  {can_edit && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-shell-border pt-3">
                      <input
                        aria-label={`Question text for ${column.label}`}
                        value={question.label ?? ""}
                        placeholder={column.label}
                        maxLength={255}
                        onChange={(event) => patchQuestion(column.id, { label: event.target.value || null })}
                        className="min-w-[160px] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[12.5px] text-shell-text outline-none hover:border-shell-border focus:border-brand-500"
                      />
                      <input
                        aria-label={`Help text for ${column.label}`}
                        value={question.description ?? ""}
                        placeholder="Help text"
                        maxLength={1000}
                        onChange={(event) => patchQuestion(column.id, { description: event.target.value || null })}
                        className="min-w-[140px] flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[12.5px] text-shell-text-muted outline-none hover:border-shell-border focus:border-brand-500"
                      />
                      <label className="flex items-center gap-1.5 text-[12.5px] text-shell-text-muted">
                        <input
                          type="checkbox"
                          checked={question.is_required}
                          onChange={(event) => patchQuestion(column.id, { is_required: event.target.checked })}
                          style={{ accentColor: config.accent_color }}
                        />
                        Required
                      </label>
                      <div className="ml-auto flex items-center gap-0.5">
                        <QuestionIconButton label="Move up" disabled={index === 0} onClick={() => moveQuestion(column.id, -1)}>↑</QuestionIconButton>
                        <QuestionIconButton label="Move down" disabled={index === visible_questions.length - 1} onClick={() => moveQuestion(column.id, 1)}>↓</QuestionIconButton>
                        <QuestionIconButton label={`Hide ${column.label}`} onClick={() => hideQuestion(column.id)}>
                          <EyeIcon size={14} open={false} />
                        </QuestionIconButton>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              disabled
              className="mt-1 self-start rounded-[10px] px-6 py-2.5 text-[14px] font-semibold text-white"
              style={{ background: config.accent_color }}
            >
              {config.submit_label || "Submit"}
            </button>
          </div>
        </div>

        {can_edit && (
          <div className="mx-auto mt-4 max-w-[680px] rounded-xl border border-dashed border-shell-border-strong p-4">
            <h3 className="text-[13px] font-semibold text-shell-text">Hidden columns</h3>
            {hidden_questions.length === 0 ? (
              <p className="mt-1 text-[12.5px] text-shell-text-muted">
                Every supported column is on the form. Columns with permissions, files, people or formulas can&apos;t be asked on a public form.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {hidden_questions.map((question) => (
                  <button
                    key={question.column_id}
                    type="button"
                    onClick={() => showQuestion(question.column_id)}
                    className="flex items-center gap-1.5 rounded-full border border-shell-border-strong px-3 py-1 text-[12.5px] text-shell-text transition-colors hover:border-brand-500 hover:text-brand-500"
                  >
                    <span aria-hidden="true">+</span>
                    {columns_by_id[question.column_id].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {builder.columns.length === 0 && (
          <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-shell-hover text-shell-text-muted">
              <FormViewIcon size={22} />
            </span>
            <p className="text-[13px] text-shell-text-muted">
              The selected table has no columns a form can ask about yet. Add a Text, Status, Date or similar column to it and it shows up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const QuestionIconButton: React.FC<{ label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({ label, disabled, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="flex h-7 w-7 items-center justify-center rounded-md text-[13px] text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text disabled:opacity-30 disabled:hover:bg-transparent"
  >
    {children}
  </button>
);

export default BoardFormView;
