import type { BoardPersonOption } from "../toolbar/types";
import { classifyAttachment } from "./drawerAttachments";
import type { DrawerAttachment, DrawerComment, DrawerReply } from "./types";
import type { BoardItemAttachmentDto } from "@/types/board-attachments";
import type {
  BoardItemCommentAttachmentDto,
  BoardItemCommentAuthorDto,
  BoardItemCommentDto,
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
  ...classifyAttachment(dto.file_name),
});

export const mapCommentDtoToDrawerReply = (dto: BoardItemCommentDto): DrawerReply => ({
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

export const mapCommentDtoToDrawerComment = (dto: BoardItemCommentDto): DrawerComment => ({
  ...mapCommentDtoToDrawerReply(dto),
  seen: dto.seen_by_me,
  attachments: dto.attachments.map(mapAttachmentDto),
  replies: dto.replies.map(mapCommentDtoToDrawerReply),
});
