"use client";
import React from "react";

type WorkspaceEmptyStateProps = {
  title: string;
  description?: string;
};

/**
 * Centered empty state used across the browse tabs (no owned workspaces, no
 * collaborations, no search matches). The illustration — a magnifying glass
 * over a scatter of blocks — is drawn with plain elements so it inherits the
 * shell palette without shipping an image asset.
 */
const WorkspaceEmptyState: React.FC<WorkspaceEmptyStateProps> = ({
  title,
  description = "Start your work by joining or creating a new workspace",
}) => (
  <div className="flex flex-col items-center justify-center px-5 py-[120px] text-center">
    <div className="relative mb-[26px] h-[90px] w-[120px]">
      <span className="absolute bottom-[6px] left-[14px] h-4 w-11 -rotate-[14deg] rounded-lg bg-sunset-200" />
      <span className="absolute bottom-[2px] left-[48px] h-5 w-[26px] rounded-md bg-success-500" />
      <span className="absolute bottom-[6px] left-[74px] h-[22px] w-[22px] rotate-12 rounded-md bg-gray-300" />
      <span className="absolute left-10 top-0 h-10 w-10 rounded-full border-[5px] border-[#5b6fe8] bg-gray-50" />
      <span className="absolute left-[74px] top-[34px] h-5 w-[5px] -rotate-[42deg] rounded-[3px] bg-[#5b6fe8]" />
    </div>
    <div className="text-xl font-semibold text-gray-50">{title}</div>
    <div className="mt-2 text-[13.5px] text-gray-400">{description}</div>
  </div>
);

export default WorkspaceEmptyState;
