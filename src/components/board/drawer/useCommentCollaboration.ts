"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import { mapScheduledDto } from "./commentMapping";
import { buildQuoteMarkdown } from "./quoteComment";
import type {
  CommentCollaborationApi,
  CommentQuoteRequest,
  ComposerAssignment,
  DrawerComment,
  DrawerReply,
  DrawerScheduledComment,
} from "./types";

/** How long the "Link copied" hint and the deep link highlight stay on. */
const COPIED_HINT_MS = 1800;
const HIGHLIGHT_MS = 4000;

export const empty_assignment: ComposerAssignment = { user_ids: [], due_date: null };

/** The fields of a comment or update DTO the scheduled list reads, common to both drawers' endpoints. */
type ScheduledSource = { id: number; parent_id: number | null; body: string; scheduled_at: string | null };

/** What a drawer supplies so the shared behavior can talk to its own endpoints and thread state. */
type UseCommentCollaborationOptions = {
  /** False for the local mock boards, where nothing here reaches a server. */
  is_api_backed: boolean;
  /** Identifies the open thread (the open item, or the open discussion). Everything transient resets when it changes, null while closed. */
  scope_key: string | null;
  can_edit: boolean;
  supports_assignment: boolean;
  /** The open thread's top-level comments, used to resolve ids to text and to find a deep link's target. */
  comments: DrawerComment[];
  updateComments: (updater: (comments: DrawerComment[]) => DrawerComment[]) => void;
  /** Refetches the open thread, used once a scheduled comment is sent. */
  reloadThread: () => Promise<void>;
  /** In-app path of one comment, `/boards/1/pulses/2?comment=3`. The origin is added when it is copied. */
  buildCommentPath: (comment_id: string) => string;
  /** Query parameter a deep link carries the comment id in. */
  deep_link_param: string;
  api: {
    listScheduled: () => Promise<ScheduledSource[]>;
    updateSchedule: (comment_id: number, scheduled_at: string | null) => Promise<unknown>;
    cancelScheduled: (comment_id: number) => Promise<void>;
    toggleBookmark: (comment_id: number) => Promise<unknown>;
  };
  onError: (message: string) => void;
};

const findComment = (comments: DrawerComment[], comment_id: string, reply_id?: string): DrawerComment | DrawerReply | undefined => {
  const comment = comments.find((candidate) => candidate.id === comment_id);
  return reply_id ? comment?.replies.find((reply) => reply.id === reply_id) : comment;
};

/**
 * The behavior both comment drawers share on top of their plain threads:
 * bookmarking, copy link and quote reply, a deep link's highlight, and the
 * composer's schedule and assign state together with the list of comments still
 * waiting to be sent. Each drawer hands in its own endpoints and thread state,
 * so the two stay in step without duplicating any of this.
 */
