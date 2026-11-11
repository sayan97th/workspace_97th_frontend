import { formatDistanceToNowStrict } from "date-fns";
import { BOARD_CONDITIONAL_COLOR_PALETTE } from "@/components/board/toolbar/types";
import { getUserInitials } from "@/lib/user";
import type { FeedUpdate } from "@/data/update-feed-data";
import { mapLikerDto, mapReactionDto } from "@/components/board/drawer/commentMapping";
import type { BoardItemCommentReactionDto, CommentLikerDto } from "@/types/board-comments";

/**
 * Shape returned by `App\Http\Resources\FeedUpdateResource` (workspace_97th_api),
 * both from `GET /api/feed/updates` and the `new_feed_update` websocket event.
 */
export type FeedUpdateDto = {
  id: string;
  /** The card this update shows in: its own id for a top-level update, its parent's for a reply. */
  thread_id?: string;
  /** monday's `creator`: a person, or "Automations" (`is_system`) for what an automation posted. */
  actor: { id: number | null; name: string; avatar_url: string | null; is_deactivated?: boolean; is_system?: boolean };
  /** `user`, or `automations` when an automation posted the update. */
  sender_type?: "user" | "automations";
  automation_id?: number | null;
  body: string;
  /** monday's `text_body`, the plain text twin of `body`. */
  text_body?: string | null;
  created_at: string;
  edited_at?: string | null;
  board: { id: number; name: string; parent_name: string | null };
  item: { id: number; name: string } | null;
  /** The group the item sits in, the middle crumb of monday's board > group > item trail. */
  group?: { id: number; name: string } | null;
  link: string;
  view_count: number;
  /** A reply to another update rather than a top-level one. */
  is_reply: boolean;
  is_unread: boolean;
  is_mentioned: boolean;
  is_bookmarked: boolean;
  mentioned_user_ids: number[];
  mentions: { id: number; name: string; avatar_url: string | null; is_deactivated?: boolean }[];
  pinned: boolean;
  is_following_item: boolean;
  is_following_board: boolean;
  activity: FeedActivityEntryDto[];
  activity_total: number;
  like_count: number;
  liked_by_me: boolean;
  /** Who liked and when, oldest first, the same shape the item drawer reads. */
  likers: CommentLikerDto[];
  /** Emoji reactions grouped by emoji, with who reacted and when. */
  reactions: BoardItemCommentReactionDto[];
  /** The thread's replies, oldest first, on a top-level update. Empty on a reply. */
  replies?: FeedUpdateDto[];
  /** Only on a live `new_feed_update` for a reply: the card of its whole thread, so the reply lands inline under its update. */
  thread?: FeedUpdateDto;
};

/** One item change under an update, as `FeedUpdateResource::activityPayload()` sends it. */
export type FeedActivityEntryDto = {
  id: number;
  actor: { id: number; name: string; avatar_url: string | null; is_deactivated?: boolean } | null;
  column_label: string;
  column_type: string;
  old_display: string | null;
  new_display: string | null;
  created_at: string;
};

/** `GET /api/feed/follows`: what the viewer follows. */
export type FeedFollowsDto = {
  boards: { id: number; name: string }[];
  items: { id: number; name: string; board_id: number; board_name: string | null }[];
};

/** `GET /api/feed/updates`: one cursor-paginated page. */
export type FeedUpdatesPageDto = {
  data: FeedUpdateDto[];
  meta: { next_cursor: string | null; has_more: boolean };
};

/** One workspace member the feed's reply composer can `@mention`. */
export type FeedPersonDto = {
  id: number;
  name: string;
  avatar_url: string | null;
};

/**
 * Maps an API feed update into the presentational `FeedUpdate` shape
 * `UpdateFeedCard`/`UpdateFeedPanel` render. The backend intentionally sends
 * only raw data, so purely presentational values (a relative date label, an
 * avatar color, a board chip color) are derived here, mirroring
 * `mapNotificationDto` in `src/types/notifications.ts`.
 */
export function mapFeedUpdateDto(dto: FeedUpdateDto): FeedUpdate {
  const actor_seed = dto.actor.id ?? 0;
  const board_seed = dto.board.id;

  const categories: FeedUpdate["categories"] = [];
  if (dto.is_mentioned) categories.push("mentioned");
  if (dto.is_bookmarked) categories.push("bookmarked");
  if (dto.is_following_item || dto.is_following_board) categories.push("following");
  if (dto.pinned) categories.push("pinned");
  categories.push("account");

  return {
    id: dto.id,
    thread_id: dto.thread_id ?? dto.id,
    actor: {
      id: dto.actor.id !== null ? String(dto.actor.id) : undefined,
      name: dto.actor.name,
      initials: getUserInitials({ full_name: dto.actor.name }),
      avatar_seed: actor_seed,
      avatar_url: dto.actor.avatar_url ?? undefined,
      is_deactivated: dto.actor.is_deactivated ?? false,
      is_system: dto.actor.is_system ?? false,
    },
    date_label: formatDistanceToNowStrict(new Date(dto.created_at), { addSuffix: true }),
    created_at: dto.created_at,
    edited_at: dto.edited_at ?? undefined,
    breadcrumb: {
      board_color: BOARD_CONDITIONAL_COLOR_PALETTE[board_seed % BOARD_CONDITIONAL_COLOR_PALETTE.length],
      // monday's trail: board > group > item (a board discussion update shows just the board).
      crumbs: [dto.board.name, dto.group?.name, dto.item?.name].filter((crumb): crumb is string => Boolean(crumb)),
    },
    body: dto.body,
    mentions: dto.mentions.map((mention) => ({
      id: String(mention.id),
      name: mention.name,
      avatar_url: mention.avatar_url ?? undefined,
      is_deactivated: mention.is_deactivated ?? false,
    })),
    board_id: String(dto.board.id),
    view_count: dto.view_count > 0 ? dto.view_count : undefined,
    is_unread: dto.is_unread,
    is_reply: dto.is_reply,
    is_bookmarked: dto.is_bookmarked,
    pinned: dto.pinned,
    item_id: dto.item ? String(dto.item.id) : undefined,
    is_following_item: dto.is_following_item,
    is_following_board: dto.is_following_board,
    activity: dto.activity.map((entry) => ({
      id: String(entry.id),
      actor: entry.actor
        ? {
            id: String(entry.actor.id),
            name: entry.actor.name,
            avatar_url: entry.actor.avatar_url ?? undefined,
            is_deactivated: entry.actor.is_deactivated ?? false,
          }
        : null,
      column_label: entry.column_label,
      column_type: entry.column_type,
      old_display: entry.old_display,
      new_display: entry.new_display,
      time_label: formatDistanceToNowStrict(new Date(entry.created_at), { addSuffix: true }),
    })),
    activity_total: dto.activity_total,
    ...mapFeedReactionsDto(dto),
    categories,
    link: dto.link,
    show_actions: true,
    show_composer: true,
    replies: (dto.replies ?? []).map(mapFeedUpdateDto),
  };
}

/**
 * The like and reaction part of a feed card, on its own so a Like or React
 * response can refresh just these fields without touching the rest of the
 * card. Older payloads without these fields read as "nobody reacted yet".
 */
export function mapFeedReactionsDto(dto: FeedUpdateDto): Pick<FeedUpdate, "like_count" | "liked_by_me" | "likers" | "reactions"> {
  return {
    like_count: dto.like_count ?? 0,
    liked_by_me: dto.liked_by_me ?? false,
    likers: (dto.likers ?? []).map(mapLikerDto),
    reactions: (dto.reactions ?? []).map(mapReactionDto),
  };
}
