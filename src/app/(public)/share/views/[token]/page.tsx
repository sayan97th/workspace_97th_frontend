import type { Metadata } from "next";
import SharedViewPage from "@/components/public/SharedViewPage";

export const metadata: Metadata = {
  title: "Shared view",
  description: "A read only board view shared with you",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function SharedBoardViewPage({ params }: Props) {
  const { token } = await params;

  return <SharedViewPage token={token} />;
}
