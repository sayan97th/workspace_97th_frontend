"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
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
      <div className="flex flex-col flex-1 lg:w-1/2 w-full">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="flex flex-col items-center text-center gap-4 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10">
              <svg className="h-7 w-7 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Password reset successfully</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              Your password has been updated. You will be redirected to the sign in page in a moment.
            </p>
            <Link href="/signin" className="mt-2 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to sign in
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Set new password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your new password must be different from your previous password.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email <span className="text-error-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@gmail.com"
                  className={`h-11 w-full rounded-lg border px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
                    fieldErrors.email
                      ? "border-error-400 focus:border-error-400"
                      : "border-gray-300 focus:border-brand-400 dark:border-gray-700"
                  }`}
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-error-500">{fieldErrors.email[0]}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className={`h-11 w-full rounded-lg border px-4 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
                      fieldErrors.password
                        ? "border-error-400 focus:border-error-400"
                        : "border-gray-300 focus:border-brand-400 dark:border-gray-700"
                    }`}
                  />
                  <span
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
                  >
                    {showPassword ? (
                      <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </span>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-error-500">{fieldErrors.password[0]}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Repeat your new password"
                    className={`h-11 w-full rounded-lg border px-4 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 ${
                      fieldErrors.password_confirmation
                        ? "border-error-400 focus:border-error-400"
                        : "border-gray-300 focus:border-brand-400 dark:border-gray-700"
                    }`}
                  />
                  <span
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
                  >
                    {showConfirmPassword ? (
                      <Eye className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    )}
                  </span>
                </div>
                {fieldErrors.password_confirmation && (
                  <p className="mt-1 text-xs text-error-500">{fieldErrors.password_confirmation[0]}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
