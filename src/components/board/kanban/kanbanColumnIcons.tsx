import React from "react";
import {
  AlignLeft,
  Calendar,
  CalendarRange,
  ChevronDown,
  CircleUserRound,
  Copy,
  GitBranch,
  Hash,
  Layers,
  Link2,
  ListChecks,
  Mail,
  Menu,
  MousePointerClick,
  Network,
  Paperclip,
  Percent,
  Phone,
  Sigma,
  SquareCheck,
  Star,
  Tag,
  Tags,
  ThumbsUp,
  Timer,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { BoardColumnKind } from "../columnTypes";

/** Line icon per column kind, the same quiet gray glyphs monday.com shows beside each field of its item card. */
const COLUMN_KIND_ICON: Record<BoardColumnKind, LucideIcon> = {
  text: Type,
  long_text: AlignLeft,
  status: Menu,
  label: Tag,
  people: CircleUserRound,
  date: Calendar,
  timeline: CalendarRange,
  tags: Tags,
  dropdown: ChevronDown,
  number: Hash,
  checkbox: SquareCheck,
  dependency: GitBranch,
  progress: Percent,
  phone: Phone,
  email: Mail,
  rating: Star,
  vote: ThumbsUp,
  link: Link2,
  files: Paperclip,
  time_tracking: Timer,
  auto_number: Hash,
  formula: Sigma,
  connect_board: Network,
  mirror: Copy,
  checklist: ListChecks,
  button: MousePointerClick,
};

/** Icon for an item's own fields that are not columns (the group it sits in). */
export const GroupFieldIcon = Layers;

export function KanbanColumnIcon({ kind, size = 16 }: { kind: BoardColumnKind | string; size?: number }) {
  const Icon = COLUMN_KIND_ICON[kind as BoardColumnKind] ?? Type;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
