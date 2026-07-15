"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  X,
} from "lucide-react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/auth";

type Props = {
  token: string;
};

export default function ResetPasswordForm({ token }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordsMatch = passwordConfirmation.length > 0 && password === passwordConfirmation;
  const passwordsMismatch = passwordConfirmation.length > 0 && password !== passwordConfirmation;

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
      setTimeout(() => {
        router.push("/signin");
      }, 3000);
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
      <div className="flex w-full flex-col lg:w-1/2 lg:flex-1">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
              <CheckCircle className="h-7 w-7 text-success-500" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white">
              Password reset successfully
            </h1>
            <p className="mx-auto max-w-sm text-sm text-gray-500 dark:text-gray-400">
              Your password has been updated. You will be redirected to the sign in page in a moment.
            </p>
            <Link
              href="/signin"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              Go to sign in
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="no-scrollbar flex w-full flex-col overflow-y-auto lg:w-1/2 lg:flex-1">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to sign in
        </Link>
      </div>
      <div className="mx-auto w-full max-w-md pb-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Set new password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your new password must be different from your previous password.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
              <AlertCircle className="h-4 w-4 flex-none translate-y-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                  <Input
                    className="pl-11"
                    type="email"
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info@gmail.com"
                    error={!!fieldErrors.email}
                    hint={fieldErrors.email?.[0]}
                  />
                </div>
              </div>

              <div>
                <Label>
                  New Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                  <Input
                    className="pl-11"
                    type={showPassword ? "text" : "password"}
                    defaultValue={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    error={!!fieldErrors.password}
                    hint={fieldErrors.password?.[0]}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3.5 z-10 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-shell-text-muted dark:hover:text-shell-text-secondary"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label>
                  Confirm Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                  <Input
                    className="pl-11"
                    type={showConfirmPassword ? "text" : "password"}
                    defaultValue={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Repeat your new password"
                    error={!!fieldErrors.password_confirmation}
                    hint={fieldErrors.password_confirmation?.[0]}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3.5 z-10 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-shell-text-muted dark:hover:text-shell-text-secondary"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {!fieldErrors.password_confirmation && (passwordsMatch || passwordsMismatch) && (
                  <p
                    className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                      passwordsMatch ? "text-success-500" : "text-error-500"
                    }`}
                  >
                    {passwordsMatch ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              <Button className="w-full" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
