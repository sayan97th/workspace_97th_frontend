"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronLeft, Loader2, Mail, MailCheck } from "lucide-react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { authService } from "@/services/auth.service";
import type { ApiError } from "@/types/auth";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await authService.forgotPassword({ email });
      setIsSent(true);
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.errors) setFieldErrors(apiErr.errors);
      setError(apiErr.message || "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="flex w-full flex-col lg:w-1/2 lg:flex-1">
        <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
          <Link
            href="/signin"
            className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to sign in
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
              <MailCheck className="h-7 w-7 text-success-500" />
            </div>
            <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white">Check your email</h1>
            <p className="mx-auto max-w-sm text-sm text-gray-500 dark:text-gray-400">
              We sent a password reset link to{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>. Please check
              your inbox and follow the instructions.
            </p>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Did not receive it?{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSent(false);
                  setEmail("");
                }}
                className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Try again
              </button>
            </p>
            <Link
              href="/signin"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col lg:w-1/2 lg:flex-1">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to sign in
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Forgot your password?
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email address and we will send you a link to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
              <AlertCircle className="h-4 w-4 flex-none translate-y-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Label>
                  Email <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                  <Input
                    className="pl-11"
                    type="email"
                    placeholder="info@gmail.com"
                    defaultValue={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!fieldErrors.email}
                    hint={fieldErrors.email?.[0]}
                  />
                </div>
              </div>

              <Button className="w-full" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400">
              Remember your password?{" "}
              <Link href="/signin" className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
