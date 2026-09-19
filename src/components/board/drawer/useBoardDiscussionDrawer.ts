"use client";
import { useEffect, useMemo, useState } from "react";
import { boardDiscussionService } from "@/services/board-discussion.service";
import { boardMuteService } from "@/services/board-mute.service";
import { peopleService } from "@/services/people.service";
import type { BoardPersonOption } from "../toolbar/types";
import { mapRevisionDto } from "./commentMapping";
import { mapDiscussionCommentDtoToDrawerComment, mapDiscussionCommentDtoToDrawerReply } from "./discussionCommentMapping";
import { classifyAttachment } from "./drawerAttachments";
import { buildMentionMatches, mentionOptionUserIds, type MentionOption, type MentionTeam } from "./mentionOptions";
import type {
  DrawerAttachment,
  DrawerComment,
  DrawerCommentRevision,
  DrawerComposerTarget,
  DrawerReaction,
  RemoteCommentEvent,
} from "./types";

const createId = () => Math.random().toString(36).slice(2, 10);

const MENTION_TRIGGER = /@([\w]*)$/;

/** A rich text composer's Markdown body counts as empty when it's got no visible text and no inline image (`![alt](url)`). */
const isRichTextEmpty = (markdown: string): boolean => markdown.trim().length === 0 && !markdown.includes("![");

/** Bumps (or removes) a single emoji's reaction pill, toggling whether the current user reacted with it — a comment can carry any number of these in parallel, one per distinct emoji. */
const bumpReaction = (reactions: DrawerReaction[], emoji: string): DrawerReaction[] => {
  const index = reactions.findIndex((reaction) => reaction.emoji === emoji);
  if (index === -1) return [...reactions, { emoji, count: 1, reacted_by_me: true, reactor_names: ["You"] }];
  const current = reactions[index];
  const next_reacted_by_me = !current.reacted_by_me;
  const next_count = current.count + (next_reacted_by_me ? 1 : -1);
  if (next_count <= 0) return reactions.filter((_, existing_index) => existing_index !== index);
  const next_reactor_names = next_reacted_by_me
    ? [...current.reactor_names, "You"]
    : current.reactor_names.filter((name) => name !== "You");
  return reactions.map((reaction, existing_index) =>
    existing_index === index
      ? { ...reaction, count: next_count, reacted_by_me: next_reacted_by_me, reactor_names: next_reactor_names }
      : reaction
  );
};

type ComposerAttachmentDraft = { attachment: DrawerAttachment; file: File };

/** Board-specific configuration a caller supplies to {@link useBoardDiscussionDrawer}. */
export type BoardDiscussionDrawerConfig = {
  board_id: number;
  current_user: BoardPersonOption;
  mentionable_people: BoardPersonOption[];
  /** Small breadcrumb line shown under the drawer's "Board Discussion" title, e.g. "Personal · Marketing Plan". */
  breadcrumb_label: string;
  /** Server-known comment count (board.comments_count) shown on the "Board updates" badge before the drawer has ever been opened. */
  initial_comment_count?: number;
  /** Server-known unseen state (board.has_unseen_comments) — whether the badge should start out red before the drawer has ever been opened this load. */
  initial_has_unseen_comments?: boolean;
};

