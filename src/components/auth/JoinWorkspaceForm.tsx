"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { workspaceInviteLinkService } from "@/services/workspace-invite-link.service";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";
import type { WorkspaceJoinLinkPreview } from "@/types/invitation";

type Props = {
  code: string;
};

type PreviewState =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "loaded"; preview: WorkspaceJoinLinkPreview };

/** Whether the joiner is creating a brand-new account or authenticating an existing one. A shareable link isn't addressed to one email, so, unlike the single-invitation accept form, this can't be known ahead of time and is picked by the person joining. */
type JoinMode = "signup" | "login";

export default function JoinWorkspaceForm({ code }: Props) {
  const router = useRouter();
  const { joinWorkspaceByLink } = useAuth();

  const [preview_state, setPreviewState] = useState<PreviewState>({ status: "loading" });
  const [mode, setMode] = useState<JoinMode>("signup");
  const [email, setEmail] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [password_confirmation, setPasswordConfirmation] = useState("");
  const [show_password, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [field_errors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [is_submitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    workspaceInviteLinkService
      .previewJoinLink(code)
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      if (mode === "login") {
        await joinWorkspaceByLink(code, { email, password });
      } else {
        await joinWorkspaceByLink(code, {
          email,
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
      setError(api_error.message || "We couldn't join that workspace. Please try again.");
    } finally {
      setIsSubmitting(false);
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
                Link not found
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This invite link is invalid. Ask a member of the workspace for a new one.
              </p>
            </div>
          )}

          {preview_state.status === "loaded" && !preview_state.preview.enabled && (
            <div className="text-center">
              <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90">
                This link is no longer active
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Link invites for {preview_state.preview.workspace.name} have been turned off. Ask a
                member of the workspace to invite you by email instead.
              </p>
            </div>
          )}

          {preview_state.status === "loaded" && preview_state.preview.enabled && (
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
                    You&apos;ll join as a{" "}
                    <span className="font-medium text-gray-700 dark:text-shell-text-secondary">
                      {preview_state.preview.role_label}
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="mb-6 flex rounded-lg border border-gray-200 p-1 dark:border-shell-border">
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    mode === "signup"
                      ? "bg-brand-500 text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  I&apos;m new here
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    mode === "login"
                      ? "bg-brand-500 text-white"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  I already have an account
                </button>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-error-200 bg-error-50 p-3 text-sm text-error-600 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
                  <AlertCircle className="h-4 w-4 flex-none translate-y-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {mode === "signup" && (
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
                    <Label>
                      Email<span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                      <Input
                        className="pl-11"
                        type="email"
                        placeholder="name@company.com"
                        defaultValue={email}
                        onChange={(event) => setEmail(event.target.value)}
                        error={!!field_errors.email}
                        hint={field_errors.email?.[0]}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>
                      Password<span className="text-error-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3.5 z-10 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-shell-text-muted" />
                      <Input
                        className="pl-11"
                        placeholder={mode === "login" ? "Enter your password" : "Create a password"}
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

                  {mode === "signup" && (
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
                    </div>
                  )}

                  <Button className="w-full" size="sm" disabled={is_submitting}>
                    {is_submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining…
                      </>
                    ) : (
                      `Join ${preview_state.preview.workspace.name}`
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
