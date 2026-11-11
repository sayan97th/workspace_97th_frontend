import type { BoardPersonOption } from "../toolbar/types";
import type { DrawerComment, DrawerReply } from "./types";

type LikeState = Pick<DrawerReply, "liked_by_me" | "like_count" | "likers">;

/**
 * Flips the current user's like on a comment or reply, keeping the count and
 * the "who liked" list in step so the Like popover updates instantly. Calling
 * it a second time reverts it.
 */
export const flipLike = <T extends LikeState>(entry: T, current_user: BoardPersonOption): T => {
  const liked_by_me = !entry.liked_by_me;
  const others = (entry.likers ?? []).filter((person) => person.id !== current_user.id);
  return {
    ...entry,
    liked_by_me,
    like_count: Math.max(0, entry.like_count + (liked_by_me ? 1 : -1)),
    likers: liked_by_me ? [...others, { ...current_user, liked_at: new Date().toISOString() }] : others,
  };
};

/** Applies `transform` to the comment, or to one of its replies when `reply_id` is given. */
export const updateLikeTarget = (
  comments: DrawerComment[],
  comment_id: string,
  reply_id: string | undefined,
  transform: <T extends LikeState>(entry: T) => T
): DrawerComment[] =>
  comments.map((comment) => {
    if (comment.id !== comment_id) return comment;
    if (!reply_id) return transform(comment);
    return { ...comment, replies: comment.replies.map((reply) => (reply.id === reply_id ? transform(reply) : reply)) };
  });

/** Replaces the local like state with the server's, so count and list match what was actually saved. */
export const withServerLikes =
  (server: LikeState) =>
  <T extends LikeState>(entry: T): T => ({ ...entry, liked_by_me: server.liked_by_me, like_count: server.like_count, likers: server.likers ?? entry.likers });
