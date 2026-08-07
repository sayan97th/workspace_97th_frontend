import type { Metadata } from "next";
import { Suspense } from "react";
import InvitationsView from "./_components/InvitationsView";

export const metadata: Metadata = {
  title: "Sent invitations | Workspace 97th",
  description: "Every invitation sent for this workspace",
};

export default function InvitationsPage() {
  return (
    <Suspense>
      <InvitationsView />
    </Suspense>
  );
}
