"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { getEcho } from "@/lib/echo";
import { boardExportService } from "@/services/board-export.service";
import { BOARD_EXPORT_TERMINAL_STATUSES, type BoardExportJobDto } from "@/types/board-export";

const POLL_INTERVAL_MS = 2000;

/**
 * Follows one board export's progress for `ExportBoardModal`, like
 * `useBoardImportProgress` does for imports: the exporting person's private
 * `board-export.{user_id}` channel moves the bar live, and a status poll every
 * couple of seconds keeps it moving when the websocket isn't connected. Both
 * stop once the export reaches a terminal status.
 *
 * `seed_job` is the snapshot `POST .../exports` returned, shown until the
 * first live update or poll arrives.
 */
export function useBoardExportProgress(board_id: number, seed_job: BoardExportJobDto | null): BoardExportJobDto | null {
  const [job, setJob] = useState<BoardExportJobDto | null>(seed_job);
  const { user } = useAuth();
  const job_id = seed_job?.id ?? null;

  useEffect(() => {
    setJob(seed_job);
    // Only a new export (a new id) resets the tracked job, a re-render with the same seed must
    // not overwrite a newer live update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job_id]);

  const is_terminal = job === null || BOARD_EXPORT_TERMINAL_STATUSES.includes(job.status);

  useEffect(() => {
    const token = getToken();
    if (!user || !token || job_id === null || is_terminal) return;

    const echo = getEcho(token);
    const channel_name = `board-export.${user.id}`;
    const channel = echo.private(channel_name).listen(".board_export_progress", (payload: BoardExportJobDto) => {
      if (payload.id === job_id) setJob(payload);
    });

    return () => {
      channel.stopListening(".board_export_progress");
      echo.leave(channel_name);
    };
  }, [user, job_id, is_terminal]);

  const is_terminal_ref = useRef(is_terminal);
  is_terminal_ref.current = is_terminal;

  useEffect(() => {
    if (job_id === null || is_terminal) return;

    const interval = window.setInterval(() => {
      if (is_terminal_ref.current) return;
      boardExportService
        .getStatus(board_id, job_id)
        .then((fresh) => {
          // A broadcast may already have delivered a newer snapshot.
          setJob((current) => (current && current.id === fresh.id && fresh.processed_rows < current.processed_rows && fresh.status === current.status ? current : fresh));
        })
        .catch(() => {
          // A transient failure keeps the last snapshot, the next tick catches up.
        });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [board_id, job_id, is_terminal]);

  return job;
}
