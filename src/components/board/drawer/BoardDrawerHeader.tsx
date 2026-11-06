"use client";
import React, { useLayoutEffect, useRef, useState } from "react";
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

/** Title length tiers. Longer titles step down in size so a 255 character item name still reads as a heading, not a wall of text. */
type TitleLengthTier = "short" | "medium" | "long";

function titleLengthTier(text: string): TitleLengthTier {
  const length = text.trim().length;
  if (length > 140) return "long";
  if (length > 70) return "medium";
  return "short";
}

/**
 * The drawer's heading. A text title keeps its line breaks, scales down with
 * its length (see `titleLengthTier`) and is clamped to a few lines with a
 * "Show more" toggle when it still overflows, so the tabs and the feed stay
 * in view. The full text is always available in the tooltip.
 */
const DrawerTitle: React.FC<{ title: React.ReactNode; title_size: "page" | "dialog"; title_id?: string }> = ({ title, title_size, title_id }) => {
  const title_ref = useRef<HTMLHeadingElement>(null);
  const title_text = typeof title === "string" ? title : null;
  const [is_expanded, setIsExpanded] = useState(false);
  const [is_overflowing, setIsOverflowing] = useState(false);

  // Another item opened in the same drawer starts collapsed again.
  const [expanded_for, setExpandedFor] = useState(title_text);
  if (expanded_for !== title_text) {
    setExpandedFor(title_text);
    setIsExpanded(false);
  }

  // Only measured while clamped, so expanding never hides the "Show less" toggle. Re-measured when the drawer resizes.
  useLayoutEffect(() => {
    const title_el = title_ref.current;
    if (!title_el || title_text === null || is_expanded) return;
    const measure = () => setIsOverflowing(title_el.scrollHeight > title_el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const resize_observer = new ResizeObserver(measure);
    resize_observer.observe(title_el);
    return () => resize_observer.disconnect();
  }, [title_text, is_expanded]);

  return (
    <>
      <h2
        ref={title_ref}
        id={title_id}
        title={title_text ?? undefined}
        data-length={title_text !== null && title_size === "page" ? titleLengthTier(title_text) : undefined}
        data-clamped={title_text !== null && !is_expanded ? true : undefined}
        className={`board-drawer__title font-heading ${title_size === "page" ? "text-page-title" : "text-dialog-title"}`}
      >
        {title}
      </h2>
      {(is_overflowing || is_expanded) && (
        <button type="button" onClick={() => setIsExpanded((value) => !value)} aria-expanded={is_expanded} className="board-drawer__title-toggle">
          {is_expanded ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
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
        <DrawerTitle title={title} title_size={title_size} title_id={title_id} />
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
