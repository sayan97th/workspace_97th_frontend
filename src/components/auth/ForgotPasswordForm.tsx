"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2, Mail, MailCheck } from "lucide-react";
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
  AuthFooterLink,
  AuthFormContainer,
} from "./AuthPrimitives";

const back_to_sign_in = { href: "/signin", label: "Back to sign in" };

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
      <AuthFormContainer back_link={back_to_sign_in}>
        <AuthCard key="sent">
          <AuthCardHeader
            icon={MailCheck}
            tone="success"
            title="Check your email"
            description={
              <>
                We sent a password reset link to{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>. Please check your inbox
                and follow the instructions.
              </>
            }
          />

          <Link
            href="/signin"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
          >
            Back to sign in
          </Link>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
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
        </AuthCard>
      </AuthFormContainer>
    );
  }

  return (
    <AuthFormContainer back_link={back_to_sign_in}>
      <AuthCard key="request">
        <AuthCardHeader
          icon={KeyRound}
          title="Forgot your password?"
          description="Enter your email address and we will send you a link to reset your password."
        />

        {error && <AuthAlert message={error} />}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
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
                  placeholder="you@company.com"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={!!fieldErrors.email}
                  hint={fieldErrors.email?.[0]}
                />
              </div>
            </div>

            <Button className="h-11 w-full" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </div>
        </form>

        <AuthFooterLink prompt="Remember your password?" href="/signin" label="Sign in" />
      </AuthCard>
    </AuthFormContainer>
  );
}
