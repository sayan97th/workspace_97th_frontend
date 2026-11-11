import { commentDraftsService, type CommentDraftDto } from "@/services/comment-drafts.service";

/**
 * Where a composer's draft lives: an item's "Write an update" box
 * (`parent_id` null), the reply box under one of its updates, or the same two
 * for the board discussion (`item_id` null).
 */
export type DraftAddress = {
  board_id: number;
  item_id: number | null;
  parent_id: number | null;
};

/**
 * - `pending`: typed, waiting for the debounce before it is sent.
 * - `saving`: on its way to the server.
 * - `saved`: the server has this exact text.
 * - `offline`: the server save failed, the draft is kept in this browser and retried.
 */
export type DraftSyncStatus = "pending" | "saving" | "saved" | "offline";

export type CommentDraftRecord = DraftAddress & {
  body: string;
  mentioned_user_ids: number[];
  notified_user_ids: number[];
  /** Epoch milliseconds of the last change. */
  updated_at: number;
  /** True while this browser has a change the server has not confirmed yet. */
  dirty: boolean;
  status: DraftSyncStatus;
  /** Bumped on every local change, so a save that finishes late can tell it is stale. */
  revision: number;
};

export type DraftPatch = {
  body?: string;
  mentioned_user_ids?: number[];
  notified_user_ids?: number[];
};

/** How long typing has to pause before the draft is sent to the server. */
const SAVE_DEBOUNCE_MS = 900;
/** How long to wait before retrying a save that failed (offline, server down). */
const RETRY_DELAY_MS = 15000;
const STORAGE_PREFIX = "comment-drafts:v1:";
/** The API's `CommentDraft::MAX_BODY_LENGTH`. A longer draft stays in this browser only. */
const MAX_SERVER_BODY_LENGTH = 20000;

/** A Markdown body counts as empty when it has no visible text and no inline image. */
export const isDraftBodyEmpty = (body: string): boolean => body.trim().length === 0 && !body.includes("![");

export const draftKeyOf = ({ board_id, item_id, parent_id }: DraftAddress): string =>
  `${board_id}:${item_id ?? "board"}:${parent_id ?? "root"}`;

const sameIds = (a: number[], b: number[]): boolean => a.length === b.length && a.every((id, index) => id === b[index]);

const toIds = (ids: Array<number | string> | undefined): number[] =>
  Array.from(new Set((ids ?? []).map(Number).filter((id) => Number.isFinite(id))));

type Listener = () => void;

/**
 * One shared copy of the signed in user's update and reply drafts, so every
 * composer on the page restores and saves through the same place, the same
 * way `useSavedReplies` shares saved replies. Each keystroke lands in this
 * browser's storage right away (nothing is lost if the tab closes), and is
 * sent to the API after a short pause, so the draft follows the user to other
 * devices like Slack's drafts. A board's drafts are fetched once, when the
 * board or one of its drawers opens, and merged with what this browser still
 * holds: a local change the server never got wins over the server's copy.
 */
class CommentDraftStore {
  private owner_id: number | null = null;
  private records = new Map<string, CommentDraftRecord>();
  private loaded_boards = new Set<number>();
  private loading_boards = new Map<number, Promise<void>>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private in_flight = new Set<string>();
  private listeners = new Set<Listener>();
  private version = 0;
  private has_page_listeners = false;

  // ---- subscription (useSyncExternalStore) ----

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = (): number => this.version;

  private emit() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  // ---- owner ----

  /** Switches the store to the signed in user, loading what this browser kept for them. Null signs out. */
  setOwner(user_id: number | null) {
    if (this.owner_id === user_id) return;
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.records.clear();
    this.loaded_boards.clear();
    this.loading_boards.clear();
    this.owner_id = user_id;
    if (user_id !== null) {
      this.readStorage();
      this.attachPageListeners();
      // Changes a previous visit could not send are retried now.
      this.records.forEach((record, key) => {
        if (record.dirty) this.scheduleSave(key, SAVE_DEBOUNCE_MS);
      });
    }
    this.emit();
  }

  // ---- reads ----

  /** The draft of one composer, or null when it has none (or only an emptied one waiting to be removed). */
  getDraft(address: DraftAddress): CommentDraftRecord | null {
    const record = this.records.get(draftKeyOf(address));
    return record && !isDraftBodyEmpty(record.body) ? record : null;
  }

  /** Every non empty draft of one item or of the board discussion (`item_id` null), update box and replies. */
  getScopeDrafts(board_id: number, item_id: number | null): CommentDraftRecord[] {
    return Array.from(this.records.values()).filter(
      (record) => record.board_id === board_id && record.item_id === item_id && !isDraftBodyEmpty(record.body)
    );
  }

