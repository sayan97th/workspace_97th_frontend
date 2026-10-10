"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { WorkspaceNavNode } from "@/types/workspace";
import { workspaceService } from "@/services/workspace.service";
import { apiErrorMessage } from "@/services/profile-preferences.service";
import { useToast } from "@/components/ui/toast/ToastProvider";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { CloseIcon, DeleteIcon, TemplateIcon } from "@/icons/workspace-icons";
import NavItemIcon, { navItemTypeLabel } from "./NavItemIcon";

/** Which "Start with template" row opened the picker: docs and forms only list their own kind. */
export type TemplateKind = "board" | "doc" | "form";

export type BoardTemplatePickerModalProps = {
  is_open: boolean;
  kind: TemplateKind;
  workspace_slug: string | undefined;
  /** Folder the new board lands in, the workspace root when null. */
  parent_id: number | null;
  /** Fired with the board created from the picked template. */
  onCreated: (node: WorkspaceNavNode) => void;
  onClose: () => void;
};

const NON_BOARD_VIEW_KEYS = ["doc", "form"];

const matchesKind = (template: WorkspaceNavNode, kind: TemplateKind): boolean =>
  kind === "board" ? !NON_BOARD_VIEW_KEYS.includes(template.view_key ?? "") : template.view_key === kind;

const KIND_LABELS: Record<TemplateKind, string> = { board: "board", doc: "doc", form: "form" };

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

/**
 * The "Start with template" picker: lists the workspace's saved templates
 * (made with "Save as a template" or "Move to template" in a row menu), and
 * creates a full copy of the picked one under the name typed below it. The
 * template itself stays available for the next board.
 */
