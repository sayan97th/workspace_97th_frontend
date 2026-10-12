import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { readSearchParam } from "@/components/auth/AuthPrimitives";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set your new Workspace 97th account password",
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordTokenPage({ params, searchParams }: Props) {
  const [{ token }, search_params] = await Promise.all([params, searchParams]);

  return <ResetPasswordForm token={token} initial_email={readSearchParam(search_params.email) ?? ""} />;
}
