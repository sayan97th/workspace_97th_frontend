import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password | Workspace 97th",
  description: "Set your new Workspace 97th account password",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function ResetPasswordTokenPage({ params }: Props) {
  const { token } = await params;

  return (
    <Suspense>
      <ResetPasswordForm token={token} />
    </Suspense>
  );
}
