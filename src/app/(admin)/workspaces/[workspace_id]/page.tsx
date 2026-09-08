import { redirect } from "next/navigation";
import { buildWorkspaceManagePath } from "@/components/workspace-manage/tab-routing";

/**
 * `/workspaces/{workspace_id}` with no tab segment — sends the visitor to
 * Manage Workspace's default tab so a bare workspace URL still lands
 * somewhere useful.
 */
export default async function WorkspaceManageRootPage({
  params,
}: {
  params: Promise<{ workspace_id: string }>;
}) {
  const { workspace_id } = await params;
  redirect(buildWorkspaceManagePath(Number(workspace_id)));
}
