import type { Metadata } from "next";
import { Suspense } from "react";
import AcceptBoardInvitationForm from "@/components/auth/AcceptBoardInvitationForm";

export const metadata: Metadata = {
  title: "Accept Board Invitation | Workspace 97th",
  description: "Accept your invitation to view a Workspace 97th board",
};

type Props = {
  params: Promise<{ code: string }>;
};

export default async function AcceptBoardInvitationPage({ params }: Props) {
  const { code } = await params;

  return (
    <Suspense>
      <AcceptBoardInvitationForm code={code} />
    </Suspense>
  );
}
