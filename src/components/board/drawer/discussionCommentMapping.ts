import type { DrawerComment, DrawerReply } from "./types";
import { formatRelativeTime, mapAttachmentDto, mapAuthorToPerson } from "./commentMapping";
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
  body: dto.body,
  is_edited: dto.is_edited,
  view_count: dto.view_count,
  liked_by_me: dto.liked_by_me,
  like_count: dto.like_count,
  reactions: dto.reactions,
});

export const mapDiscussionCommentDtoToDrawerComment = (dto: BoardDiscussionCommentDto): DrawerComment => ({
  ...mapDiscussionCommentDtoToDrawerReply(dto),
  seen: dto.seen_by_me,
  attachments: dto.attachments.map(mapAttachmentDto),
  replies: dto.replies.map(mapDiscussionCommentDtoToDrawerReply),
});