/** Full live state + actions returned by {@link useBoardDiscussionDrawer}. */
export type BoardDiscussionDrawerApi = BoardDiscussionDrawerConfig & {
  is_open: boolean;
  open: () => void;
  close: () => void;

  comments: DrawerComment[];
  /** True while the board's discussion comments are being fetched. */
  comments_loading: boolean;
  /** Set when a comment/reply/like/reaction/seen/attachment request fails. */
  comments_error: string | null;
  /** Total updates (top-level + replies), for the header's "Board updates" badge — `initial_comment_count` until the drawer has loaded once, then derived live from `comments`. */
  comment_count: number;
  /** Whether the "Board updates" badge should read as unseen (red) rather than caught-up (gray) — true until the drawer is opened once, since opening it marks the board as viewed server-side. */
  has_unseen_comments: boolean;

  /** How many updates other people posted since the thread was loaded, shown as the "N new updates" pill. */
  pending_update_count: number;
  /** Refetches the thread and folds in everything counted by {@link pending_update_count}. */
  loadPendingUpdates: () => void;
  /** Feeds a `board_comment_posted` broadcast (see `useCommentPresence`) into the drawer. */
  onRemoteCommentPosted: (event: RemoteCommentEvent) => void;
  /** Ids of comments and replies that arrived through the pill, so the thread can badge them as new for the rest of this session. */
  fresh_comment_ids: string[];
  /** Loads the earlier versions of an edited update (or reply when `reply_id` is given), newest edit first. */
  loadCommentRevisions: (comment_id: string, reply_id?: string) => Promise<DrawerCommentRevision[]>;

  /** Whether the current user has muted this board's notifications — fetched once the drawer opens. */
  is_muted: boolean;
  toggleMute: () => void;

  composer_text: string;
  composer_attachments: DrawerAttachment[];
  onComposerTextChange: (value: string) => void;
  postComment: () => void;
  addComposerAttachments: (files: File[]) => void;
  removeComposerAttachment: (attachment_id: string) => void;

  reply_text_by_comment: Record<string, string>;
  onReplyTextChange: (comment_id: string, value: string) => void;
  postReply: (comment_id: string) => void;

  mention_target: DrawerComposerTarget | null;
  mention_matches: MentionOption[];
  pickMention: (option: MentionOption) => void;

  /** Which composer's "Notify" people-picker is currently open — separate from `mention_target`, since Notify never touches the body text. */
  notify_target: DrawerComposerTarget | null;
  toggleNotifyPicker: (target: DrawerComposerTarget) => void;
  closeNotifyPicker: () => void;
  /** People picked via "Notify" for the in-progress composer/reply draft, keyed the same way as `DrawerComposerTarget`. */
  notified_people_by_target: Record<string, BoardPersonOption[]>;
  pickNotifyPerson: (person: BoardPersonOption) => void;
  removeNotifyPerson: (target: DrawerComposerTarget, person_id: string) => void;

  emoji_palette_target: DrawerComposerTarget | null;
  toggleEmojiPalette: (target: DrawerComposerTarget) => void;
  closeEmojiPalette: () => void;
  insertEmoji: (emoji: string) => void;

  reaction_palette_id: string | null;
  toggleReactionPalette: (id: string) => void;
  closeReactionPalette: () => void;
  toggleReaction: (comment_id: string, reply_id: string | null, emoji: string) => void;

  toggleLike: (comment_id: string, reply_id?: string) => void;
  toggleSeen: (comment_id: string) => void;
  /** Toggles whether a top-level comment is pinned — pinned updates sort ahead of the rest of the thread. */
  togglePin: (comment_id: string) => void;
  /** Deletes a top-level comment, or (when `reply_id` is given) just that reply. Author-only — also enforced server-side. */
  deleteComment: (comment_id: string, reply_id?: string) => void;

  /** `comment.id` while editing a top-level comment, `"commentId:replyId"` while editing a reply — null when nothing is being edited. */
  editing_key: string | null;
  edit_draft: string;
  onEditDraftChange: (value: string) => void;
  startEditingComment: (comment_id: string, reply_id?: string) => void;
  cancelEditingComment: () => void;
  saveEditedComment: () => void;
};

/**
 * Owns all Board Discussion Drawer state — open/closed, the board's flat
 * comment thread, composer drafts, `@mentions`, emoji palettes,
 * likes/reactions/seen — for the "Board updates" button in `BoardHeader`.
 * Mirrors {@link import("./useBoardItemDrawer").useBoardItemDrawer}'s
 * config-in/API-out shape, but without that hook's per-row concept (there's
 * exactly one thread: the whole board's), always persisted through
 * {@link boardDiscussionService} since this drawer only ever opens for a
 * real, saved board.
 */