  /** Whether the item has any draft, update box or reply, for the table's chat bubble. */
  hasItemDraft(item_id: number): boolean {
    for (const record of this.records.values()) {
      if (record.item_id === item_id && !isDraftBodyEmpty(record.body)) return true;
    }
    return false;
  }

  isBoardLoaded(board_id: number): boolean {
    return this.loaded_boards.has(board_id);
  }

  // ---- writes ----

  /** Records a change to one composer: the text, or the people picked with `@mention` or "Notify". */
  updateDraft(address: DraftAddress, patch: DraftPatch) {
    if (this.owner_id === null) return;
    const key = draftKeyOf(address);
    const current = this.records.get(key);
    // Picking people for a box with no text yet is not a draft by itself.
    if (!current && (patch.body === undefined || isDraftBodyEmpty(patch.body))) return;

    const next_body = patch.body ?? current?.body ?? "";
    const next_mentioned = patch.mentioned_user_ids ? toIds(patch.mentioned_user_ids) : current?.mentioned_user_ids ?? [];
    const next_notified = patch.notified_user_ids ? toIds(patch.notified_user_ids) : current?.notified_user_ids ?? [];
    if (
      current &&
      current.body === next_body &&
      sameIds(current.mentioned_user_ids, next_mentioned) &&
      sameIds(current.notified_user_ids, next_notified)
    ) {
      return;
    }

    this.records.set(key, {
      ...address,
      body: next_body,
      mentioned_user_ids: next_mentioned,
      notified_user_ids: next_notified,
      updated_at: Date.now(),
      dirty: true,
      status: "pending",
      revision: (current?.revision ?? 0) + 1,
    });
    this.writeStorage();
    this.scheduleSave(key, SAVE_DEBOUNCE_MS);
    this.emit();
  }

  /** Throws a draft away: once it is sent, or when the user discards it. The server copy goes right away. */
  clearDraft(address: DraftAddress) {
    const key = draftKeyOf(address);
    const current = this.records.get(key);
    if (!current) return;
    this.records.set(key, { ...current, body: "", mentioned_user_ids: [], notified_user_ids: [], updated_at: Date.now(), dirty: true, status: "pending", revision: current.revision + 1 });
    this.writeStorage();
    this.scheduleSave(key, 0);
    this.emit();
  }

  /** Drops a draft the server already removed (the "Drafts" list deletes by id). */
  forgetDraft(address: DraftAddress) {
    const key = draftKeyOf(address);
    const timer = this.timers.get(key);
    if (timer) clearTimeout(timer);
    this.timers.delete(key);
    if (!this.records.delete(key)) return;
    this.writeStorage();
    this.emit();
  }

  /**
   * Fetches a board's drafts once (later calls reuse the first fetch) and
   * merges them in. Resolves even when the request fails, the drafts this
   * browser holds still restore.
   */
  ensureBoardLoaded(board_id: number): Promise<void> {
    if (this.owner_id === null || this.loaded_boards.has(board_id)) return Promise.resolve();
    const existing = this.loading_boards.get(board_id);
    if (existing) return existing;

    const owner_id = this.owner_id;
    const promise = commentDraftsService
      .listBoardDrafts(board_id)
      .then((dtos) => {
        if (this.owner_id !== owner_id) return;
        this.mergeServerDrafts(board_id, dtos);
        this.loaded_boards.add(board_id);
      })
      .catch(() => {
        // Left unloaded, so the next drawer open tries again.
      })
      .finally(() => {
        this.loading_boards.delete(board_id);
      });
    this.loading_boards.set(board_id, promise);
    return promise;
  }

  /** Sends every waiting change now, used when the tab is hidden or closed. */
  flushAll(keepalive = false) {
    Array.from(this.timers.keys()).forEach((key) => {
      const timer = this.timers.get(key);
      if (timer) clearTimeout(timer);
      this.timers.delete(key);
      void this.sync(key, keepalive);
    });
  }

  // ---- internals ----

  private mergeServerDrafts(board_id: number, dtos: CommentDraftDto[]) {
    const server_keys = new Set<string>();
    dtos.forEach((dto) => {
      const address: DraftAddress = { board_id: dto.board_id, item_id: dto.item_id, parent_id: dto.parent_id };
      const key = draftKeyOf(address);
      server_keys.add(key);
      const local = this.records.get(key);
      // A change this browser has not sent yet is newer than the server's copy.
      if (local?.dirty) return;
      this.records.set(key, {
        ...address,
        body: dto.body,
        mentioned_user_ids: toIds(dto.mentioned_user_ids),
        notified_user_ids: toIds(dto.notified_user_ids),
        updated_at: dto.updated_at ? Date.parse(dto.updated_at) || Date.now() : Date.now(),
        dirty: false,
        status: "saved",
        revision: local?.revision ?? 0,
      });
    });
    // Sent or discarded on another device: the clean local copy goes too.
    this.records.forEach((record, key) => {
      if (record.board_id === board_id && !record.dirty && !server_keys.has(key)) this.records.delete(key);
    });
    this.writeStorage();
    this.emit();
  }

