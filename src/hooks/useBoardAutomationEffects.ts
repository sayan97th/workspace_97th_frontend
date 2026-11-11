"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getToken } from "@/lib/api-client";
import { subscribeToAutomationEffects, wasBroadcastHandled } from "@/lib/automation-effects";
import { listenOnPrivateChannel } from "@/lib/echo";
import type { BoardAutomationEffect, BoardAutomationsRanEvent } from "@/types/automation-effects";

/**
 * How long a socket event set off by the viewer's own change waits for the HTTP response that
 * carries the same effects. The socket is sent while the request is still running, so it usually
 * wins the race, and applying both would reload the rows twice and show the toast twice.
 */
const OWN_EVENT_GRACE_MS = 1500;

/** Effects that land this close together are applied as one reload. */
const BATCH_WINDOW_MS = 60;

/**
 * Follows what automations do on one board, so the board shows it right away instead of after a
 * page refresh:
 * - the `automation_effects` of the viewer's own requests (see `lib/automation-effects.ts`),
 * - the `board_automations_ran` event on the `board-automations.{board_id}` private channel, for
 *   changes made by other people, scheduled triggers and delayed "wait" steps.
 *
 * `onEffect` receives one merged effect per burst: the root item ids to read again, whether the
 * groups changed, and the run lines for the toast.
 */
export function useBoardAutomationEffects(board_id: number, onEffect: (effect: BoardAutomationEffect) => void): void {
  const { user } = useAuth();
  const on_effect_ref = useRef(onEffect);
  on_effect_ref.current = onEffect;

  useEffect(() => {
    let pending: BoardAutomationEffect | null = null;
    let flush_timer: ReturnType<typeof setTimeout> | null = null;
    const grace_timers = new Set<ReturnType<typeof setTimeout>>();

    const flush = () => {
      flush_timer = null;
      const effect = pending;
      pending = null;
      if (effect) on_effect_ref.current(effect);
    };

    const queue = (effect: BoardAutomationEffect) => {
      pending = pending
        ? {
            board_id,
            item_ids: Array.from(new Set([...pending.item_ids, ...effect.item_ids])),
            needs_structure_refresh: pending.needs_structure_refresh || effect.needs_structure_refresh,
            runs: [...pending.runs, ...effect.runs],
            source: pending.source === "self" || effect.source === "self" ? "self" : "others",
          }
        : effect;
      if (!flush_timer) flush_timer = setTimeout(flush, BATCH_WINDOW_MS);
    };

    const stop_responses = subscribeToAutomationEffects((payload) => {
      const board = payload.boards.find((candidate) => candidate.board_id === board_id);
      const runs = payload.runs.filter((run) => run.board_id === board_id);
      if (!board && runs.length === 0) return;
      queue({
        board_id,
        item_ids: board?.item_ids ?? [],
        needs_structure_refresh: board?.needs_structure_refresh ?? false,
        runs,
        source: "self",
      });
    });

    const token = getToken();
    const stop_socket = token
      ? listenOnPrivateChannel<BoardAutomationsRanEvent>(token, `board-automations.${board_id}`, ".board_automations_ran", (event) => {
          const applyEvent = () => {
            if (wasBroadcastHandled(event.broadcast_id)) return;
            queue({
              board_id,
              item_ids: event.item_ids,
              needs_structure_refresh: event.needs_structure_refresh,
              runs: event.runs,
              source: "others",
            });
          };
          if (user && event.actor_id === user.id) {
            const timer = setTimeout(() => {
              grace_timers.delete(timer);
              applyEvent();
            }, OWN_EVENT_GRACE_MS);
            grace_timers.add(timer);
            return;
          }
          applyEvent();
        })
      : () => {};

    return () => {
      stop_responses();
      stop_socket();
      grace_timers.forEach((timer) => clearTimeout(timer));
      if (flush_timer) clearTimeout(flush_timer);
    };
  }, [board_id, user]);
}
