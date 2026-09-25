import React from "react";

export type WorkspaceMonogramProps = {
  workspace: { name: string; color: string | null; mono: string | null } | null;
  size?: number;
};

/** A workspace's colored initial, the small marker personal pages put next to a board so you know where it lives. */
const WorkspaceMonogram: React.FC<WorkspaceMonogramProps> = ({ workspace, size = 18 }) => (
  <span
    className="flex flex-none items-center justify-center rounded-[5px] font-bold text-white"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.55), background: workspace?.color || "#6161ff" }}
    title={workspace?.name}
    aria-hidden="true"
  >
    {(workspace?.mono || workspace?.name?.[0] || "W").toUpperCase()}
  </span>
);

export default WorkspaceMonogram;
