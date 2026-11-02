import React from "react";

export type WorkspaceMonogramProps = {
  workspace: { name: string; color: string | null; mono: string | null; avatar_url?: string | null } | null;
  size?: number;
};

/** A workspace's logo or colored initial, the small marker personal pages put next to a board so you know where it lives. */
const WorkspaceMonogram: React.FC<WorkspaceMonogramProps> = ({ workspace, size = 18 }) => (
  <span
    className="flex flex-none items-center justify-center overflow-hidden rounded-[5px] font-bold text-white"
    style={{ width: size, height: size, fontSize: Math.round(size * 0.55), background: workspace?.avatar_url ? undefined : workspace?.color || "#6161ff" }}
    title={workspace?.name}
    aria-hidden="true"
  >
    {workspace?.avatar_url ? (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from uploaded URLs, not static app assets.
      <img src={workspace.avatar_url} alt="" className="h-full w-full object-cover" />
    ) : (
      (workspace?.mono || workspace?.name?.[0] || "W").toUpperCase()
    )}
  </span>
);

export default WorkspaceMonogram;
