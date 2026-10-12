"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type DocSaveStatus = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 800;

/**
 * Debounced autosave for a doc body. `queueSave` on every edit, `flushSave`
 * on blur; a pending save is flushed (never dropped) on unmount, and leaving
 * the page with unsaved edits asks first. A failed save keeps the content
 * dirty so the next edit or `flushSave` retries it.
 */
export const useDocAutosave = (save: (content: string) => Promise<unknown>) => {
  const [status, setStatus] = useState<DocSaveStatus>("idle");
  const timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest_ref = useRef<string | null>(null);
  const save_ref = useRef(save);
  useEffect(() => {
    save_ref.current = save;
  });

  const flushSave = useCallback(() => {
    if (timeout_ref.current) clearTimeout(timeout_ref.current);
    timeout_ref.current = null;
    const content = latest_ref.current;
    if (content === null) return;
    latest_ref.current = null;
    setStatus("saving");
    save_ref
      .current(content)
      .then(() => {
        // Only "Saved" once nothing newer is waiting.
        if (latest_ref.current === null) setStatus("saved");
      })
      .catch(() => {
        if (latest_ref.current === null) latest_ref.current = content;
        setStatus("error");
      });
  }, []);

  const queueSave = useCallback(
    (content: string) => {
      latest_ref.current = content;
      setStatus("saving");
      if (timeout_ref.current) clearTimeout(timeout_ref.current);
      timeout_ref.current = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
    },
    [flushSave]
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (latest_ref.current === null) return;
      flushSave();
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushSave();
    };
  }, [flushSave]);

  return { status, queueSave, flushSave };
};