export function useBoardDiscussionDrawer(config: BoardDiscussionDrawerConfig): BoardDiscussionDrawerApi {
  const { board_id } = config;

  const [is_open, setIsOpen] = useState(false);
  const [comments, setComments] = useState<DrawerComment[]>([]);
  const [comments_loading, setCommentsLoading] = useState(false);
  const [comments_error, setCommentsError] = useState<string | null>(null);
  /** Flips true once `listComments` has resolved at least once, so `comment_count`/`has_unseen_comments` can switch from the server-known initial values to ones derived from `comments` — that same fetch is also what marks the board as viewed server-side. */
  const [has_loaded_comments, setHasLoadedComments] = useState(false);
  const [editing_target, setEditingTarget] = useState<{ comment_id: string; reply_id?: string } | null>(null);
  const [edit_draft, setEditDraft] = useState("");

  const [composer_text, setComposerText] = useState("");
  const [composer_attachment_drafts, setComposerAttachmentDrafts] = useState<ComposerAttachmentDraft[]>([]);
  const [reply_text_by_comment, setReplyTextByComment] = useState<Record<string, string>>({});
  /** Ids of people picked via `@mention` for the in-progress composer/reply draft, keyed the same way as `DrawerComposerTarget`. */
  const [mention_ids_by_target, setMentionIdsByTarget] = useState<Record<string, string[]>>({});

  const [mention_target, setMentionTarget] = useState<DrawerComposerTarget | null>(null);
  const [mention_query, setMentionQuery] = useState("");
  const [notify_target, setNotifyTarget] = useState<DrawerComposerTarget | null>(null);
  /** Ids of people picked via "Notify" for the in-progress composer/reply draft, keyed the same way as `DrawerComposerTarget`. */
  const [notified_ids_by_target, setNotifiedIdsByTarget] = useState<Record<string, string[]>>({});
  const [emoji_palette_target, setEmojiPaletteTarget] = useState<DrawerComposerTarget | null>(null);
  const [reaction_palette_id, setReactionPaletteId] = useState<string | null>(null);
  const [is_muted, setIsMuted] = useState(false);
  // Account teams the `@mention` picker can offer as groups.
  const [mention_teams, setMentionTeams] = useState<MentionTeam[]>([]);
  // Ids other people posted while the drawer was open, which drive the "N new updates" pill until the
  // viewer loads them, and (afterwards) the "New" badge kept for the rest of the session.
  const [pending_comment_ids, setPendingCommentIds] = useState<string[]>([]);
  const [fresh_comment_ids, setFreshCommentIds] = useState<string[]>([]);

  useEffect(() => {
    let is_current = true;
    peopleService
      .listBoardTeams(board_id)
      .then((teams) => {
        if (is_current) setMentionTeams(teams.map((team) => ({ id: String(team.id), name: team.name, member_ids: team.member_ids.map(String) })));
      })
      .catch(() => {
        // Without teams the picker still offers Everyone and every person.
      });
    return () => {
      is_current = false;
    };
  }, [board_id]);

  const detectMention = (target: DrawerComposerTarget, value: string) => {
    // `value` is the composer's Markdown body — plain text, so the trigger
    // regex can run directly against it without stripping any markup first.
    const match = MENTION_TRIGGER.exec(value);
    if (match) {
      setMentionTarget(target);
      setMentionQuery(match[1].toLowerCase());
    } else if (mention_target === target) {
      setMentionTarget(null);
    }
  };

  const open = () => {
    setIsOpen(true);
    setComposerText("");
    setComposerAttachmentDrafts([]);
    setMentionTarget(null);
    setNotifyTarget(null);
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
    setMentionIdsByTarget({});
    setNotifiedIdsByTarget({});
    setCommentsError(null);
    setPendingCommentIds([]);
    setFreshCommentIds([]);
    setEditingTarget(null);
    setEditDraft("");

    boardMuteService
      .listMutedBoards()
      .then((muted_boards) => setIsMuted(muted_boards.some((board) => board.board_id === board_id)))
      .catch(() => {});

    setCommentsLoading(true);
    boardDiscussionService
      .listComments(board_id)
      .then((dtos) => {
        setComments(dtos.map(mapDiscussionCommentDtoToDrawerComment));
        setHasLoadedComments(true);
      })
      .catch(() => setCommentsError("Couldn't load updates. Please try again."))
      .finally(() => setCommentsLoading(false));
  };

  const close = () => {
    setIsOpen(false);
    setMentionTarget(null);
    setNotifyTarget(null);
    setEmojiPaletteTarget(null);
    setReactionPaletteId(null);
    setEditingTarget(null);
    setEditDraft("");
  };

  const onComposerTextChange = (value: string) => {
    setComposerText(value);
    detectMention("composer", value);
  };

  const onReplyTextChange = (comment_id: string, value: string) => {
    setReplyTextByComment((current) => ({ ...current, [comment_id]: value }));
    detectMention(comment_id, value);
  };

  // Text insertion itself happens in `RichTextComposer` (via its imperative
  // ref, called by `CommentComposer`), since only the live editor instance
  // knows where the cursor actually is — this only tracks which ids the
  // in-progress draft has mentioned, for the eventual `postComment()` payload.
  const pickMention = (option: MentionOption) => {
    if (!mention_target) return;
    const picked_ids = mentionOptionUserIds(option);
    setMentionIdsByTarget((current) => ({
      ...current,
      [mention_target]: Array.from(new Set([...(current[mention_target] ?? []), ...picked_ids])),
    }));
    setMentionTarget(null);
  };

  const toggleNotifyPicker = (target: DrawerComposerTarget) =>
    setNotifyTarget((current) => (current === target ? null : target));
  const closeNotifyPicker = () => setNotifyTarget(null);

  /** Adds `person` to the notify list for whichever composer/reply the picker is currently open for — a no-op if they're already on it. */
  const pickNotifyPerson = (person: BoardPersonOption) => {
    if (!notify_target) return;
    setNotifiedIdsByTarget((current) => {
      const existing = current[notify_target] ?? [];
      if (existing.includes(person.id)) return current;
      return { ...current, [notify_target]: [...existing, person.id] };
    });
    setNotifyTarget(null);
  };

  const removeNotifyPerson = (target: DrawerComposerTarget, person_id: string) =>
    setNotifiedIdsByTarget((current) => ({
      ...current,
      [target]: (current[target] ?? []).filter((id) => id !== person_id),
    }));

  const notified_people_by_target = useMemo(() => {
    const result: Record<string, BoardPersonOption[]> = {};
    for (const [target, ids] of Object.entries(notified_ids_by_target)) {
      result[target] = ids
        .map((id) => config.mentionable_people.find((person) => person.id === id))
        .filter((person): person is BoardPersonOption => person !== undefined);
    }
    return result;
  }, [notified_ids_by_target, config.mentionable_people]);

  const postComment = () => {
    const body = composer_text.trim();
    if (isRichTextEmpty(body) && composer_attachment_drafts.length === 0) return;

    const mentioned_user_ids = (mention_ids_by_target.composer ?? []).map(Number);
    const notified_user_ids = (notified_ids_by_target.composer ?? []).map(Number);
    const files = composer_attachment_drafts.map((draft) => draft.file);
    setCommentsError(null);
    boardDiscussionService
      .postComment(board_id, { body, mentioned_user_ids, notified_user_ids, attachments: files })
      .then((dto) => {
        setComments((current) => [mapDiscussionCommentDtoToDrawerComment(dto), ...current]);
        setComposerText("");
        setComposerAttachmentDrafts([]);
        setMentionIdsByTarget((current) => ({ ...current, composer: [] }));
        setNotifiedIdsByTarget((current) => ({ ...current, composer: [] }));
      })
      .catch(() => setCommentsError("Couldn't post your update. Please try again."));
  };

  const addComposerAttachments = (files: File[]) => {
    if (files.length === 0) return;
    const additions: ComposerAttachmentDraft[] = files.map((file) => ({
      attachment: { id: createId(), file_name: file.name, ...classifyAttachment(file.name) },
      file,
    }));
    setComposerAttachmentDrafts((current) => [...current, ...additions]);
  };

  const removeComposerAttachment = (attachment_id: string) =>
    setComposerAttachmentDrafts((current) => current.filter((draft) => draft.attachment.id !== attachment_id));

  const postReply = (comment_id: string) => {
    const body = (reply_text_by_comment[comment_id] ?? "").trim();
    if (isRichTextEmpty(body)) return;

    const mentioned_user_ids = (mention_ids_by_target[comment_id] ?? []).map(Number);
    const notified_user_ids = (notified_ids_by_target[comment_id] ?? []).map(Number);
    setCommentsError(null);
    boardDiscussionService
      .postComment(board_id, { body, parent_id: Number(comment_id), mentioned_user_ids, notified_user_ids })
      .then((dto) => {
        const new_reply = mapDiscussionCommentDtoToDrawerReply(dto);
        setComments((current) =>
          current.map((comment) =>
            comment.id === comment_id ? { ...comment, replies: [...comment.replies, new_reply] } : comment
          )
        );
        setReplyTextByComment((current) => ({ ...current, [comment_id]: "" }));
        setMentionIdsByTarget((current) => ({ ...current, [comment_id]: [] }));
        setNotifiedIdsByTarget((current) => ({ ...current, [comment_id]: [] }));
      })
      .catch(() => setCommentsError("Couldn't post your reply. Please try again."));
  };

  const toggleEmojiPalette = (target: DrawerComposerTarget) =>
    setEmojiPaletteTarget((current) => (current === target ? null : target));
  const closeEmojiPalette = () => setEmojiPaletteTarget(null);

  // The actual emoji insertion happens in `RichTextComposer` (via its
  // imperative ref, called by `CommentComposer`) — this only closes the
  // palette, same as `EmojiPalette`'s own `onClose` already does.
  const insertEmoji = () => setEmojiPaletteTarget(null);

  const toggleReactionPalette = (id: string) => setReactionPaletteId((current) => (current === id ? null : id));
  const closeReactionPalette = () => setReactionPaletteId(null);

  /** Applies (or reverts, by calling it again) the local reaction toggle for a comment or reply. */
  const applyReactionToggle = (comment_id: string, reply_id: string | null, emoji: string) =>
    setComments((current) =>
      current.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (reply_id === null) return { ...comment, reactions: bumpReaction(comment.reactions, emoji) };
        return {
          ...comment,
          replies: comment.replies.map((reply) =>
            reply.id === reply_id ? { ...reply, reactions: bumpReaction(reply.reactions, emoji) } : reply
          ),
        };
      })
    );

  /** Replaces a comment or reply's reactions with the server's authoritative list — called once a toggle request resolves, so any drift from the optimistic guess (an overlapping request, a stale retry) self-heals immediately instead of lingering until the next full reload. */
  const applyServerReactions = (comment_id: string, reply_id: string | null, reactions: DrawerReaction[]) =>
    setComments((current) =>
      current.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (reply_id === null) return { ...comment, reactions };
        return {
          ...comment,
          replies: comment.replies.map((reply) => (reply.id === reply_id ? { ...reply, reactions } : reply)),
        };
      })
    );

  const toggleReaction = (comment_id: string, reply_id: string | null, emoji: string) => {
    applyReactionToggle(comment_id, reply_id, emoji);
    setReactionPaletteId(null);

    boardDiscussionService
      .toggleReaction(board_id, Number(reply_id ?? comment_id), emoji)
      .then((dto) => applyServerReactions(comment_id, reply_id, dto.reactions))
      .catch(() => {
        applyReactionToggle(comment_id, reply_id, emoji);
        setCommentsError("Couldn't update that reaction. Please try again.");
      });
  };

  /** Applies (or reverts, by calling it again) the local like toggle for a comment or reply. */
  const applyLikeToggle = (comment_id: string, reply_id?: string) =>
    setComments((current) =>
      current.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (!reply_id) {
          const liked_by_me = !comment.liked_by_me;
          return { ...comment, liked_by_me, like_count: Math.max(0, comment.like_count + (liked_by_me ? 1 : -1)) };
        }
        return {
          ...comment,
          replies: comment.replies.map((reply) => {
            if (reply.id !== reply_id) return reply;
            const liked_by_me = !reply.liked_by_me;
            return { ...reply, liked_by_me, like_count: Math.max(0, reply.like_count + (liked_by_me ? 1 : -1)) };
          }),
        };
      })
    );

  const toggleLike = (comment_id: string, reply_id?: string) => {
    applyLikeToggle(comment_id, reply_id);

    boardDiscussionService.toggleLike(board_id, Number(reply_id ?? comment_id)).catch(() => {
      applyLikeToggle(comment_id, reply_id);
      setCommentsError("Couldn't update that like. Please try again.");
    });
  };

  /** Removes a comment (or, when `reply_id` is given, just that reply) from local state. */
  const removeCommentLocally = (comment_id: string, reply_id?: string) =>
    setComments((current) =>
      reply_id
        ? current.map((comment) =>
            comment.id === comment_id
              ? { ...comment, replies: comment.replies.filter((reply) => reply.id !== reply_id) }
              : comment
          )
        : current.filter((comment) => comment.id !== comment_id)
    );

  const deleteComment = (comment_id: string, reply_id?: string) => {
    const previous_comments = comments;
    removeCommentLocally(comment_id, reply_id);

    boardDiscussionService.deleteComment(board_id, Number(reply_id ?? comment_id)).catch(() => {
      setComments(previous_comments);
      setCommentsError("Couldn't delete that update. Please try again.");
    });
  };

  /** Applies (or reverts, by calling it again with the prior body) a body edit for a comment or reply. */
  const applyBodyEdit = (comment_id: string, reply_id: string | undefined, body: string) =>
    setComments((current) =>
      current.map((comment) => {
        if (comment.id !== comment_id) return comment;
        if (!reply_id) return { ...comment, body, is_edited: true };
        return {
          ...comment,
          replies: comment.replies.map((reply) => (reply.id === reply_id ? { ...reply, body, is_edited: true } : reply)),
        };
      })
    );

  const startEditingComment = (comment_id: string, reply_id?: string) => {
    const comment = comments.find((c) => c.id === comment_id);
    const target = reply_id ? comment?.replies.find((reply) => reply.id === reply_id) : comment;
    if (!target) return;
    setEditingTarget({ comment_id, reply_id });
    setEditDraft(target.body);
  };

  const onEditDraftChange = (value: string) => setEditDraft(value);

  const cancelEditingComment = () => {
    setEditingTarget(null);
    setEditDraft("");
  };

  const saveEditedComment = () => {
    if (!editing_target) return;
    const { comment_id, reply_id } = editing_target;
    const body = edit_draft.trim();
    if (isRichTextEmpty(body)) return;

    // Saving the text unchanged is not an edit: nothing is sent and no "(edited)" marker appears.
    const current_comment = comments.find((comment) => comment.id === comment_id);
    const current_body = reply_id ? current_comment?.replies.find((reply) => reply.id === reply_id)?.body : current_comment?.body;
    if (current_body?.trim() === body) {
      setEditingTarget(null);
      setEditDraft("");
      return;
    }

    const previous_comments = comments;
    applyBodyEdit(comment_id, reply_id, body);
    setEditingTarget(null);
    setEditDraft("");

    boardDiscussionService.updateComment(board_id, Number(reply_id ?? comment_id), body).catch(() => {
      setComments(previous_comments);
      setCommentsError("Couldn't update that update. Please try again.");
    });
  };

  const toggleSeen = (comment_id: string) => {
    setComments((current) =>
      current.map((comment) => (comment.id === comment_id ? { ...comment, seen: !comment.seen } : comment))
    );

    boardDiscussionService.toggleSeen(board_id, Number(comment_id)).catch(() => {
      setComments((current) =>
        current.map((comment) => (comment.id === comment_id ? { ...comment, seen: !comment.seen } : comment))
      );
      setCommentsError("Couldn't update seen state. Please try again.");
    });
  };

  const toggleMute = () => {
    const next_muted = !is_muted;
    setIsMuted(next_muted);
    const request = next_muted ? boardMuteService.muteBoard(board_id) : boardMuteService.unmuteBoard(board_id);
    request.catch(() => {
      setIsMuted(!next_muted);
      setCommentsError("Couldn't update mute state. Please try again.");
    });
  };

  const applyPinToggle = (comment_id: string) =>
    setComments((current) =>
      current.map((comment) => (comment.id === comment_id ? { ...comment, pinned: !comment.pinned } : comment))
    );

  const togglePin = (comment_id: string) => {
    applyPinToggle(comment_id);

    boardDiscussionService.togglePin(board_id, Number(comment_id)).catch(() => {
      applyPinToggle(comment_id);
      setCommentsError("Couldn't update pinned state. Please try again.");
    });
  };

  const mention_matches = useMemo(
    () =>
      mention_target
        ? buildMentionMatches(config.mentionable_people, mention_query, config.current_user.id, undefined, mention_teams)
        : [],
    [mention_target, mention_query, config.mentionable_people, config.current_user.id, mention_teams]
  );

  /**
   * Records an update or reply another person just posted in this discussion
   * (announced by the `board_comment_posted` presence broadcast). Nothing is
   * inserted into the thread on its own, so the list never jumps under the
   * viewer: the id only feeds the "N new updates" pill, which
   * {@link loadPendingUpdates} resolves on click. Ignores the viewer's own
   * posts (already added locally) and anything the thread already shows.
   */
  const onRemoteCommentPosted = (event: RemoteCommentEvent) => {
    if (!is_open) return;
    if (event.author_id !== null && String(event.author_id) === config.current_user.id) return;

    const comment_id = String(event.comment_id);
    const known_ids = comments.flatMap((comment) => [comment.id, ...comment.replies.map((reply) => reply.id)]);
    if (known_ids.includes(comment_id)) return;

    setPendingCommentIds((current) => (current.includes(comment_id) ? current : [...current, comment_id]));
  };

  const loadPendingUpdates = () => {
    if (pending_comment_ids.length === 0) return;
    const arrived_ids = pending_comment_ids;

    boardDiscussionService
      .listComments(board_id)
      .then((dtos) => {
        setComments(dtos.map(mapDiscussionCommentDtoToDrawerComment));
        setFreshCommentIds((current) => Array.from(new Set([...current, ...arrived_ids])));
        setPendingCommentIds((current) => current.filter((id) => !arrived_ids.includes(id)));
      })
      .catch(() => setCommentsError("Couldn't load the new updates. Please try again."));
  };

  /** The earlier versions of an edited update, or reply when `reply_id` is given. */
  const loadCommentRevisions = async (comment_id: string, reply_id?: string): Promise<DrawerCommentRevision[]> => {
    const dtos = await boardDiscussionService.listRevisions(board_id, Number(reply_id ?? comment_id));
    return dtos.map(mapRevisionDto);
  };

  const composer_attachments = useMemo(
    () => composer_attachment_drafts.map((draft) => draft.attachment),
    [composer_attachment_drafts]
  );

  const editing_key = editing_target
    ? editing_target.reply_id
      ? `${editing_target.comment_id}:${editing_target.reply_id}`
      : editing_target.comment_id
    : null;

  const comment_count = has_loaded_comments
    ? comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)
    : config.initial_comment_count ?? 0;
  const has_unseen_comments = has_loaded_comments ? false : config.initial_has_unseen_comments ?? false;

  return {
    ...config,
    is_open,
    open,
    close,

    comments,
    comments_loading,
    comments_error,
    comment_count,
    has_unseen_comments,
    pending_update_count: pending_comment_ids.length,
    loadPendingUpdates,
    onRemoteCommentPosted,
    fresh_comment_ids,
    loadCommentRevisions,
    is_muted,
    toggleMute,

    composer_text,
    composer_attachments,
    onComposerTextChange,
    postComment,
    addComposerAttachments,
    removeComposerAttachment,

    reply_text_by_comment,
    onReplyTextChange,
    postReply,

    mention_target,
    mention_matches,
    pickMention,

    notify_target,
    toggleNotifyPicker,
    closeNotifyPicker,
    notified_people_by_target,
    pickNotifyPerson,
    removeNotifyPerson,

    emoji_palette_target,
    toggleEmojiPalette,
    closeEmojiPalette,
    insertEmoji,

    reaction_palette_id,
    toggleReactionPalette,
    closeReactionPalette,
    toggleReaction,

    toggleLike,
    toggleSeen,
    togglePin,
    deleteComment,

    editing_key,
    edit_draft,
    onEditDraftChange,
    startEditingComment,
    cancelEditingComment,
    saveEditedComment,
  };
}

export default useBoardDiscussionDrawer;
