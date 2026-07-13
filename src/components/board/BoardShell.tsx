"use client";
import React from "react";
import BoardHeader, { type BoardHeaderProps } from "./BoardHeader";
import BoardViewTabs, { type BoardViewTabsProps } from "./BoardViewTabs";

export type BoardShellProps = {
  header: BoardHeaderProps;
  tabs: BoardViewTabsProps;
  /** Typically a <BoardToolbar toolbar={...} />; kept as a node so BoardShell itself stays non-generic. */
  toolbar?: React.ReactNode;
  /** The board table (or any scrollable board body). */
  children: React.ReactNode;
};

/**
 * Full board layout shell: dark surface, fixed header/tabs/toolbar and a single
 * scrollable body region. Reused by every board view (Client Hub and beyond).
 */
const BoardShell: React.FC<BoardShellProps> = ({ header, tabs, toolbar, children }) => (
  <div className="flex h-full min-w-0 flex-col overflow-hidden bg-[#0e1d1d] text-[#e9eded]">
    <div className="flex-none px-6 pt-4">
      <BoardHeader {...header} />
      <div className="mt-3.5">
        <BoardViewTabs {...tabs} />
      </div>
    </div>

    <div className="flex-none px-6 py-3">
      {toolbar}
    </div>

    <div className="shell-scrollbar min-h-0 flex-1 overflow-auto px-6 pb-20 pt-0.5">
      {children}
    </div>
  </div>
);

export default BoardShell;
