import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign Up | Workspace 97th",
  description: "Sign Up page for Workspace 97th Dashboard",
};

export default function SignUp() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
}
