"use client";
import React from "react";
import BoardHeader, { type BoardHeaderProps } from "./BoardHeader";
import BoardViewTabs, { type BoardViewTabsProps } from "./BoardViewTabs";

export type BoardShellProps = {
  header: BoardHeaderProps;
  tabs: BoardViewTabsProps;
  /** Typically a <BoardToolbar toolbar={...} />; kept as a node so BoardShell itself stays non-generic. */
  toolbar?: React.ReactNode;
  /**
   * Typically a <SelectionActionBar .../>, shown while one or more rows are
   * checked. Floats bottom-center over the body, outside its scroll
   * container, so it stays put while the table scrolls underneath it.
   */
  selectionBar?: React.ReactNode;
  /** The board table (or any scrollable board body). */
  children: React.ReactNode;
};

/**
 * Full board layout shell: dark surface, fixed header/tabs/toolbar and a single
 * scrollable body region. Reused by every board view (Client Hub and beyond).
 */
const BoardShell: React.FC<BoardShellProps> = ({ header, tabs, toolbar, selectionBar, children }) => (
  <div className="relative flex h-full min-w-0 flex-col overflow-hidden bg-shell-bg text-shell-text">
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

    {selectionBar && (
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-40 flex justify-center px-6">
        <div className="pointer-events-auto">{selectionBar}</div>
      </div>
    )}
  </div>
);

export default BoardShell;
