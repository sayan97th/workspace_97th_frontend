"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { AlertCircle, Check, ChevronLeft, Eye, EyeOff, Loader2, Lock, Mail, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordsMatch = passwordConfirmation.length > 0 && password === passwordConfirmation;
  const passwordsMismatch = passwordConfirmation.length > 0 && password !== passwordConfirmation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!isChecked) {
      setError("You must agree to the Terms and Conditions to create an account.");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      const redirectUrl = getValidRedirectUrl(searchParams.get("callbackUrl"));
      router.push(redirectUrl);
    } catch (err: unknown) {
      const apiError = err as ApiError;
      if (apiError.errors) {
        setFieldErrors(apiError.errors);
      }
      setError(apiError.message || "An error occurred while creating your account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    window.location.href = `${apiUrl}/api/auth/google/redirect`;
  };

  return (
    <div className="no-scrollbar flex w-full flex-col overflow-y-auto lg:w-1/2 lg:flex-1">
      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeft className="h-5 w-5" />
          Back to dashboard
        </Link>
      </div>
      <div className="mx-auto w-full max-w-md pb-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your details below to create your account.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleGoogleSignUp}
              className="inline-flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                  fill="#4285F4"
                />
                <path
                  d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                  fill="#34A853"
                />
                <path
                  d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                  fill="#FBBC05"
                />
                <path
                  d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                  fill="#EB4335"
                />
              </svg>
              Sign up with Google
            </button>
            <div className="relative py-3 sm:py-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white p-2 text-gray-400 dark:bg-gray-900 sm:px-5 sm:py-2">
                  Or
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
                <AlertCircle className="h-4 w-4 flex-none translate-y-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {/* First Name / Last Name */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <Label>
                      First Name<span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        className="pl-11"
                        type="text"
                        id="first_name"
                        name="first_name"
                        placeholder="First name"
                        defaultValue={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        error={!!fieldErrors.first_name}
                        hint={fieldErrors.first_name?.[0]}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <Label>
                      Last Name<span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <Input
                        className="pl-11"
                        type="text"
                        id="last_name"
                        name="last_name"
                        placeholder="Last name"
                        defaultValue={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        error={!!fieldErrors.last_name}
                        hint={fieldErrors.last_name?.[0]}
                      />
                    </div>
                  </div>
                </div>
                {/* Email */}
                <div>
                  <Label>
                    Email<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="pl-11"
                      type="email"
                      id="email"
                      name="email"
                      placeholder="Enter your email"
                      defaultValue={email}
                      onChange={(e) => setEmail(e.target.value)}
                      error={!!fieldErrors.email}
                      hint={fieldErrors.email?.[0]}
                    />
                  </div>
                </div>
                {/* Password */}
                <div>
                  <Label>
                    Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="pl-11"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      defaultValue={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!fieldErrors.password}
                      hint={fieldErrors.password?.[0]}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                {/* Confirm Password */}
                <div>
                  <Label>
                    Confirm Password<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      className="pl-11"
                      placeholder="Repeat your password"
                      type={showPassword ? "text" : "password"}
                      defaultValue={passwordConfirmation}
                      onChange={(e) => setPasswordConfirmation(e.target.value)}
                      error={!!fieldErrors.password_confirmation}
                      hint={fieldErrors.password_confirmation?.[0]}
                    />
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
                {/* Checkbox */}
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-0.5 h-5 w-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block text-sm font-normal text-gray-500 dark:text-gray-400">
                    By creating an account you agree to our{" "}
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      Terms and Conditions
                    </span>{" "}
                    and{" "}
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      Privacy Policy
                    </span>
                    .
                  </p>
                </div>
                {/* Button */}
                <div>
                  <Button className="w-full" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account…
                      </>
                    ) : (
                      "Sign Up"
                    )}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-6">
              <p className="text-center text-sm font-normal text-gray-700 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
