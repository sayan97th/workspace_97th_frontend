"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { boardFormService } from "@/services/board-form.service";
import type { BoardFormBuilderDto, UpdateBoardFormPayload } from "@/types/board-forms";

/** How long the builder waits after the last change before saving. */
const SAVE_DELAY_MS = 600;

export type UseBoardFormResult = {
  builder: BoardFormBuilderDto | null;
  is_loading: boolean;
  is_saving: boolean;
  error: string | null;
  /** Applies a change right away and saves it shortly after, batched with any other change made meanwhile. */
  updateConfig: (patch: UpdateBoardFormPayload) => void;
  regenerateLink: () => Promise<void>;
};

/**
 * Loads a Form view's builder data and keeps it in sync with the API.
 * Changes show up immediately and are saved in one request once the user
 * pauses, so typing a title does not fire a request per keystroke.
 */
export default function useBoardForm(board_id: number, view_id: number): UseBoardFormResult {
  const [builder, setBuilder] = useState<BoardFormBuilderDto | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending_patch_ref = useRef<UpdateBoardFormPayload>({});
  const timer_ref = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    boardFormService
      .getBuilder(board_id, view_id)
      .then((result) => !cancelled && setBuilder(result))
      .catch((load_error) => !cancelled && setError(getApiErrorMessage(load_error, "We couldn't load this form.")))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [board_id, view_id]);

  const flush = useCallback(async () => {
    timer_ref.current = null;
    const patch = pending_patch_ref.current;
    pending_patch_ref.current = {};
    if (Object.keys(patch).length === 0) return;

    setIsSaving(true);
    try {
      const saved = await boardFormService.updateForm(board_id, view_id, patch);
      // A change made while this request was in flight wins over the
      // server copy, it is saved by the next flush.
      if (Object.keys(pending_patch_ref.current).length === 0) setBuilder(saved);
      setError(null);
    } catch (save_error) {
      setError(getApiErrorMessage(save_error, "We couldn't save the form."));
    } finally {
      setIsSaving(false);
    }
  }, [board_id, view_id]);

  useEffect(
    () => () => {
      if (timer_ref.current !== null) {
        window.clearTimeout(timer_ref.current);
        void flush();
      }
    },
    [flush]
  );

  const updateConfig = useCallback(
    (patch: UpdateBoardFormPayload) => {
      setBuilder((current) => (current ? { ...current, config: { ...current.config, ...patch } } : current));
      pending_patch_ref.current = { ...pending_patch_ref.current, ...patch };
      if (timer_ref.current !== null) window.clearTimeout(timer_ref.current);
      // A new source table brings its own columns and groups, which only the
      // saved response carries, so that change is saved right away.
      timer_ref.current = window.setTimeout(() => void flush(), patch.source_view_id !== undefined ? 0 : SAVE_DELAY_MS);
    },
    [flush]
  );

  const regenerateLink = useCallback(async () => {
    try {
      const token = await boardFormService.regenerateLink(board_id, view_id);
      setBuilder((current) => (current ? { ...current, token } : current));
    } catch (regenerate_error) {
      setError(getApiErrorMessage(regenerate_error, "We couldn't create a new link."));
    }
  }, [board_id, view_id]);

  return { builder, is_loading, is_saving, error, updateConfig, regenerateLink };
}
