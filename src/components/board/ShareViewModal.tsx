"use client";
import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/icons/workspace-icons";
import CopyLinkField from "@/components/ui/CopyLinkField";
import ToggleSwitch from "@/components/board/toolbar/ToggleSwitch";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardShareService, buildSharedViewUrl } from "@/services/board-share.service";
import type { BoardViewShareLinkDto } from "@/types/board-sharing";
import type { BoardViewKind } from "./boardViewTypes";

/** View kinds that own items, so they can be shared as a read only table. Mirrors `SharedViewService::SHAREABLE_VIEW_TYPES`. */
const SHAREABLE_VIEW_KINDS: BoardViewKind[] = ["table", "kanban", "calendar", "gantt"];

export const isShareableViewKind = (kind: BoardViewKind | null | undefined): boolean =>
  !!kind && SHAREABLE_VIEW_KINDS.includes(kind);

export type ShareViewModalProps = {
  is_open: boolean;
  onClose: () => void;
  board_id: number;
  view_id: number;
  view_label: string;
  /** Only board owners manage the link, everybody else just sees whether one exists. */
  is_owner: boolean;
};

/**
 * Board options menu's "Share view": a read only public link to the open
 * view for people outside the account, optionally password protected.
 * Values of columns with a view restriction never reach the shared page.
 */
const ShareViewModal: React.FC<ShareViewModalProps> = ({ is_open, onClose, board_id, view_id, view_label, is_owner }) => {
  const [link, setLink] = useState<BoardViewShareLinkDto | null>(null);
  const [is_loading, setIsLoading] = useState(false);
  const [is_saving, setIsSaving] = useState(false);
  const [password_draft, setPasswordDraft] = useState("");
  const [error_message, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!is_open) return;
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage(null);
    setPasswordDraft("");
    boardShareService
      .getLink(board_id, view_id)
      .then((result) => !cancelled && setLink(result))
      .catch((error) => !cancelled && setErrorMessage(getApiErrorMessage(error, "We couldn't load the share link.")))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [is_open, board_id, view_id]);

  useEffect(() => {
    if (!is_open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [is_open, onClose]);

  const runAction = useCallback(async (action: () => Promise<BoardViewShareLinkDto | null>, fallback: string) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      setLink(await action());
      return true;
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, fallback));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  if (!is_open) return null;

  const handleToggleEnabled = () => {
    if (!link) {
      void runAction(() => boardShareService.enableLink(board_id, view_id), "We couldn't create the share link.");
      return;
    }
    void runAction(() => boardShareService.updateLink(board_id, view_id, { is_enabled: !link.is_enabled }), "We couldn't update the share link.");
  };

  const handleSavePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password_draft.trim().length < 4) {
      setErrorMessage("The password needs at least 4 characters.");
      return;
    }
    const saved = await runAction(
      () => boardShareService.updateLink(board_id, view_id, { password: password_draft }),
      "We couldn't set the password."
    );
    if (saved) setPasswordDraft("");
  };

  const is_enabled = link?.is_enabled ?? false;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Share view" className="fixed inset-0 z-[420] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#060e0e]/[0.62]" onClick={onClose} aria-hidden="true" />

      <div className="relative z-[421] flex max-h-[86vh] w-[500px] max-w-full flex-col overflow-hidden rounded-[18px] border border-shell-border bg-shell-panel text-shell-text shadow-[0_30px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between border-b border-shell-border px-7 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-[-0.01em]">Share view</h2>
            <p className="truncate text-[12.5px] text-shell-text-muted">&ldquo;{view_label}&rdquo;, read only</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg text-shell-text-muted transition-colors hover:bg-shell-hover hover:text-shell-text"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto px-7 py-5">
          {is_loading ? (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-xl bg-shell-hover" />
              <div className="h-10 animate-pulse rounded-xl bg-shell-hover" />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleToggleEnabled}
                disabled={!is_owner || is_saving}
                aria-pressed={is_enabled}
                className="flex w-full items-center gap-3 rounded-xl border border-shell-border-strong px-4 py-3 text-left transition-colors hover:bg-shell-hover disabled:cursor-default disabled:hover:bg-transparent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">Share with a link</span>
                  <span className="block text-[12px] text-shell-text-muted">
                    Anyone with the link can view this board view, no account needed. Nobody can edit it.
                  </span>
                </span>
                <ToggleSwitch is_on={is_enabled} />
              </button>

              {!is_owner && (
                <p className="mt-3 text-[12.5px] text-shell-text-muted">Only board owners can share this view.</p>
              )}

              {link && (
                <div className="mt-5 space-y-5">
                  <CopyLinkField link={buildSharedViewUrl(link.token)} is_disabled={!link.is_enabled} />

                  {is_owner && (
                    <form onSubmit={handleSavePassword}>
                      <label htmlFor="share-view-password" className="mb-1.5 block text-[12.5px] font-semibold text-shell-text-secondary">
                        Password protection
                      </label>
                      <p className="mb-2 text-[12px] text-shell-text-muted">
                        {link.has_password ? "Viewers must enter the password. Set a new one to replace it." : "Optional. Viewers will be asked for it before seeing the view."}
                      </p>
                      <div className="flex gap-2">
                        <input
                          id="share-view-password"
                          type="password"
                          value={password_draft}
                          onChange={(event) => setPasswordDraft(event.target.value)}
                          placeholder={link.has_password ? "New password" : "Set a password"}
                          autoComplete="new-password"
                          maxLength={100}
                          className="min-w-0 flex-1 rounded-[10px] border border-shell-border-strong bg-shell-bg px-3 py-2 text-[13px] text-shell-text outline-none placeholder:text-shell-text-faint focus:border-brand-500"
                        />
                        <button
                          type="submit"
                          disabled={is_saving || password_draft.length === 0}
                          className="rounded-[10px] bg-brand-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                        >
                          Save
                        </button>
                        {link.has_password && (
                          <button
                            type="button"
                            disabled={is_saving}
                            onClick={() => void runAction(() => boardShareService.updateLink(board_id, view_id, { password: null }), "We couldn't remove the password.")}
                            className="rounded-[10px] px-3 text-[13px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </form>
                  )}

                  {link.last_accessed_at && (
                    <p className="text-[12px] text-shell-text-faint">Last opened {new Date(link.last_accessed_at).toLocaleString()}</p>
                  )}
                </div>
              )}

              {error_message && (
                <p className="mt-4 rounded-[10px] border border-error-500/30 bg-error-500/10 px-3.5 py-3 text-[13px] leading-[1.5] text-error-400">
                  {error_message}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-shell-border px-7 py-4">
          <div className="flex items-center gap-1">
            {is_owner && link && (
              <>
                <button
                  type="button"
                  disabled={is_saving}
                  onClick={() => void runAction(() => boardShareService.regenerateLink(board_id, view_id), "We couldn't create a new link.")}
                  className="rounded-lg px-3 py-2 text-[13px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover disabled:opacity-50"
                >
                  Create new link
                </button>
                <button
                  type="button"
                  disabled={is_saving}
                  onClick={() => void runAction(async () => { await boardShareService.deleteLink(board_id, view_id); return null; }, "We couldn't delete the link.")}
                  className="rounded-lg px-3 py-2 text-[13px] font-semibold text-error-400 transition-colors hover:bg-error-500/10 disabled:opacity-50"
                >
                  Delete link
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold text-shell-text-secondary transition-colors hover:bg-shell-hover"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShareViewModal;
