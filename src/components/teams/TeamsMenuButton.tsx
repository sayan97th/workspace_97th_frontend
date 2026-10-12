"use client";
import React, { useRef, useState } from "react";
import ActionMenu, { type ActionMenuSection } from "@/components/ui/dropdown/ActionMenu";

export type TeamsMenuButtonProps = {
  /** Accessible name of both the trigger and the menu, e.g. "Team options". */
  aria_label: string;
  sections: ActionMenuSection[];
  children: React.ReactNode;
  className?: string;
  width?: number;
  align?: "start" | "end";
};

/**
 * A trigger that opens monday's {@link ActionMenu} under it. Used by every "..." and caret menu
 * on the Teams page. Stops click propagation so it can sit inside a clickable rail row.
 */
const TeamsMenuButton: React.FC<TeamsMenuButtonProps> = ({
  aria_label,
  sections,
  children,
  className = "teams-icon-button",
  width = 240,
  align = "end",
}) => {
  const [is_open, setIsOpen] = useState(false);
  const button_ref = useRef<HTMLButtonElement>(null);
  const visible_sections = sections.filter((section) => section.items.length > 0);

  if (visible_sections.length === 0) return null;

  return (
    <>
      <button
        ref={button_ref}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={aria_label}
        aria-haspopup="menu"
        aria-expanded={is_open}
        className={className}
      >
        {children}
      </button>
      <ActionMenu
        anchor_el={button_ref.current}
        is_open={is_open}
        onClose={() => setIsOpen(false)}
        sections={visible_sections}
        aria_label={aria_label}
        width={width}
        align={align}
      />
    </>
  );
};

export default TeamsMenuButton;
