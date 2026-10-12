import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { AuthBrandPanel, AuthMobileBrandMark, SignInBrandingProvider } from "@/components/auth/AuthBranding";
import { ThemeProvider } from "@/context/ThemeContext";
import React from "react";
import "@/components/auth/auth.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      {/* Logo, brand color and welcome copy come from Administration > Organization. */}
      <SignInBrandingProvider>
        {/* Grid with fixed slots: the form column is always column 1 and the brand panel column 2,
            so neither can jump sides while the page renders. */}
        <div className="auth-shell">
          <main className="auth-shell__form-column">
            {/* Mobile brand mark, the brand panel is hidden under lg, so this keeps it visible on small screens. */}
            <AuthMobileBrandMark />

            {children}
          </main>

          <AuthBrandPanel />
        </div>
      </SignInBrandingProvider>

      <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </ThemeProvider>
  );
}
