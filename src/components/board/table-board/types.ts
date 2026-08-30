export interface Person {
  id: string;
  initials: string;
  name: string;
  avatar_bg: string;
}

export type BoardStatus = string;

export type BoardPriority = "" | "Low" | "Medium" | "High" | "Critical";

export interface BoardSubitem {
  id: string;
  name: string;
  owner_ids: string[];
  status: BoardStatus;
  date: string;
}

export interface BoardItem {
  id: string;
  name: string;
  owner_ids: string[];
  status: BoardStatus;
  date: string;
  priority: BoardPriority;
  subitems: BoardSubitem[];
}

export interface BoardSimpleItem {
  id: string;
  name: string;
  owner_id: string;
  status: BoardStatus;
  date: string;
  priority: BoardPriority;
  progress: number;
}

export type DragParentId = "ROOT" | string;

export type ActiveBoardTab = "main-table" | "timeline";
