import type { Metadata } from "next";
import { Suspense } from "react";
import AcceptStaffInvitationForm from "@/components/auth/AcceptStaffInvitationForm";

export const metadata: Metadata = {
  title: "Accept Invitation | Workspace 97th",
  description: "Accept your invitation to join 97th Floor",
};

type Props = {
  params: Promise<{ code: string }>;
};

export default async function AcceptStaffInvitationPage({ params }: Props) {
  const { code } = await params;

  return (
    <Suspense>
      <AcceptStaffInvitationForm code={code} />
    </Suspense>
  );
}
