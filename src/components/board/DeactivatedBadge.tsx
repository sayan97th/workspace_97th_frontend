import React from "react";
import { DEACTIVATED_LABEL, DEACTIVATED_TOOLTIP } from "@/lib/deactivated-user";

/**
 * Small "Inactive" pill shown next to the name of a person whose account is
 * deactivated. Renders nothing for active people, so callers can drop it in
 * unconditionally.
 */
const DeactivatedBadge: React.FC<{ is_deactivated?: boolean; className?: string }> = ({ is_deactivated, className }) => {
  if (!is_deactivated) return null;

  return (
    <span
      title={DEACTIVATED_TOOLTIP}
      className={`flex-none rounded-full bg-shell-hover px-1.5 py-px text-[10px] font-medium leading-tight text-shell-text-faint ${className ?? ""}`}
    >
      {DEACTIVATED_LABEL}
    </span>
  );
};

export default DeactivatedBadge;
