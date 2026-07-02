"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setToken } from "@/lib/api-client";
import { authService } from "@/services/auth.service";
import { Suspense } from "react";

function GoogleCallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get("token");
    const expiresIn = searchParams.get("expires_in");
    const error = searchParams.get("error");

    if (error === "account_disabled") {
      router.replace("/signin?error=account_disabled");
      return;
    }

    if (error || !token) {
      router.replace("/signin?error=google_auth_failed");
      return;
    }

    setToken(token);

    if (expiresIn) {
      const expiresAt = Date.now() + parseInt(expiresIn, 10) * 1000;
      localStorage.setItem("token_expires_at", expiresAt.toString());
    }

    authService
      .getMe()
      .then(() => {
        window.location.replace("/");
      })
      .catch(() => {
        window.location.replace("/");
      });
  }, [searchParams, router]);

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
