import type { Metadata } from "next";
import PublicFormPage from "@/components/public/PublicFormPage";

export const metadata: Metadata = {
  title: "Form",
  description: "Submit a response",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function FormPage({ params }: Props) {
  const { token } = await params;

  return <PublicFormPage token={token} />;
}
