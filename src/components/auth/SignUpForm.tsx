"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";
import {
  AuthAlert,
  AuthCard,
  AuthCardHeader,
  AuthDivider,
  AuthFieldIcon,
  AuthFooterLink,
  AuthFormContainer,
  AuthPasswordToggle,
  GoogleAuthButton,
  PasswordMatchHint,
} from "./AuthPrimitives";

type SignUpFormProps = {
  /** `callbackUrl` search param, where to go after the account is created. */
  callback_url: string | null;
};

export default function SignUpForm({ callback_url }: SignUpFormProps) {
  const router = useRouter();
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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

      router.push(getValidRedirectUrl(callback_url));
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
    setIsGoogleLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
    window.location.href = `${apiUrl}/api/auth/google/redirect`;
  };

  return (
    <AuthFormContainer back_link={{ href: "/", label: "Back to dashboard" }}>
      <AuthCard>
        <AuthCardHeader title="Create your account" description="Set up your account to start working with your team." />

        <GoogleAuthButton label="Sign up with Google" onClick={handleGoogleSignUp} is_loading={isGoogleLoading} />

        <AuthDivider label="Or sign up with email" />

        {error && <AuthAlert message={error} />}

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">
                  First Name <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <AuthFieldIcon icon={User} />
                  <Input
                    className="pl-11"
                    type="text"
                    id="first_name"
                    name="first_name"
                    autoComplete="given-name"
                    placeholder="First name"
                    defaultValue={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    error={!!fieldErrors.first_name}
                    hint={fieldErrors.first_name?.[0]}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="last_name">
                  Last Name <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <AuthFieldIcon icon={User} />
                  <Input
                    className="pl-11"
                    type="text"
                    id="last_name"
                    name="last_name"
                    autoComplete="family-name"
                    placeholder="Last name"
                    defaultValue={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    error={!!fieldErrors.last_name}
                    hint={fieldErrors.last_name?.[0]}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="email">
                Email <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <AuthFieldIcon icon={Mail} />
                <Input
                  className="pl-11"
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={!!fieldErrors.email}
                  hint={fieldErrors.email?.[0]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">
                Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <AuthFieldIcon icon={Lock} />
                <Input
                  className="pr-12 pl-11"
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="Create a password"
                  type={showPassword ? "text" : "password"}
                  defaultValue={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  className="pl-11"
                  id="password_confirmation"
                  name="password_confirmation"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  type={showPassword ? "text" : "password"}
                  defaultValue={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  error={!!fieldErrors.password_confirmation}
                  hint={fieldErrors.password_confirmation?.[0]}
                />
              </div>
              {!fieldErrors.password_confirmation && (
                <PasswordMatchHint password={password} confirmation={passwordConfirmation} />
              )}
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="accept_terms" className="mt-0.5 h-5 w-5" checked={isChecked} onChange={setIsChecked} />
              <label
                htmlFor="accept_terms"
                className="cursor-pointer text-sm font-normal text-gray-500 select-none dark:text-gray-400"
              >
                By creating an account you agree to our{" "}
                <span className="font-medium text-gray-800 dark:text-white/90">Terms and Conditions</span> and{" "}
                <span className="font-medium text-gray-800 dark:text-white/90">Privacy Policy</span>.
              </label>
            </div>

            <Button className="h-11 w-full" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </div>
        </form>

        <AuthFooterLink prompt="Already have an account?" href="/signin" label="Sign in" />
      </AuthCard>
    </AuthFormContainer>
  );
}
