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
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  tag = "button",
  href,
  onClick,
  onItemClick,
  baseClassName = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900",
  className = "",
  children,
  buttonRef,
  disabled = false,
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
    <button ref={buttonRef} onClick={handleClick} disabled={disabled} className={combinedClasses}>
      {children}
    </button>
  );
};
