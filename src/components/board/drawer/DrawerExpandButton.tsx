"use client";
import React from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import "./board-drawer.css";

export type DrawerExpandButtonProps = {
  is_expanded: boolean;
  onToggle: () => void;
};

/** Header button that toggles a drawer's full screen mode, hidden on phones where the drawer already fills the screen. */
const DrawerExpandButton: React.FC<DrawerExpandButtonProps> = ({ is_expanded, onToggle }) => {
  const label = is_expanded ? "Exit full screen" : "Full screen";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="board-drawer__icon-button board-drawer__expand-button"
    >
      {is_expanded ? <Minimize2 size={16} strokeWidth={1.75} /> : <Maximize2 size={16} strokeWidth={1.75} />}
    </button>
  );
};

export default DrawerExpandButton;
