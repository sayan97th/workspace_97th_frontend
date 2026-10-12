import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your Workspace 97th account password",
};

export default function ResetPasswordPage() {
  return <ForgotPasswordForm />;
}
