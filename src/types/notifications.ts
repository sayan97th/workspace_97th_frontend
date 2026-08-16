import { formatDistanceToNowStrict } from "date-fns";
import { AVATAR_GRADIENTS } from "@/components/board/TeamAvatars";
import { BOARD_CONDITIONAL_COLOR_PALETTE } from "@/components/board/toolbar/types";
import type { NotificationCategory, WorkspaceNotification } from "@/data/notifications-data";

/**
 * Shape returned by `App\Http\Resources\NotificationResource` (workspace_97th_api),
 * both from `GET /api/notifications` and the `new_notification` websocket event.
 */
export type NotificationDto = {
  id: string;
  actor: { name: string; id: number | null };
  action_label: string;
  action_target: string;
  board: { id: number; name: string } | null;
  link: string | null;
  is_unread: boolean;
  category: NotificationCategory;
  created_at: string;
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
      name: dto.actor.name,
      avatar_gradient: AVATAR_GRADIENTS[actor_seed % AVATAR_GRADIENTS.length],
    },
    action_label: dto.action_label,
    action_target: dto.action_target,
    board: {
      name: dto.board?.name ?? "",
      color: BOARD_CONDITIONAL_COLOR_PALETTE[board_seed % BOARD_CONDITIONAL_COLOR_PALETTE.length],
    },
    time_label: formatDistanceToNowStrict(new Date(dto.created_at)),
    is_unread: dto.is_unread,
    category: dto.category,
    link: dto.link ?? undefined,
  };
}
