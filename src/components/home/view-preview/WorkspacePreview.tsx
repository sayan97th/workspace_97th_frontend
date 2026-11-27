import React from "react";
import WorkspaceMonogram, { type WorkspaceMonogramProps } from "@/components/personal/WorkspaceMonogram";
import type { RecentBoardPreview } from "@/types/personal";
import { compactNumber, cssVars } from "./previewHelpers";

type WorkspacePreviewProps = {
  preview: RecentBoardPreview;
  workspace: WorkspaceMonogramProps["workspace"];
};

/**
 * A mini Manage Workspace page: the workspace's cover (or a wash of its
 * color), its logo, and tiles with how many boards, docs and members it has.
 */
const WorkspacePreview: React.FC<WorkspacePreviewProps> = ({ preview, workspace }) => {
  const details = preview.workspace;
  const stats = [
    { key: "boards", label: "Boards", value: details?.board_count ?? 0 },
    { key: "docs", label: "Docs", value: details?.doc_count ?? 0 },
    { key: "members", label: "Members", value: details?.member_count ?? 0 },
  ];

  return (
    <div className="vp-workspace" style={cssVars({ "--vp-color": details?.color || workspace?.color || "#6161ff" })}>
      <span className="vp-workspace__cover">
        {details?.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element -- the workspace cover, already sized by the API
          <img src={details.cover_url} alt="" loading="lazy" decoding="async" />
        )}
      </span>
      <span className="vp-workspace__logo">
        <WorkspaceMonogram workspace={workspace} size={26} />
      </span>
      <span className="vp-workspace__stats">
        {stats.map((stat) => (
          <span key={stat.key} className="vp-workspace__stat" data-stat={stat.key}>
            <b>{compactNumber(stat.value)}</b>
            <span>{stat.label}</span>
          </span>
        ))}
      </span>
    </div>
  );
};

export default WorkspacePreview;
