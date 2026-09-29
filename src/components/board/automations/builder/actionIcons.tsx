import React from "react";
import {
  Archive,
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Calculator,
  CalendarDays,
  CircleDot,
  Copy,
  Eraser,
  FilePlus,
  Hash,
  ListPlus,
  Mail,
  MessageCircle,
  MessageSquare,
  PenLine,
  Trash2,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { ActionPickerId } from "./automationCatalog";

/** The colored square in front of each entry of the "Then do this" menu, like monday's action list. */
const ACTION_ICONS: Record<ActionPickerId, { icon: LucideIcon; color: string }> = {
  move_to_group: { icon: ArrowRight, color: "#a25ddc" },
  notify_person: { icon: Bell, color: "#037f4c" },
  change_status: { icon: CircleDot, color: "#0073ea" },
  create_subitem: { icon: ListPlus, color: "#fdab3d" },
  set_date: { icon: CalendarDays, color: "#00c875" },
  create_item: { icon: FilePlus, color: "#579bfc" },
  duplicate_item: { icon: Copy, color: "#579bfc" },
  archive_item: { icon: Archive, color: "#676879" },
  delete_item: { icon: Trash2, color: "#e2445c" },
  post_update: { icon: MessageSquare, color: "#ff7575" },
  set_column_value: { icon: PenLine, color: "#0086c0" },
  clear_column: { icon: Eraser, color: "#9d99b9" },
  adjust_number: { icon: Calculator, color: "#784bd1" },
  assign_person: { icon: UserPlus, color: "#66ccff" },
  unassign_people: { icon: UserMinus, color: "#c4c4c4" },
  send_email: { icon: Mail, color: "#bb3354" },
  slack_notify_person: { icon: MessageCircle, color: "#4a154b" },
  slack_notify_channel: { icon: Hash, color: "#4a154b" },
  move_to_board: { icon: ArrowRightLeft, color: "#225091" },
};

export function ActionIcon({ id, size = 20 }: { id: ActionPickerId; size?: number }) {
  const { icon: Icon, color } = ACTION_ICONS[id];
  return (
    <span className="flex flex-none items-center justify-center rounded-[4px] text-white" style={{ background: color, width: size, height: size }} aria-hidden="true">
      <Icon size={Math.round(size * 0.62)} strokeWidth={2.2} />
    </span>
  );
}
