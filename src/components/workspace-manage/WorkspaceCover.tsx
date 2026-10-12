"use client";
import React from "react";
import CoverBanner from "@/components/ui/cover/CoverBanner";

/** Shown until a workspace uploads its own cover. */
export const DEFAULT_WORKSPACE_COVER_URL = "/images/workspace/default-cover.svg";

export type WorkspaceCoverProps = {
  /** Custom cover, or null to show {@link DEFAULT_WORKSPACE_COVER_URL}. */
  cover_url: string | null;
  /** Saved vertical focal point, 0 (top) to 100 (bottom). */
  cover_position_y: number;
  /** Owners and admins get the "Change cover" control; everyone else just sees the banner. */
  can_manage: boolean;
  onUpload: (file: File) => Promise<void>;
  onReposition: (cover_position_y: number) => Promise<void>;
  onRemove: () => Promise<void>;
};

/** Manage Workspace's wide banner, a {@link CoverBanner} over the default workspace art. */
const WorkspaceCover: React.FC<WorkspaceCoverProps> = (props) => (
  <CoverBanner
    {...props}
    class_name="h-[140px] bg-[#e6e9ef] sm:h-[200px]"
    fallback={
      // eslint-disable-next-line @next/next/no-img-element -- a static SVG that must fill the banner like a custom cover.
      <img
        src={DEFAULT_WORKSPACE_COVER_URL}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
    }
  />
);

export default WorkspaceCover;
