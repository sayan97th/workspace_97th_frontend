import type { BoardPersonOption } from "../toolbar/types";
import { classifyAttachment } from "./drawerAttachments";
import type { DrawerAttachment, DrawerComment, DrawerCommentRevision, DrawerReply, DrawerScheduledComment, DrawerSeenBy } from "./types";
import type { BoardItemAttachmentDto } from "@/types/board-attachments";
import type {
  BoardItemCommentAttachmentDto,
  BoardItemCommentAuthorDto,
  BoardItemCommentDto,
  BoardItemCommentSeenByDto,
  CommentRevisionDto,
} from "@/types/board-comments";

const getInitials = (full_name: string): string =>
  full_name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Formats an ISO timestamp the same way Monday-style threads do: "5m", "3h", "2d", then a short date. */
export const formatRelativeTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const diff_minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff_minutes < 1) return "Just now";
  if (diff_minutes < 60) return `${diff_minutes}m`;

  const diff_hours = Math.floor(diff_minutes / 60);
  if (diff_hours < 24) return `${diff_hours}h`;

  const diff_days = Math.floor(diff_hours / 24);
  if (diff_days < 30) return `${diff_days}d`;

  const same_year = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-US", same_year ? { month: "short", day: "numeric" } : { month: "short", year: "numeric" });
};

export const mapAuthorToPerson = (author: BoardItemCommentAuthorDto): BoardPersonOption =>
  author
    ? {
        id: String(author.id),
        name: author.full_name,
        initials: getInitials(author.full_name),
        avatar_seed: author.id,
        avatar_url: author.profile_photo_url ?? undefined,
      }
    : { id: "0", name: "Deleted user", initials: "?", avatar_seed: 0 };

export const mapAttachmentDto = (dto: BoardItemCommentAttachmentDto): DrawerAttachment => ({
  id: String(dto.id),
  file_name: dto.file_name,
  download_url: dto.download_url,
  ...classifyAttachment(dto.file_name),
});

/** Maps a file attached directly to the item (not to a comment) — see `board-item-attachments.service.ts`. Ids are prefixed so they can't collide with a comment attachment's id once both lists are merged into `all_attachments`. */
export const mapItemAttachmentDto = (dto: BoardItemAttachmentDto): DrawerAttachment => ({
  id: `item-${dto.id}`,
  file_name: dto.file_name,
  download_url: dto.download_url,
  can_delete: true,
  ...classifyAttachment(dto.file_name),
});

export const mapCommentDtoToDrawerReply = (dto: BoardItemCommentDto): DrawerReply => ({
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

/** The comment or update DTO fields a scheduled entry needs, shared by the item and board discussion endpoints. */
type ScheduledCommentSource = { id: number; parent_id: number | null; body: string; scheduled_at: string | null };

export const mapScheduledDto = (dto: ScheduledCommentSource): DrawerScheduledComment => ({
  id: String(dto.id),
  parent_id: dto.parent_id !== null ? String(dto.parent_id) : null,
  body: dto.body,
  scheduled_at: dto.scheduled_at ?? "",
});

export const mapSeenByDto = (person: BoardItemCommentSeenByDto): DrawerSeenBy => ({
  ...mapAuthorToPerson(person),
  seen_at: person.seen_at ?? undefined,
});

export const mapCommentDtoToDrawerComment = (dto: BoardItemCommentDto): DrawerComment => ({
  ...mapCommentDtoToDrawerReply(dto),
  seen: dto.seen_by_me,
  seen_by: dto.seen_by.map(mapSeenByDto),
  pinned: dto.pinned,
  notified_user_ids: dto.notified_user_ids.map(String),
  attachments: dto.attachments.map(mapAttachmentDto),
  replies: dto.replies.map(mapCommentDtoToDrawerReply),
});

export const mapRevisionDto = (dto: CommentRevisionDto): DrawerCommentRevision => ({
  id: String(dto.id),
  body: dto.body,
  written_at: dto.written_at ?? undefined,
  replaced_at: dto.replaced_at,
  editor: dto.edited_by ? mapAuthorToPerson(dto.edited_by) : undefined,
});
