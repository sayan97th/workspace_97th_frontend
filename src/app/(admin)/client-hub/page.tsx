import type { Metadata } from "next";
import { Suspense } from "react";
import ClientHubBoard from "./_components/ClientHubBoard";

export const metadata: Metadata = {
  title: "Client Hub | Workspace 97th",
  description: "Client Hub board for Workspace 97th",
};

export default function ClientHubPage() {
  return (
    <Suspense>
      <ClientHubBoard />
    </Suspense>
  );
}
