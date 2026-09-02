import type { ReactNode } from "react";
import "./task-board.css";
import { taskBoardFontClassName } from "./task-board-font";

export default function TaskBoardLayout({ children }: { children: ReactNode }) {
  return <div className={`task-board-root ${taskBoardFontClassName}`}>{children}</div>;
}
