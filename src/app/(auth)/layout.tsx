import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { AuthBrandPanel, AuthMobileBrandMark, SignInBrandingProvider } from "@/components/auth/AuthBranding";
import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 bg-white p-6 dark:bg-shell-bg sm:p-0">
      <ThemeProvider>
        {/* Logo, brand color and welcome copy come from Administration > Organization. */}
        <SignInBrandingProvider>
          <div className="relative flex h-screen w-full flex-col justify-center dark:bg-shell-bg lg:flex-row lg:justify-start">
            {/* Mobile brand mark, the brand panel below is hidden under lg, so this keeps it visible on small screens. */}
            <AuthMobileBrandMark />

            {children}

            <AuthBrandPanel />
          </div>
        </SignInBrandingProvider>

        <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </ThemeProvider>
    </div>
  );
}
