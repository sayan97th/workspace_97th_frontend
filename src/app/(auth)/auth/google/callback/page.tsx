"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthFormContainer } from "@/components/auth/AuthPrimitives";
import TwoFactorChallengeCard from "@/components/auth/TwoFactorChallengeCard";
import { authService } from "@/services/auth.service";
import { getValidRedirectUrl } from "@/utils/redirect";
import type { ApiError } from "@/types/auth";

type TwoFactorChallenge = {
  two_factor_token: string;
  callback_url: string | null;
};

/**
 * Landing page of the Google sign in. The API sends the browser here with a one
 * time `login_code`, which is traded for a session (or a two factor challenge)
 * so the access token itself never shows up in a URL.
 */
function GoogleCallbackHandler() {
  const search_params = useSearchParams();
  const router = useRouter();
  const [two_factor_challenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

  // The code can only be redeemed once, and React Strict Mode runs effects twice in development.
  const has_exchanged_code = useRef(false);

  useEffect(() => {
    if (has_exchanged_code.current) return;
    has_exchanged_code.current = true;

    const login_code = search_params.get("login_code");
    const error_code = search_params.get("error");

    if (error_code || !login_code) {
      router.replace(`/signin?error=${encodeURIComponent(error_code ?? "google_auth_failed")}`);
      return;
    }

    // Drop the code from the address bar and browser history.
    window.history.replaceState(null, "", window.location.pathname);

    authService
      .exchangeGoogleLoginCode(login_code)
      .then((response) => {
        if ("requires_two_factor" in response && response.requires_two_factor) {
          setTwoFactorChallenge({
            two_factor_token: response.two_factor_token,
            callback_url: response.callback_url,
          });
          return;
        }

        // A full page load so the auth context starts from the freshly stored session.
        window.location.replace(getValidRedirectUrl(response.callback_url));
      })
      .catch((err: unknown) => {
        const api_error = err as ApiError;
        router.replace(`/signin?error=${encodeURIComponent(api_error.code ?? "google_auth_failed")}`);
      });
  }, [search_params, router]);

  if (two_factor_challenge) {
    return (
      <AuthFormContainer back_link={{ href: "/", label: "Back to dashboard" }}>
        <TwoFactorChallengeCard
          two_factor_token={two_factor_challenge.two_factor_token}
          callback_url={two_factor_challenge.callback_url}
          onBack={() => router.replace("/signin")}
        />
      </AuthFormContainer>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Completing sign in with Google...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
