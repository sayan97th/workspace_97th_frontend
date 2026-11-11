import type { FeedUpdate } from "@/data/update-feed-data";

/**
 * Pure helpers for the Update Feed's threads. The feed shows one card per
 * top-level update with its replies inline under it (monday.com's inbox
 * layout), so most changes either swap a whole card or touch one reply
 * inside a card. Kept free of React so they can be unit tested.
 */

/** Whether the card, or any reply in it, is still unread. */
export function isThreadUnread(card: FeedUpdate): boolean {
  return card.is_unread || card.replies.some((reply) => reply.is_unread);
}

/** How many unread entries a card holds, the update itself and its replies. */
export function countThreadUnread(card: FeedUpdate): number {
  return Number(card.is_unread) + card.replies.filter((reply) => reply.is_unread).length;
}

/** Every id on screen, cards and the replies inside them. */
export function collectFeedIds(cards: FeedUpdate[]): Set<string> {
  const ids = new Set<string>();
  for (const card of cards) {
    ids.add(card.id);
    for (const reply of card.replies) ids.add(reply.id);
  }
  return ids;
}

/**
 * The server's copy of a card replacing the one on screen. Only a page load
 * sends the item changes timeline, so a card that already shows one keeps it
 * when the fresh copy (an action response, a live update) comes without.
 */
export function mergeThread(current: FeedUpdate, incoming: FeedUpdate): FeedUpdate {
  const keeps_activity = incoming.activity.length === 0 && current.activity.length > 0;
  return keeps_activity ? { ...incoming, activity: current.activity, activity_total: current.activity_total } : incoming;
}

/** Changes the card or the reply with `id` in place, wherever it sits. */
export function patchFeedEntry(cards: FeedUpdate[], id: string, transform: (entry: FeedUpdate) => FeedUpdate): FeedUpdate[] {
  return cards.map((card) => {
    if (card.id === id) return transform(card);
    if (!card.replies.some((reply) => reply.id === id)) return card;
    return { ...card, replies: card.replies.map((reply) => (reply.id === id ? transform(reply) : reply)) };
  });
}

/** Swaps in the server's copy of a card, or of one reply inside its card. */
export function replaceFeedEntry(cards: FeedUpdate[], incoming: FeedUpdate): FeedUpdate[] {
  return patchFeedEntry(cards, incoming.id, (current) => (current.id === incoming.thread_id ? mergeThread(current, incoming) : incoming));
}

/**
 * Puts a new reply at the end of its thread's card, or refreshes it when the
 * live broadcast already brought it in. A reply whose card is not loaded is
 * left out, the next load shows it in its thread.
 */
export function appendReply(cards: FeedUpdate[], reply: FeedUpdate): FeedUpdate[] {
  return cards.map((card) => {
    if (card.id !== reply.thread_id) return card;
    const exists = card.replies.some((current) => current.id === reply.id);
    return {
      ...card,
      replies: exists ? card.replies.map((current) => (current.id === reply.id ? reply : current)) : [...card.replies, reply],
    };
  });
}
