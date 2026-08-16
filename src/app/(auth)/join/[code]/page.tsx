import type { Metadata } from "next";
import { Suspense } from "react";
import JoinWorkspaceForm from "@/components/auth/JoinWorkspaceForm";

export const metadata: Metadata = {
  title: "Join Workspace | Workspace 97th",
  description: "Join a Workspace 97th workspace through a shared invite link",
};

type Props = {
  params: Promise<{ code: string }>;
};

export default async function JoinWorkspacePage({ params }: Props) {
  const { code } = await params;

  return (
    <Suspense>
      <JoinWorkspaceForm code={code} />
    </Suspense>
  );
}
