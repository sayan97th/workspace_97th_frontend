import type { DrawerComment, DrawerReply } from "./types";
import { formatRelativeTime, mapAttachmentDto, mapAuthorToPerson, mapSeenByDto } from "./commentMapping";
import type { BoardDiscussionCommentDto } from "@/types/board-discussion";

/**
 * Maps a {@link BoardDiscussionCommentDto} (board-wide discussion) into the
 * same `DrawerComment`/`DrawerReply` shapes the item drawer uses — reusing
 * `mapAuthorToPerson`/`mapAttachmentDto`/`formatRelativeTime` from
 * `commentMapping.ts` as-is, since the author/attachment DTO shapes are
 * structurally identical between the item and board comment endpoints.
 */
export const mapDiscussionCommentDtoToDrawerReply = (dto: BoardDiscussionCommentDto): DrawerReply => ({
  id: String(dto.id),
  author: mapAuthorToPerson(dto.author),
  posted_at: formatRelativeTime(dto.created_at),
  posted_at_iso: dto.created_at,
  body: dto.body,
  is_edited: dto.is_edited,
  edited_at: dto.edited_at ?? undefined,
  mentioned_user_ids: dto.mentioned_user_ids.map(String),
  view_count: dto.view_count,
  liked_by_me: dto.liked_by_me,
  like_count: dto.like_count,
  reactions: dto.reactions,
  bookmarked_by_me: dto.bookmarked_by_me,
});

export const mapDiscussionCommentDtoToDrawerComment = (dto: BoardDiscussionCommentDto): DrawerComment => ({
  ...mapDiscussionCommentDtoToDrawerReply(dto),
  seen: dto.seen_by_me,
  seen_by: dto.seen_by.map(mapSeenByDto),
  pinned: dto.pinned,
  notified_user_ids: dto.notified_user_ids.map(String),
  attachments: dto.attachments.map(mapAttachmentDto),
  replies: dto.replies.map(mapDiscussionCommentDtoToDrawerReply),
});
