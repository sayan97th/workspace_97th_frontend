"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Workspace, WorkspaceNavNode } from "@/types/workspace";
import { workspaceService } from "@/services/workspace.service";
import WorkspaceBadge from "@/layout/WorkspaceBadge";
import { CheckIcon, CloseIcon, SearchIcon } from "@/icons/workspace-icons";

export type MoveToWorkspaceModalProps = {
  /** The board or folder being moved, null while closed. */
  node: WorkspaceNavNode | null;
  /** The workspace the item lives in now, left out of the list. */
  current_workspace_slug: string;
  onSubmit: (workspace: Workspace) => Promise<void>;
  onClose: () => void;
};

/** Only workspaces the user can add content to are valid targets, the API applies the same rule. */
const canAddContent = (workspace: Workspace): boolean =>
  workspace.memberships.includes("owner") || workspace.memberships.includes("member");

/**
 * The row menu's "Move to > Move to workspace" picker: a searchable list of
 * the other workspaces the user can add content to. Picking one and pressing
 * Move sends the item (with everything inside it) to that workspace's root.
 */
const MoveToWorkspaceModal: React.FC<MoveToWorkspaceModalProps> = ({ node, current_workspace_slug, onSubmit, onClose }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected_id, setSelectedId] = useState<number | null>(null);
  const [is_saving, setIsSaving] = useState(false);

  const is_open = node !== null;

  useEffect(() => {
    if (!is_open) return;
    let is_cancelled = false;
    setQuery("");
    setSelectedId(null);
    setLoadError(null);
    workspaceService
      .getWorkspaces()
      .then((data) => {
        if (!is_cancelled) setWorkspaces(data);
      })
      .catch(() => {
        if (!is_cancelled) setLoadError("We couldn't load your workspaces.");
      });
    return () => {
      is_cancelled = true;
    };
  }, [is_open]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !is_saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, is_saving, onClose]);

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (workspaces ?? [])
      .filter((workspace) => workspace.slug !== current_workspace_slug && canAddContent(workspace))
      .filter((workspace) => !needle || workspace.name.toLowerCase().includes(needle))
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [workspaces, query, current_workspace_slug]);

  if (!node || typeof document === "undefined") return null;

  const selected_workspace = options.find((workspace) => workspace.id === selected_id) ?? null;

  const handleSubmit = async () => {
    if (!selected_workspace) return;
    setIsSaving(true);
    try {
      await onSubmit(selected_workspace);
      onClose();
    } catch {
      // The caller already showed the error toast, keep the dialog open to pick again.
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Move ${node.label} to a workspace`} className="fixed inset-0 z-[420] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#060e0e]/[0.68]" onClick={is_saving ? undefined : onClose} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[min(560px,85vh)] w-[440px] max-w-full flex-col overflow-hidden rounded-2xl border border-shell-border-strong bg-shell-panel text-shell-text shadow-2xl">
        <div className="flex flex-none items-start justify-between gap-3 px-[22px] pb-2 pt-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-[-0.01em]">Move to workspace</h2>
            <p className="mt-1 truncate text-[13px] text-shell-text-muted">
              Choose where &ldquo;{node.label}&rdquo;{node.type === "group" ? " and everything inside it" : ""} should go.
            </p>
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

        <div className="flex-none px-[22px] pb-2 pt-2">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-shell-border bg-shell-bg px-3 text-shell-text-muted focus-within:border-[#2B76E5]">
            <SearchIcon size={14} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search workspaces"
              aria-label="Search workspaces"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-shell-text outline-none placeholder:text-shell-text-muted"
            />
          </label>
        </div>

        <div role="listbox" aria-label="Workspaces" className="shell-scrollbar min-h-[120px] flex-1 overflow-y-auto px-2.5 pb-2">
          {load_error ? (
            <p className="px-3 py-6 text-center text-sm text-shell-text-muted">{load_error}</p>
          ) : workspaces === null ? (
            <div className="space-y-1.5 px-1 py-1">
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-10 animate-pulse rounded-lg bg-shell-hover" />
              ))}
            </div>
          ) : options.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-shell-text-muted">
              {query.trim() ? "No workspaces match your search." : "There are no other workspaces you can add content to."}
            </p>
          ) : (
            options.map((workspace) => {
              const is_selected = workspace.id === selected_id;
              return (
                <button
                  key={workspace.id}
                  type="button"
                  role="option"
                  aria-selected={is_selected}
                  disabled={is_saving}
                  onClick={() => setSelectedId(workspace.id)}
                  className={`flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-60 ${
                    is_selected ? "bg-[#2B76E5]/[0.14] text-shell-text" : "hover:bg-shell-hover"
                  }`}
                >
                  <WorkspaceBadge
                    workspace={{ mono: workspace.mono, color: workspace.color, is_home: workspace.is_home, avatar_url: workspace.avatar_thumbnail_url ?? workspace.avatar_url }}
                    size={28}
                  />
                  <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
                  {is_selected && <CheckIcon size={14} className="flex-none text-[#2B76E5]" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex flex-none items-center justify-end gap-2 border-t border-shell-border px-[22px] py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={is_saving}
            className="h-9 rounded-lg px-3.5 text-sm font-medium text-shell-text transition-colors hover:bg-shell-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!selected_workspace || is_saving}
            className="h-9 rounded-lg bg-[#0073ea] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0060b9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {is_saving ? "Moving..." : "Move"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MoveToWorkspaceModal;
