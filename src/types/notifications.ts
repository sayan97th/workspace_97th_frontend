import { formatDistanceToNowStrict } from "date-fns";
import { AVATAR_GRADIENTS } from "@/components/board/TeamAvatars";
import { BOARD_CONDITIONAL_COLOR_PALETTE } from "@/components/board/toolbar/types";
import { getUserInitials } from "@/lib/user";
import type { NotificationCategory, WorkspaceNotification } from "@/data/notifications-data";

/**
 * Shape returned by `App\Http\Resources\NotificationResource` (workspace_97th_api),
 * both from `GET /api/notifications` and the `new_notification` websocket event.
 */
export type NotificationDto = {
  id: string;
  type: string;
  actor: { name: string; id: number | null; avatar_url?: string | null };
  action_label: string;
  action_target: string;
  board: { id: number; name: string } | null;
  link: string | null;
  is_unread: boolean;
  is_saved: boolean;
  category: NotificationCategory;
  created_at: string;
  group_key: string;
  /** Only on the websocket payload: true while the recipient's quiet hours are active, so no toast or desktop push should fire. */
  is_silenced?: boolean;
  /** Only on the websocket payload: true when the recipient turned off the desktop push for this notification type. */
  is_push_muted?: boolean;
};

/** `GET /api/notifications`: one cursor-paginated page. */
export type NotificationsPageDto = {
  data: NotificationDto[];
  meta: { next_cursor: string | null; has_more: boolean };
};

/** `GET /api/notifications/filters`. */
export type NotificationFiltersDto = {
  boards: { id: number; name: string }[];
  actors: { id: number; name: string }[];
};

/**
 * Maps an API notification into the presentational `WorkspaceNotification`
 * shape `NotificationItem`/`NotificationsPanel` already render. The backend
 * intentionally sends only raw data, so purely presentational values (a
 * relative time label, an avatar color, a board chip color) are derived here.
 */
export function mapNotificationDto(dto: NotificationDto): WorkspaceNotification {
  const actor_seed = dto.actor.id ?? 0;
  const board_seed = dto.board?.id ?? 0;

  return {
    id: dto.id,
    actor: {
      id: dto.actor.id !== null ? String(dto.actor.id) : undefined,
      name: dto.actor.name,
      initials: getUserInitials({ full_name: dto.actor.name }),
      avatar_gradient: AVATAR_GRADIENTS[actor_seed % AVATAR_GRADIENTS.length],
      avatar_url: dto.actor.avatar_url ?? undefined,
    },
    action_label: dto.action_label,
    action_target: dto.action_target,
    board: {
      id: dto.board ? String(dto.board.id) : undefined,
      name: dto.board?.name ?? "",
      color: BOARD_CONDITIONAL_COLOR_PALETTE[board_seed % BOARD_CONDITIONAL_COLOR_PALETTE.length],
    },
    time_label: formatDistanceToNowStrict(new Date(dto.created_at)),
    is_unread: dto.is_unread,
    is_saved: dto.is_saved ?? false,
    category: dto.category,
    link: dto.link ?? undefined,
    created_at: dto.created_at,
    group_key: dto.group_key,
  };
}
