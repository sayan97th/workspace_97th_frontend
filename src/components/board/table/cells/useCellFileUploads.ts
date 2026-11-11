"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UploadProgress } from "@/lib/api-client";

/**
 * - `queued`: waiting for the cell's previous upload to finish.
 * - `uploading`: bytes are going out, `progress` is real.
 * - `processing`: every byte is sent, the server is storing it (and making image thumbnails).
 * - `failed`: kept with its message until Retry or dismiss.
 * A saved batch leaves the queue right away, the real entry in the cell takes its place.
 */
export type PendingUploadStatus = "queued" | "uploading" | "processing" | "failed";

/** One file of an upload that has not landed in the cell yet. */
export interface PendingUpload {
  id: string;
  batch_id: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  /** A local `blob:` copy of an image, so its thumbnail shows before the server answers. */
  preview_url: string | null;
  status: PendingUploadStatus;
  /** 0 to 1, shared by every file of the batch (they go out in one request). */
  progress: number;
  error: string | null;
}

/** The whole queue in one line, what the cell itself shows. */
export interface UploadSummary {
  status: PendingUploadStatus;
  /** The batch the cell is talking about: the running one, else a failed one, else the next queued one. */
  batch_id: string;
  /** Files in that batch, plus how many more wait behind it. */
  file_count: number;
  queued_count: number;
  /** The first file of that batch, for the label and the thumbnail. */
  lead: PendingUpload;
  progress: number;
  error: string | null;
}

/** Sends one batch, calls `onProgress` as bytes go out, resolves once the cell holds the new files. */
export type UploadBatchFn = (files: File[], onProgress: (progress: UploadProgress) => void) => Promise<void>;

let upload_sequence = 0;
function nextUploadId(prefix: string): string {
  upload_sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${upload_sequence}`;
}

type ApiError = { errors?: Record<string, string[]>; message?: string };

export function readUploadError(error: unknown, fallback = "The file could not be uploaded."): string {
  const payload = error as ApiError | undefined;
  const first_field_error = payload?.errors ? Object.values(payload.errors).flat()[0] : undefined;
  return first_field_error ?? payload?.message ?? fallback;
}

/**
 * A Files cell's upload queue. Every way in (picker, drop, paste, webcam) calls `enqueue`, which
 * shows the files in the cell right away and sends them one batch after another. Sending them in
 * order matters: each answer carries the cell's whole list, so an older answer arriving last would
 * hide a newer file. Nothing is ever dropped because another upload is still running.
 */
export function useCellFileUploads(upload: UploadBatchFn) {
  const [pending, setPending] = useState<PendingUpload[]>([]);

  const upload_ref = useRef(upload);
  upload_ref.current = upload;
  const chain_ref = useRef<Promise<void>>(Promise.resolve());
  const batch_files_ref = useRef(new Map<string, File[]>());
  const preview_urls_ref = useRef(new Set<string>());

  // Local previews go with the cell.
  useEffect(() => {
    const preview_urls = preview_urls_ref.current;
    return () => {
      preview_urls.forEach((url) => URL.revokeObjectURL(url));
      preview_urls.clear();
    };
  }, []);

  const patchBatch = useCallback((batch_id: string, patch: Partial<PendingUpload>) => {
    setPending((current) => current.map((entry) => (entry.batch_id === batch_id ? { ...entry, ...patch } : entry)));
  }, []);

  const removeBatch = useCallback((batch_id: string) => {
    batch_files_ref.current.delete(batch_id);
    setPending((current) => {
      for (const entry of current) {
        if (entry.batch_id !== batch_id || !entry.preview_url) continue;
        URL.revokeObjectURL(entry.preview_url);
        preview_urls_ref.current.delete(entry.preview_url);
      }
      return current.filter((entry) => entry.batch_id !== batch_id);
    });
  }, []);

  /** Runs after every batch queued before it. Rejects with the API error, the entries stay as `failed`. */
  const runBatch = useCallback(
    (batch_id: string): Promise<void> => {
      const run = chain_ref.current.then(async () => {
        const files = batch_files_ref.current.get(batch_id);
        if (!files) return; // Dismissed while it waited.
        patchBatch(batch_id, { status: "uploading", progress: 0, error: null });
        let last_percent = -1;
        try {
          await upload_ref.current(files, ({ loaded, total }) => {
            if (total <= 0) return;
            const ratio = Math.min(1, loaded / total);
            // A render per whole percent is plenty, progress events can fire hundreds of times.
            const percent = Math.floor(ratio * 100);
            if (percent === last_percent) return;
            last_percent = percent;
            patchBatch(batch_id, ratio >= 1 ? { status: "processing", progress: 1 } : { progress: ratio });
          });
        } catch (caught) {
          patchBatch(batch_id, { status: "failed", error: readUploadError(caught) });
          throw caught;
        }
        // The cell already holds the saved files (the action wrote them), so the placeholder goes.
        removeBatch(batch_id);
      });
      // The next batch waits for this one whether it worked or not.
      chain_ref.current = run.catch(() => undefined);
      return run;
    },
    [patchBatch, removeBatch]
  );

  /** Shows `files` in the cell at once and queues them. The promise settles with this batch. */
  const enqueue = useCallback(
    (files: File[]): { batch_id: string; done: Promise<void> } => {
      const batch_id = nextUploadId("batch");
      batch_files_ref.current.set(batch_id, files);
      const entries = files.map<PendingUpload>((file) => {
        const preview_url = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        if (preview_url) preview_urls_ref.current.add(preview_url);
        return {
          id: nextUploadId("upload"),
          batch_id,
          file_name: file.name,
          size_bytes: file.size,
          mime_type: file.type,
          preview_url,
          status: "queued",
          progress: 0,
          error: null,
        };
      });
      setPending((current) => [...current, ...entries]);
      return { batch_id, done: runBatch(batch_id) };
    },
    [runBatch]
  );

  /** A failed batch's "Retry", sends the same files again (behind anything still running). */
  const retry = useCallback(
    (batch_id: string) => {
      if (!batch_files_ref.current.has(batch_id)) return;
      patchBatch(batch_id, { status: "queued", progress: 0, error: null });
      runBatch(batch_id).catch(() => undefined);
    },
    [patchBatch, runBatch]
  );

  const summary = useMemo<UploadSummary | null>(() => {
    if (pending.length === 0) return null;
    const by_priority: PendingUploadStatus[] = ["uploading", "processing", "failed", "queued"];
    const lead = by_priority.map((status) => pending.find((entry) => entry.status === status)).find(Boolean);
    if (!lead) return null;
    const batch = pending.filter((entry) => entry.batch_id === lead.batch_id);
    const queued_count = pending.filter((entry) => entry.batch_id !== lead.batch_id && entry.status === "queued").length;
    return {
      status: lead.status,
      batch_id: lead.batch_id,
      file_count: batch.length,
      queued_count,
      lead,
      progress: lead.progress,
      error: lead.error,
    };
  }, [pending]);

  const is_uploading = pending.some((entry) => entry.status !== "failed");

  return { pending, summary, is_uploading, enqueue, retry, dismiss: removeBatch };
}
