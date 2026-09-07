"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { getEcho } from "@/lib/echo";
import { boardImportService } from "@/services/board-import.service";
import { BOARD_IMPORT_JOB_TERMINAL_STATUSES, type BoardImportJobDto } from "@/types/board-import";

const POLL_INTERVAL_MS = 3000;

/**
 * Tracks one "Import items" background job's live progress for the
 * wizard's "Importing…" step. Two sources feed the same state, whichever
 * updates first: the importing user's private `board-import.{user_id}`
 * Reverb channel (mirrors `useFeedUpdates`'s own live-channel pattern), and
 * — since a stalled/misconfigured websocket connection would otherwise
 * leave the progress bar frozen with no way to tell whether the import is
 * still running — a `GET .../import/{id}` poll every few seconds for as
 * long as the job hasn't reached a terminal status.
 *
 * `seed_job` is the job snapshot `commit()`'s own 202 response already
 * returned — passed straight in as the initial state so the bar has
 * something to show before either the socket or the first poll resolves.
 */
export function useBoardImportProgress(board_id: number, seed_job: BoardImportJobDto | null): BoardImportJobDto | null {
  const [job, setJob] = useState<BoardImportJobDto | null>(seed_job);
  const { user } = useAuth();
  const job_id = seed_job?.id ?? null;

  useEffect(() => {
    setJob(seed_job);
    // Only `seed_job`'s identity (its id) should reset the tracked job —
    // re-running this on every seed_job object reference would stomp a
    // newer live update with a stale seed on an unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job_id]);

  const is_terminal = job === null || BOARD_IMPORT_JOB_TERMINAL_STATUSES.includes(job.status);

  useEffect(() => {
    const token = getToken();
    if (!user || !token || job_id === null) return;

    const echo = getEcho(token);
    const channel_name = `board-import.${user.id}`;
    const channel = echo.private(channel_name).listen(".board_import_progress", (payload: BoardImportJobDto) => {
      if (payload.id === job_id) setJob(payload);
    });

    return () => {
      channel.stopListening(".board_import_progress");
      echo.leave(channel_name);
    };
  }, [user, job_id]);

  const is_terminal_ref = useRef(is_terminal);
  is_terminal_ref.current = is_terminal;

  useEffect(() => {
    if (job_id === null || is_terminal) return;

    const interval = window.setInterval(() => {
      if (is_terminal_ref.current) return;
      boardImportService
        .getStatus(board_id, job_id)
        .then(setJob)
        .catch(() => {
          // Leave the last known snapshot on a transient poll failure — the
          // next tick (or a live broadcast) will catch it back up.
        });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [board_id, job_id, is_terminal]);

  return job;
}
