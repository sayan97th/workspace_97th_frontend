"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Loader2, Lock, LockKeyhole, Mail } from "lucide-react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/auth";
import {
  AuthAlert,
  AuthCard,
  AuthCardHeader,
  AuthFieldIcon,
  AuthFormContainer,
  AuthPasswordToggle,
  PasswordMatchHint,
} from "./AuthPrimitives";

const SUCCESS_REDIRECT_DELAY_MS = 3000;

type Props = {
  token: string;
  /** `email` search param from the reset link, prefilled so the user only types the new password. */
  initial_email: string;
};

export default function ResetPasswordForm({ token, initial_email }: Props) {
  const router = useRouter();

  const [email, setEmail] = useState(initial_email);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Sends the user to sign in shortly after a successful reset, cancelled if they leave first.
  useEffect(() => {
    if (!isSuccess) return;
    const redirect_timer = window.setTimeout(() => router.push("/signin"), SUCCESS_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(redirect_timer);
  }, [isSuccess, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await authService.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.errors) setFieldErrors(apiErr.errors);
      setError(apiErr.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthFormContainer>
        <AuthCard key="success">
          <AuthCardHeader
            icon={CheckCircle}
            tone="success"
            title="Password reset successfully"
            description="Your password has been updated. You will be redirected to the sign in page in a moment."
          />
          <Link
            href="/signin"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
          >
            Go to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </AuthCard>
      </AuthFormContainer>
    );
  }

  return (
    <AuthFormContainer back_link={{ href: "/signin", label: "Back to sign in" }}>
      <AuthCard key="form">
        <AuthCardHeader
          icon={LockKeyhole}
          title="Set a new password"
          description="Your new password must be different from your previous password."
        />

        {error && <AuthAlert message={error} />}

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <Label htmlFor="email">
                Email <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <AuthFieldIcon icon={Mail} />
                <Input
                  id="email"
                  name="email"
                  className="pl-11"
                  type="email"
                  autoComplete="email"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  error={!!fieldErrors.email}
                  hint={fieldErrors.email?.[0]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">
                New Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <AuthFieldIcon icon={Lock} />
                <Input
                  id="password"
                  name="password"
                  className="pr-12 pl-11"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  error={!!fieldErrors.password}
                  hint={fieldErrors.password?.[0]}
                />
                <AuthPasswordToggle is_visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
              </div>
            </div>

            <div>
              <Label htmlFor="password_confirmation">
                Confirm Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <AuthFieldIcon icon={Lock} />
                <Input
                  id="password_confirmation"
                  name="password_confirmation"
                  className="pr-12 pl-11"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  defaultValue={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repeat your new password"
                  error={!!fieldErrors.password_confirmation}
                  hint={fieldErrors.password_confirmation?.[0]}
                />
                <AuthPasswordToggle
                  is_visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((v) => !v)}
                />
              </div>
              {!fieldErrors.password_confirmation && (
                <PasswordMatchHint password={password} confirmation={passwordConfirmation} />
              )}
            </div>

            <Button className="h-11 w-full" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting…
                </>
              ) : (
                "Reset password"
              )}
            </Button>
          </div>
        </form>
      </AuthCard>
    </AuthFormContainer>
  );
}