export function useCommentCollaboration(options: UseCommentCollaborationOptions) {
  const { is_api_backed, scope_key, can_edit, supports_assignment, comments, updateComments, reloadThread, buildCommentPath, deep_link_param, api, onError } = options;

  const [scheduled_comments, setScheduledComments] = useState<DrawerScheduledComment[]>([]);
  const [composer_schedule_at, setComposerScheduleAt] = useState<string | null>(null);
  const [composer_assignment, setComposerAssignment] = useState<ComposerAssignment>(empty_assignment);
  const [quote_requests, setQuoteRequests] = useState<Record<string, CommentQuoteRequest>>({});
  const [copied_link_id, setCopiedLinkId] = useState<string | null>(null);
  const [highlighted_comment_id, setHighlightedCommentId] = useState<string | null>(null);
  // The comment a deep link asked for, waiting for the thread to load so it can be found.
  const [pending_highlight_id, setPendingHighlightId] = useState<string | null>(null);

  // Latest callbacks and endpoints are read through a ref, so the effects below re-run on a thread change only.
  const latest_ref = useRef({ api, onError });
  useEffect(() => {
    latest_ref.current = { api, onError };
  });

  // A new thread starts clean: its own scheduled list, no draft schedule or assignment, no stale quote.
  useEffect(() => {
    setScheduledComments([]);
    setComposerScheduleAt(null);
    setComposerAssignment(empty_assignment);
    setQuoteRequests({});
    setCopiedLinkId(null);
    setHighlightedCommentId(null);
    setPendingHighlightId(null);
    if (scope_key === null || typeof window === "undefined") return;

    const requested_id = new URLSearchParams(window.location.search).get(deep_link_param);
    if (requested_id) setPendingHighlightId(requested_id);

    if (!is_api_backed) return;
    let is_current = true;
    latest_ref.current.api
      .listScheduled()
      .then((dtos) => {
        if (is_current) setScheduledComments(dtos.map(mapScheduledDto));
      })
      .catch(() => {
        // Without the list the scheduled strip simply stays hidden.
      });
    return () => {
      is_current = false;
    };
  }, [scope_key, is_api_backed, deep_link_param]);

  // Once the thread has loaded, a deep link's target is highlighted for a few seconds.
  useEffect(() => {
    if (!pending_highlight_id) return;
    const is_known = comments.some((comment) => comment.id === pending_highlight_id || comment.replies.some((reply) => reply.id === pending_highlight_id));
    if (!is_known) return;

    setHighlightedCommentId(pending_highlight_id);
    setPendingHighlightId(null);
    const timeout_id = setTimeout(() => setHighlightedCommentId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timeout_id);
  }, [pending_highlight_id, comments]);

  const toggleBookmark = useCallback(
    (comment_id: string, reply_id?: string) => {
      const applyToggle = () =>
        updateComments((current) =>
          current.map((comment) => {
            if (comment.id !== comment_id) return comment;
            if (!reply_id) return { ...comment, bookmarked_by_me: !comment.bookmarked_by_me };
            return {
              ...comment,
              replies: comment.replies.map((reply) => (reply.id === reply_id ? { ...reply, bookmarked_by_me: !reply.bookmarked_by_me } : reply)),
            };
          })
        );

      applyToggle();
      if (!is_api_backed) return;
      api.toggleBookmark(Number(reply_id ?? comment_id)).catch(() => {
        applyToggle();
        onError("Couldn't update that bookmark. Please try again.");
      });
    },
    [updateComments, is_api_backed, api, onError]
  );

  const copyCommentLink = useCallback(
    async (comment_id: string, reply_id?: string) => {
      const target_id = reply_id ?? comment_id;
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${buildCommentPath(target_id)}`);
        setCopiedLinkId(target_id);
        setTimeout(() => setCopiedLinkId((current) => (current === target_id ? null : current)), COPIED_HINT_MS);
      } catch {
        onError("Couldn't copy the link. Please try again.");
      }
    },
    [buildCommentPath, onError]
  );

  const quoteComment = useCallback(
    (comment_id: string, reply_id?: string) => {
      const target = findComment(comments, comment_id, reply_id);
      if (!target) return;

      const markdown = buildQuoteMarkdown(target.author.name, target.body);
      setQuoteRequests((current) => ({ ...current, [comment_id]: { key: (current[comment_id]?.key ?? 0) + 1, markdown } }));
    },
    [comments]
  );

  const rescheduleComment = useCallback(
    async (comment_id: string, scheduled_at: string) => {
      try {
        await api.updateSchedule(Number(comment_id), scheduled_at);
        setScheduledComments((current) =>
          current.map((entry) => (entry.id === comment_id ? { ...entry, scheduled_at } : entry)).sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
        );
      } catch (error) {
        onError(getApiErrorMessage(error, "Couldn't reschedule that comment. Please try again."));
      }
    },
    [api, onError]
  );

  const sendScheduledNow = useCallback(
    async (comment_id: string) => {
      try {
        await api.updateSchedule(Number(comment_id), null);
        setScheduledComments((current) => current.filter((entry) => entry.id !== comment_id));
        await reloadThread();
      } catch (error) {
        onError(getApiErrorMessage(error, "Couldn't send that comment. Please try again."));
      }
    },
    [api, reloadThread, onError]
  );

  const cancelScheduledComment = useCallback(
    async (comment_id: string) => {
      try {
        await api.cancelScheduled(Number(comment_id));
        setScheduledComments((current) => current.filter((entry) => entry.id !== comment_id));
      } catch {
        onError("Couldn't cancel that comment. Please try again.");
      }
    },
    [api, onError]
  );

  /** Adds a comment the server accepted as scheduled to the list, keeping it in send order. */
  const addScheduledComment = useCallback((dto: ScheduledSource) => {
    setScheduledComments((current) => [...current, mapScheduledDto(dto)].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
  }, []);

  /** Clears the composer's schedule and assignment once its update went out. */
  const resetComposerExtras = useCallback(() => {
    setComposerScheduleAt(null);
    setComposerAssignment(empty_assignment);
  }, []);

  const collaboration: CommentCollaborationApi = {
    can_edit,
    toggleBookmark,
    copyCommentLink,
    copied_link_id,
    quoteComment,
    quote_requests,
    highlighted_comment_id,
    scheduled_comments,
    composer_schedule_at,
    setComposerScheduleAt,
    rescheduleComment,
    sendScheduledNow,
    cancelScheduledComment,
    supports_assignment,
    composer_assignment,
    setComposerAssignment,
  };

  return { collaboration, addScheduledComment, resetComposerExtras };
}
