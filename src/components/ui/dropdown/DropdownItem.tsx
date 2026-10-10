import type React from "react";
import Link from "next/link";

interface DropdownItemProps {
  tag?: "a" | "button";
  href?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  baseClassName?: string;
  className?: string;
  children: React.ReactNode;
  /** Captures the rendered `<button>`'s DOM node — e.g. to anchor a nested submenu flyout off this specific row. Ignored for `tag="a"`. */
  buttonRef?: React.Ref<HTMLButtonElement>;
  /** Renders the row greyed-out and non-interactive (e.g. "Move ahead" when already last) instead of hiding it outright. */
  disabled?: boolean;
  /** Paints the row in the destructive style (`data-danger`, read by `action-menu.css`). */
  danger?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  tag = "button",
  href,
  onClick,
  onItemClick,
  baseClassName = "block w-full rounded px-2 py-1.5 text-left text-board-nav text-shell-text hover:bg-shell-hover-strong",
  className = "",
  children,
  buttonRef,
  disabled = false,
  danger = false,
}) => {
  const combinedClasses = `${baseClassName} ${className}`.trim();

  const handleClick = (event: React.MouseEvent) => {
    if (tag === "button") {
      event.preventDefault();
    }
    if (disabled) return;
    if (onClick) onClick();
    if (onItemClick) onItemClick();
  };

  if (tag === "a" && href) {
    return (
      <Link href={href} className={combinedClasses} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      data-danger={danger || undefined}
      className={combinedClasses}
    >
      {children}
    </button>
  );
};
