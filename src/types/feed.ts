import { formatDistanceToNowStrict } from "date-fns";
import { AVATAR_GRADIENTS } from "@/components/board/TeamAvatars";
import { BOARD_CONDITIONAL_COLOR_PALETTE } from "@/components/board/toolbar/types";
import type { FeedUpdate } from "@/data/update-feed-data";

/**
 * Shape returned by `App\Http\Resources\FeedUpdateResource` (workspace_97th_api),
 * both from `GET /api/feed/updates` and the `new_feed_update` websocket event.
 */
export type FeedUpdateDto = {
  id: string;
  actor: { id: number | null; name: string };
  body: string;
  created_at: string;
  board: { id: number; name: string; parent_name: string | null };
  item: { id: number; name: string } | null;
  link: string;
  view_count: number;
  is_unread: boolean;
  is_mentioned: boolean;
  is_bookmarked: boolean;
  mentioned_user_ids: number[];
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
  categories.push("account");

  return {
    id: dto.id,
    actor: {
      name: dto.actor.name,
      avatar_gradient: AVATAR_GRADIENTS[actor_seed % AVATAR_GRADIENTS.length],
    },
    date_label: formatDistanceToNowStrict(new Date(dto.created_at), { addSuffix: true }),
    breadcrumb: {
      board_color: BOARD_CONDITIONAL_COLOR_PALETTE[board_seed % BOARD_CONDITIONAL_COLOR_PALETTE.length],
      crumbs: [dto.board.parent_name, dto.board.name, dto.item?.name].filter((crumb): crumb is string => Boolean(crumb)),
    },
    body: dto.body,
    view_count: dto.view_count > 0 ? dto.view_count : undefined,
    is_unread: dto.is_unread,
    is_bookmarked: dto.is_bookmarked,
    categories,
    link: dto.link,
    show_actions: true,
    show_composer: true,
  };
}
