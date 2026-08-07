import type { Metadata } from "next";
import { Suspense } from "react";
import AcceptInvitationForm from "@/components/auth/AcceptInvitationForm";

export const metadata: Metadata = {
  title: "Accept Invitation | Workspace 97th",
  description: "Accept your invitation to join a Workspace 97th workspace",
};

type Props = {
  params: Promise<{ code: string }>;
};

export default async function AcceptInvitationPage({ params }: Props) {
  const { code } = await params;

  return (
    <Suspense>
      <AcceptInvitationForm code={code} />
    </Suspense>
  );
}
