import SignUpForm from "@/components/auth/SignUpForm";
import { readSearchParam } from "@/components/auth/AuthPrimitives";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your Blueprint account",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignUp({ searchParams }: Props) {
  const search_params = await searchParams;

  return <SignUpForm callback_url={readSearchParam(search_params.callbackUrl)} />;
}
