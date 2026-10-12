import SignInForm from "@/components/auth/SignInForm";
import { readSearchParam } from "@/components/auth/AuthPrimitives";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign In page for Workspace 97th Dashboard",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Search params are read here on the server instead of with `useSearchParams` in the form,
// so the form is part of the first HTML paint rather than appearing after hydration.
export default async function SignIn({ searchParams }: Props) {
  const search_params = await searchParams;

  return (
    <SignInForm
      callback_url={readSearchParam(search_params.callbackUrl)}
      error_code={readSearchParam(search_params.error)}
    />
  );
}
