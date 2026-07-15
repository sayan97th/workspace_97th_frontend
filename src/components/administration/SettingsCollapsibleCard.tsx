"use client";
import React, { useState } from "react";

export type SettingsCollapsibleCardProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Expanded on first render. Defaults to false. */
  default_open?: boolean;
  className?: string;
};

/**
 * Bordered card with a clickable header that expands/collapses its body — used for the
 * Authentication section's policy groups (2FA/Google/SAML, SCIM, guest approval, IP
 * restriction). Owns its own open state since these cards don't need to be controlled
 * from outside the section that renders them.
 */
const SettingsCollapsibleCard: React.FC<SettingsCollapsibleCardProps> = ({
  title,
  icon,
  children,
  default_open = false,
  className = "",
}) => {
  const [is_open, setIsOpen] = useState(default_open);

  return (
    <div className={`overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b1616] ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center gap-[10px] px-[18px] py-[15px] text-left transition-colors hover:bg-white/[0.03]"
      >
        {icon ? <span className="flex-none text-[#8a9495]">{icon}</span> : null}
        <span className="flex-1 text-[14px] font-bold text-[#edf1f1]">{title}</span>
        <span
          className="flex flex-none text-[#8a9495] transition-transform duration-150"
          style={{ transform: is_open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <svg width="10" height="10" viewBox="0 0 12 12">
            <path
              d="M3 4.5 L6 7.5 L9 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {is_open ? (
        <div className="flex flex-col gap-[18px] border-t border-white/[0.06] px-[18px] pb-5 pt-[14px]">
          {children}
        </div>
      ) : null}
    </div>
  );
};

export default SettingsCollapsibleCard;