  private scheduleSave(key: string, delay: number) {
    const timer = this.timers.get(key);
    if (timer) clearTimeout(timer);
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        void this.sync(key);
      }, delay)
    );
  }

  private async sync(key: string, keepalive = false) {
    const record = this.records.get(key);
    if (!record || !record.dirty || this.owner_id === null) return;
    // One request per composer at a time, the newest text follows once it lands.
    if (this.in_flight.has(key)) {
      this.scheduleSave(key, SAVE_DEBOUNCE_MS);
      return;
    }

    const owner_id = this.owner_id;
    const revision = record.revision;
    const is_removal = isDraftBodyEmpty(record.body);
    if (record.body.length > MAX_SERVER_BODY_LENGTH) {
      this.setStatus(key, revision, "offline");
      return;
    }
    this.in_flight.add(key);
    this.setStatus(key, revision, "saving");
    try {
      if (is_removal) {
        await commentDraftsService.discardDraft(record.board_id, record.item_id, record.parent_id);
      } else {
        await commentDraftsService.saveDraft(
          record.board_id,
          {
            item_id: record.item_id,
            parent_id: record.parent_id,
            body: record.body,
            mentioned_user_ids: record.mentioned_user_ids,
            notified_user_ids: record.notified_user_ids,
          },
          keepalive
        );
      }
      if (this.owner_id !== owner_id) return;
      const latest = this.records.get(key);
      if (!latest || latest.revision !== revision) return;
      if (is_removal) this.records.delete(key);
      else this.records.set(key, { ...latest, dirty: false, status: "saved" });
      this.writeStorage();
      this.emit();
    } catch (error) {
      if (this.owner_id !== owner_id) return;
      const status_code = (error as { status_code?: number } | null)?.status_code;
      // The item, the update or the board is gone (or no longer open to this user): nothing to save it against.
      // An overlong body never reaches the request (see above), so a 422 here means the address itself is invalid.
      if (status_code === 403 || status_code === 404 || status_code === 422) {
        this.records.delete(key);
        this.writeStorage();
        this.emit();
        return;
      }
      this.setStatus(key, revision, "offline");
      this.scheduleSave(key, RETRY_DELAY_MS);
    } finally {
      this.in_flight.delete(key);
    }
  }

  private setStatus(key: string, revision: number, status: DraftSyncStatus) {
    const record = this.records.get(key);
    if (!record || record.revision !== revision || record.status === status) return;
    this.records.set(key, { ...record, status });
    this.emit();
  }

  private storageKey(): string | null {
    return this.owner_id === null ? null : `${STORAGE_PREFIX}${this.owner_id}`;
  }

  private readStorage() {
    const storage_key = this.storageKey();
    if (!storage_key || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storage_key);
      if (!raw) return;
      const saved = JSON.parse(raw) as Array<Omit<CommentDraftRecord, "status" | "revision">>;
      saved.forEach((entry) => {
        const record: CommentDraftRecord = { ...entry, status: entry.dirty ? "pending" : "saved", revision: 0 };
        this.records.set(draftKeyOf(record), record);
      });
    } catch {
      // A broken or blocked storage only loses the browser copy, the server still has the drafts.
    }
  }

  private writeStorage() {
    const storage_key = this.storageKey();
    if (!storage_key || typeof window === "undefined") return;
    try {
      const entries = Array.from(this.records.values()).map((record) => ({
        board_id: record.board_id,
        item_id: record.item_id,
        parent_id: record.parent_id,
        body: record.body,
        mentioned_user_ids: record.mentioned_user_ids,
        notified_user_ids: record.notified_user_ids,
        updated_at: record.updated_at,
        dirty: record.dirty,
      }));
      if (entries.length === 0) window.localStorage.removeItem(storage_key);
      else window.localStorage.setItem(storage_key, JSON.stringify(entries));
    } catch {
      // Storage full or blocked: the server copy still saves.
    }
  }

  private attachPageListeners() {
    if (this.has_page_listeners || typeof window === "undefined") return;
    this.has_page_listeners = true;
    // Leaving the page sends what is still waiting, `keepalive` lets it finish after the tab is gone.
    window.addEventListener("pagehide", () => this.flushAll(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flushAll(true);
    });
  }
}

export const commentDraftStore = new CommentDraftStore();
