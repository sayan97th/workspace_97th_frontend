import type { AutomationEffectsPayload } from "@/types/automation-effects";

/**
 * In memory hub for the `automation_effects` the API adds to any response whose change set
 * automations off. `api-client` publishes every one it sees, so a cell edit, a new item, a
 * posted update or a button press all reach the open board the same way, without each caller
 * having to know automations exist. See `useBoardAutomationEffects` for the board side.
 */

type AutomationEffectsHandler = (payload: AutomationEffectsPayload) => void;

const handlers = new Set<AutomationEffectsHandler>();

/** Broadcast ids the viewer already received in a response, the socket copy of them is ignored. */
const handled_broadcast_ids = new Set<string>();
const MAX_REMEMBERED_BROADCASTS = 200;

function rememberBroadcastIds(ids: string[]): void {
  ids.forEach((id) => handled_broadcast_ids.add(id));
  // Oldest first, a Set keeps insertion order.
  while (handled_broadcast_ids.size > MAX_REMEMBERED_BROADCASTS) {
    const oldest = handled_broadcast_ids.values().next().value;
    if (oldest === undefined) break;
    handled_broadcast_ids.delete(oldest);
  }
}

function isAutomationEffectsPayload(value: unknown): value is AutomationEffectsPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AutomationEffectsPayload>;
  return Array.isArray(candidate.boards) && Array.isArray(candidate.runs);
}

/** Called by `api-client` with every parsed JSON body, publishes its `automation_effects` when it has some. */
export function publishAutomationEffectsFromResponse(body: unknown): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) return;
  const effects = (body as { automation_effects?: unknown }).automation_effects;
  if (!isAutomationEffectsPayload(effects)) return;

  rememberBroadcastIds(effects.broadcast_ids ?? []);
  handlers.forEach((handler) => {
    try {
      handler(effects);
    } catch (error) {
      console.error("An automation effects handler failed", error);
    }
  });
}

/** True when the socket event with this id was already applied from a response. */
export function wasBroadcastHandled(broadcast_id: string): boolean {
  return handled_broadcast_ids.has(broadcast_id);
}

/** @returns A function that stops listening. */
export function subscribeToAutomationEffects(handler: AutomationEffectsHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}