const BoardTemplatePickerModal: React.FC<BoardTemplatePickerModalProps> = ({ is_open, kind, workspace_slug, parent_id, onCreated, onClose }) => {
  const toast = useToast();
  const [templates, setTemplates] = useState<WorkspaceNavNode[] | null>(null);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [selected_id, setSelectedId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [is_saving, setIsSaving] = useState(false);
  const [pending_delete, setPendingDelete] = useState<WorkspaceNavNode | null>(null);

  useEffect(() => {
    if (!is_open || !workspace_slug) return;
    let is_cancelled = false;
    setTemplates(null);
    setLoadError(null);
    setSelectedId(null);
    setLabel("");
    workspaceService
      .getNavTemplates(workspace_slug)
      .then((data) => {
        if (!is_cancelled) setTemplates(data);
      })
      .catch(() => {
        if (!is_cancelled) setLoadError("We couldn't load the templates.");
      });
    return () => {
      is_cancelled = true;
    };
  }, [is_open, workspace_slug]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !is_saving && !pending_delete) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_saving, pending_delete, onClose]);

  const visible_templates = useMemo(() => (templates ?? []).filter((template) => matchesKind(template, kind)), [templates, kind]);
  const selected_template = visible_templates.find((template) => template.id === selected_id) ?? null;

  if (!is_open || typeof document === "undefined") return null;

  const selectTemplate = (template: WorkspaceNavNode) => {
    setSelectedId(template.id);
    setLabel(template.label);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected_template || !workspace_slug) return;
    setIsSaving(true);
    try {
      const board = await workspaceService.useNavTemplate(workspace_slug, selected_template.id, { label: label.trim() || null, parent_id });
      onCreated(board);
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error, "We couldn't create a board from this template."));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (template: WorkspaceNavNode) => {
    if (!workspace_slug) return;
    try {
      await workspaceService.deleteNavTemplate(workspace_slug, template.id);
      setTemplates((current) => (current ?? []).filter((item) => item.id !== template.id));
      if (selected_id === template.id) setSelectedId(null);
      toast.success(`Deleted the "${template.label}" template`);
    } catch (error) {
      toast.error(apiErrorMessage(error, "We couldn't delete this template."));
    }
  };

  const kind_label = KIND_LABELS[kind];

  return createPortal(
    <>
      <div role="dialog" aria-modal="true" aria-label="Start with template" className="fixed inset-0 z-[420] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={is_saving ? undefined : onClose} aria-hidden="true" />

        <form
          onSubmit={handleSubmit}
          className="relative z-[421] flex max-h-[min(600px,88vh)] w-[480px] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl"
        >
          <div className="flex flex-none items-start justify-between gap-3 px-[22px] pb-3 pt-5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-[-0.01em]">Start with template</h2>
              <p className="mt-1 text-[13px] text-shell-text-muted">Pick a saved template to create a new {kind_label} with its columns, groups and items.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={is_saving}
              aria-label="Close"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
            >
              <CloseIcon size={14} />
            </button>
          </div>

          <div role="listbox" aria-label="Templates" className="shell-scrollbar min-h-[140px] flex-1 overflow-y-auto px-2.5 pb-2">
            {load_error ? (
              <p className="px-3 py-8 text-center text-sm text-shell-text-muted">{load_error}</p>
            ) : templates === null ? (
              <div className="space-y-1.5 px-1 py-1">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-12 animate-pulse rounded-lg bg-shell-hover" />
                ))}
              </div>
            ) : visible_templates.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-shell-hover text-shell-text-muted">
                  <TemplateIcon size={18} />
                </span>
                <p className="text-sm font-medium">No templates yet</p>
                <p className="max-w-[320px] text-[13px] text-shell-text-muted">
                  Open the &ldquo;...&rdquo; menu of any {kind_label} in the sidebar and choose &ldquo;Save as a template&rdquo; to reuse it here.
                </p>
              </div>
            ) : (
              visible_templates.map((template) => {
                const is_selected = template.id === selected_id;
                return (
                  <div
                    key={template.id}
                    role="option"
                    aria-selected={is_selected}
                    tabIndex={0}
                    onClick={() => selectTemplate(template)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectTemplate(template);
                      }
                    }}
                    className={`group flex cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#2B76E5] ${
                      is_selected ? "bg-[#2B76E5]/[0.14]" : "hover:bg-shell-hover"
                    }`}
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-shell-bg text-shell-text-secondary">
                      <NavItemIcon source={template} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{template.label}</span>
                      <span className="block truncate text-[12px] text-shell-text-muted">
                        {navItemTypeLabel(template)}
                        {template.creator ? ` by ${template.creator.full_name}` : ""}
                        {template.created_at ? `, ${formatDate(template.created_at)}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDelete(template);
                      }}
                      aria-label={`Delete the ${template.label} template`}
                      title="Delete template"
                      className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-shell-text-muted opacity-0 transition-opacity hover:bg-shell-panel hover:text-shell-text focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <DeleteIcon size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {selected_template && (
            <div className="flex-none border-t border-shell-border px-[22px] pt-3.5">
              <label htmlFor="template-board-name" className="mb-1.5 block text-[12.5px] font-medium text-shell-text-secondary">
                New {kind_label} name
              </label>
              <input
                id="template-board-name"
                value={label}
                maxLength={255}
                onChange={(event) => setLabel(event.target.value)}
                className="h-9 w-full rounded-lg border border-shell-border bg-shell-bg px-3 text-sm text-shell-text outline-none focus:border-[#2B76E5]"
              />
            </div>
          )}

          <div className="flex flex-none items-center justify-end gap-2 px-[22px] py-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={is_saving}
              className="h-9 rounded-lg px-3.5 text-sm font-medium text-shell-text transition-colors hover:bg-shell-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selected_template || is_saving}
              className="h-9 rounded-lg bg-[#0073ea] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0060b9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {is_saving ? "Creating..." : "Use template"}
            </button>
          </div>
        </form>
      </div>

      <ConfirmActionModal
        is_open={pending_delete !== null}
        title="Delete template"
        description={<>&ldquo;{pending_delete?.label}&rdquo; will no longer be offered as a template. Boards already created from it are not affected.</>}
        confirm_label="Delete template"
        danger
        onConfirm={() => (pending_delete ? deleteTemplate(pending_delete) : undefined)}
        onClose={() => setPendingDelete(null)}
      />
    </>,
    document.body
  );
};

export default BoardTemplatePickerModal;
