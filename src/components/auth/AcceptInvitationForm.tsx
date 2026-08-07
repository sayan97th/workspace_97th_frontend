"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { invitationService } from "@/services/invitation.service";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";
import type { InvitationPreview } from "@/types/invitation";

type Props = {
  code: string;
};

type PreviewState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "loaded"; preview: InvitationPreview };

export default function AcceptInvitationForm({ code }: Props) {
  const router = useRouter();
  const { acceptInvitation } = useAuth();

  const [preview_state, setPreviewState] = useState<PreviewState>({ status: "loading" });
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [password_confirmation, setPasswordConfirmation] = useState("");
  const [show_password, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [field_errors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [is_submitting, setIsSubmitting] = useState(false);
  const [is_declining, setIsDeclining] = useState(false);
  const [is_declined, setIsDeclined] = useState(false);

  useEffect(() => {
    let cancelled = false;
    invitationService
      .previewInvitation(code)
      .then((preview) => {
        if (!cancelled) setPreviewState({ status: "loaded", preview });
      })
      .catch(() => {
        if (!cancelled) setPreviewState({ status: "not_found" });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const passwords_match = password_confirmation.length > 0 && password === password_confirmation;
  const passwords_mismatch = password_confirmation.length > 0 && password !== password_confirmation;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (preview_state.status !== "loaded") return;

    setError("");
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      if (preview_state.preview.account_exists) {
        await acceptInvitation(code, { password });
      } else {
        await acceptInvitation(code, {
          first_name,
          last_name,
          password,
          password_confirmation,
        });
      }
      router.push(getValidRedirectUrl(null));
    } catch (err: unknown) {
      const api_error = err as ApiError;
      if (api_error.errors) setFieldErrors(api_error.errors);
      setError(api_error.message || "We couldn't accept that invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    try {
      await invitationService.declineInvitation(code);
      setIsDeclined(true);
    } catch {
      setError("We couldn't decline that invitation. Please try again.");
    } finally {
      setIsDeclining(false);
    }
  };

  return (
    <div className="no-scrollbar flex w-full flex-col overflow-y-auto lg:w-1/2 lg:flex-1">
      <div className="mx-auto w-full max-w-md pb-10 sm:pt-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-shell-border dark:bg-shell-panel sm:p-8">
          {preview_state.status === "loading" && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-shell-text-muted" />
            </div>
          )}

          {preview_state.status === "not_found" && (
            <div className="text-center">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">
                Invitation not found
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This invitation link is invalid. Ask whoever invited you to send a new one.
              </p>
            </div>
          )}

          {preview_state.status === "loaded" && preview_state.preview.status === "expired" && (
            <div className="text-center">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">
                Invitation expired
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This invitation to join {preview_state.preview.workspace.name} has expired. Ask
                the person who invited you to send a new one.
              </p>
            </div>
          )}

          {preview_state.status === "loaded" && preview_state.preview.status === "accepted" && (
            <div className="text-center">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">
                Already accepted
              </h1>
              <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                This invitation has already been accepted.
              </p>
              <Link
                href="/signin"
                className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Go to sign in
              </Link>
            </div>
          )}

          {preview_state.status === "loaded" && is_declined && (
            <div className="text-center">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">
                Invitation declined
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You won&apos;t join {preview_state.preview.workspace.name}.
              </p>
            </div>
          )}

          {preview_state.status === "loaded" &&
            preview_state.preview.status === "pending" &&
            !is_declined && (
              <>
                <div className="mb-6 flex items-center gap-3 sm:mb-8">
                  <span
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: preview_state.preview.workspace.color }}
                  >
                    {preview_state.preview.workspace.mono}
                  </span>
                  <div>
                    <h1 className="font-semibold text-gray-800 text-title-sm dark:text-white/90">
                      Join {preview_state.preview.workspace.name}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {preview_state.preview.inviter_name} invited you as{" "}
                      <span className="font-medium text-gray-700 dark:text-shell-text-secondary">
                        {preview_state.preview.role_label}
                      </span>
                      .
                    </p>
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
                    {!preview_state.preview.account_exists && (
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                          <Label>
                            First Name<span className="text-error-500">*</span>
                          </Label>
                          <div className="relative">
                            <User className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                            <Input
                              className="pl-11"
                              type="text"
                              placeholder="First name"
                              defaultValue={first_name}
                              onChange={(event) => setFirstName(event.target.value)}
                              error={!!field_errors.first_name}
                              hint={field_errors.first_name?.[0]}
                            />
                          </div>
                        </div>
                        <div className="sm:col-span-1">
                          <Label>
                            Last Name<span className="text-error-500">*</span>
                          </Label>
                          <div className="relative">
                            <User className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                            <Input
                              className="pl-11"
                              type="text"
                              placeholder="Last name"
                              defaultValue={last_name}
                              onChange={(event) => setLastName(event.target.value)}
                              error={!!field_errors.last_name}
                              hint={field_errors.last_name?.[0]}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>{preview_state.preview.email}</Label>
                    </div>

                    <div>
                      <Label>
                        Password<span className="text-error-500">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                        <Input
                          className="pl-11"
                          placeholder={
                            preview_state.preview.account_exists
                              ? "Enter your password"
                              : "Create a password"
                          }
                          type={show_password ? "text" : "password"}
                          defaultValue={password}
                          onChange={(event) => setPassword(event.target.value)}
                          error={!!field_errors.password}
                          hint={field_errors.password?.[0]}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={show_password ? "Hide password" : "Show password"}
                          className="absolute top-1/2 right-3.5 z-10 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600 dark:text-shell-text-muted dark:hover:text-shell-text-secondary"
                        >
                          {show_password ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {!preview_state.preview.account_exists && (
                      <div>
                        <Label>
                          Confirm Password<span className="text-error-500">*</span>
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                          <Input
                            className="pl-11"
                            placeholder="Repeat your password"
                            type={show_password ? "text" : "password"}
                            defaultValue={password_confirmation}
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                            error={!!field_errors.password_confirmation}
                            hint={field_errors.password_confirmation?.[0]}
                          />
                        </div>
                        {!field_errors.password_confirmation &&
                          (passwords_match || passwords_mismatch) && (
                            <p
                              className={`mt-1.5 flex items-center gap-1.5 text-xs ${
                                passwords_match ? "text-success-500" : "text-error-500"
                              }`}
                            >
                              {passwords_match ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <X className="h-3.5 w-3.5" />
                              )}
                              {passwords_match ? "Passwords match" : "Passwords do not match"}
                            </p>
                          )}
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Button className="w-full" size="sm" disabled={is_submitting}>
                        {is_submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Joining…
                          </>
                        ) : (
                          "Accept invitation"
                        )}
                      </Button>
                    </div>

                    <button
                      type="button"
                      onClick={handleDecline}
                      disabled={is_declining}
                      className="w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-700 disabled:opacity-60 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      {is_declining ? "Declining…" : "No thanks, decline this invitation"}
                    </button>
                  </div>
                </form>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
