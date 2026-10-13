import type { Metadata } from "next";
import SharedDocPage from "@/components/public/SharedDocPage";

export const metadata: Metadata = {
  title: "Shared doc",
  description: "A read only doc shared with you",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function SharedDocRoutePage({ params }: Props) {
  const { token } = await params;

  return <SharedDocPage token={token} />;
}
