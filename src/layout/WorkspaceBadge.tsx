import React from "react";
import { WorkspaceHomeGlyphIcon } from "@/icons/workspace-icons";
import { default_workspace_color, type WorkspaceSummary } from "@/data/workspace-switcher-data";

type WorkspaceBadgeProps = {
  workspace: Pick<WorkspaceSummary, "mono" | "color" | "is_home">;
  /** Square edge length in pixels. */
  size?: number;
  /**
   * Background color for the small home-glyph notch, so it blends with the
   * surface the badge sits on. Pass the surface color (defaults to the dark
   * shell base) to get the "cut-out" look from the design.
   */
  notchColor?: string;
  className?: string;
};

/**
 * The colored, rounded square with a workspace monogram used across the
 * switcher chip and dropdown rows. When the workspace is the home workspace it
 * gets a small house glyph in the bottom-right corner.
 */
const WorkspaceBadge: React.FC<WorkspaceBadgeProps> = ({
  workspace,
  size = 24,
  notchColor = "var(--color-shell-surface)",
  className = "",
}) => {
  const glyph_size = Math.round(size * 0.5);

  return (
    <span
      className={`relative flex flex-none items-center justify-center rounded-md font-outfit font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.5),
        backgroundColor: workspace.color || default_workspace_color,
      }}
    >
      {workspace.mono}
      {workspace.is_home && (
        <span
          className="absolute -bottom-[3px] -right-[3px] flex items-center justify-center rounded text-shell-text"
          style={{ width: glyph_size, height: glyph_size, backgroundColor: notchColor }}
        >
          <WorkspaceHomeGlyphIcon size={Math.round(glyph_size * 0.62)} />
        </span>
      )}
    </span>
  );
};

export default WorkspaceBadge;
