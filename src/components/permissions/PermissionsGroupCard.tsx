"use client";
import React from "react";
import { ChevronDownIcon, InfoIcon } from "@/icons/workspace-icons";
import PermissionsCheckbox from "./PermissionsCheckbox";
import type { PermissionGroup } from "./types";

export type PermissionsGroupCardProps = {
  group: PermissionGroup;
  isChecked: (key: string) => boolean;
  onToggle: (key: string) => void;
};

/** One titled card of permission rows (e.g. "Boards"), rendered inside {@link PermissionsPanel}. */
const PermissionsGroupCard: React.FC<PermissionsGroupCardProps> = ({ group, isChecked, onToggle }) => (
  <div>
    <div className="mb-[9px] text-[14.5px] font-bold text-shell-text">{group.title}</div>
    <div className="overflow-hidden rounded-[10px] border border-shell-border bg-shell-panel">
      {group.items.map((item, index) => {
        const checked = isChecked(item.key);
        return (
          <div
            key={item.key}
            className={`flex items-center gap-3 px-4 py-3 ${
              index < group.items.length - 1 ? "border-b border-shell-border" : ""
            }`}
          >
            <PermissionsCheckbox is_checked={checked} onToggle={() => onToggle(item.key)} aria-label={item.label} />
            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-shell-text">
              <span>{item.label}</span>
              {item.has_info && (
                <span className="flex flex-none text-shell-text-faint">
                  <InfoIcon size={14} />
                </span>
              )}
              {item.has_chevron && (
                <span className="flex flex-none text-shell-text-faint">
                  <ChevronDownIcon size={13} />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default PermissionsGroupCard;
