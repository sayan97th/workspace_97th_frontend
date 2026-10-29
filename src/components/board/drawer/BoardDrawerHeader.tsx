"use client";
import React from "react";
import { CloseIcon } from "@/icons/board-icons";
import "./board-drawer.css";

export type BoardDrawerHeaderProps = {
  title: React.ReactNode;
  /** Small line under the title, for example the board and group the item sits in. */
  eyebrow?: React.ReactNode;
  /** Buttons shown on the right, before the close button when it sits at the end. */
  actions?: React.ReactNode;
  onClose: () => void;
  close_label: string;
  /** monday's item drawer puts the close button before the title, the smaller drawers put it at the end. */
  close_position?: "start" | "end";
  /** `page` is the large item title, `dialog` the smaller drawer title. */
  title_size?: "page" | "dialog";
  /** Draws a divider under the header, for drawers without a tab bar. */
  is_bordered?: boolean;
  title_id?: string;
};

/** Header shared by every board drawer: close button, bold title, optional eyebrow line and actions. */
const BoardDrawerHeader: React.FC<BoardDrawerHeaderProps> = ({
  title,
  eyebrow,
  actions,
  onClose,
  close_label,
  close_position = "end",
  title_size = "dialog",
  is_bordered = false,
  title_id,
}) => {
  const close_button = (
    <button type="button" onClick={onClose} aria-label={close_label} title={close_label} className="board-drawer__icon-button">
      <CloseIcon size={18} />
    </button>
  );

  return (
    <div className="board-drawer__header" data-bordered={is_bordered || undefined}>
      {close_position === "start" && <div className="board-drawer__actions">{close_button}</div>}
      <div className="board-drawer__heading">
        <h2 id={title_id} className={`board-drawer__title font-heading ${title_size === "page" ? "text-page-title" : "text-dialog-title"}`}>
          {title}
        </h2>
        {eyebrow && <div className="board-drawer__eyebrow">{eyebrow}</div>}
      </div>
      {(actions || close_position === "end") && (
        <div className="board-drawer__actions">
          {actions}
          {close_position === "end" && close_button}
        </div>
      )}
    </div>
  );
};

export default BoardDrawerHeader;
