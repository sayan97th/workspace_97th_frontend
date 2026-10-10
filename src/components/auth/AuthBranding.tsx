"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { GanttChart, Layers, Users } from "lucide-react";
import { brandingService } from "@/services/branding.service";
import { applyBrandColor, applyFavicon } from "@/lib/brand-theme";
import type { SignInBrandingDto } from "@/types/branding";

const DEFAULT_COMPANY_NAME = "97th Floor";
const DEFAULT_HEADLINE = "The workspace that keeps your team's content, sprints and clients in sync.";

const brand_highlights = [
  {
    icon: Layers,
    title: "Content in one place",
    description: "Briefs, drafts and approvals live on a single shared timeline.",
  },
  {
    icon: GanttChart,
    title: "Sprints that stay visible",
    description: "Track every sprint's progress without leaving the workspace.",
  },
  {
    icon: Users,
    title: "Clients kept in sync",
    description: "Share status and deliverables with clients as work happens.",
  },
];

const SignInBrandingContext = createContext<SignInBrandingDto | null>(null);

/**
 * Loads the public organization branding (`GET /api/public/branding`) for the sign in, sign up
 * and invitation pages, and repaints the brand color and favicon there too. Until it answers,
 * or when it fails, the default 97th Floor look shows.
 */
export const SignInBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<SignInBrandingDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    brandingService
      .getSignInBranding()
      .then((dto) => {
        if (cancelled) return;
        setBranding(dto);
        applyBrandColor(dto.brand_color);
        applyFavicon(dto.favicon_url);
      })
      .catch(() => {
        // Cosmetic only, the default look stays.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <SignInBrandingContext.Provider value={branding}>{children}</SignInBrandingContext.Provider>;
};

/** The organization logo on a colored tile, or the default "97" mark. */
const LogoTile: React.FC<{ branding: SignInBrandingDto | null; size: "small" | "large" }> = ({ branding, size }) => {
  const is_large = size === "large";
  const tile_class = is_large
    ? "h-[88px] w-[88px] rounded-[18px] border-[3px] border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
    : "h-9 w-9 rounded-[10px]";

  if (branding?.logo_url) {
    return (
      <span className={`flex flex-none items-center justify-center overflow-hidden bg-white ${tile_class} ${is_large ? "p-3" : "p-1"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={branding.logo_url} alt={`${branding.company_name} logo`} className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span className={`flex flex-none items-center justify-center bg-brand-500 ${tile_class}`}>
      <span className={`font-outfit font-bold text-white ${is_large ? "text-[38px] tracking-[-0.03em]" : "text-sm"}`}>97</span>
    </span>
  );
};

/** Brand mark above the form on small screens, where the side panel is hidden. */
export const AuthMobileBrandMark: React.FC = () => {
  const branding = useContext(SignInBrandingContext);

  return (
    <div className="mx-auto mb-6 w-full max-w-md lg:hidden">
      <Link href="/" className="inline-flex items-center gap-2.5">
        <LogoTile branding={branding} size="small" />
        <span className="font-outfit text-sm font-semibold text-gray-800 dark:text-white/90">
          {branding?.company_name ?? "Workspace 97th"}
        </span>
      </Link>
    </div>
  );
};

/** The right hand brand panel of the auth pages, with the organization's logo and welcome copy. */
export const AuthBrandPanel: React.FC = () => {
  const branding = useContext(SignInBrandingContext);
  const company_name = branding?.company_name ?? DEFAULT_COMPANY_NAME;

  return (
    <div className="relative hidden h-full w-1/2 items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--color-gray-700)_0%,var(--color-gray-600)_55%,var(--color-gray-500)_100%)] lg:flex">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(108deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_22px)]" />
      <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-brand-500/25 blur-[110px]" />
      <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-sunset-500/15 blur-[110px]" />

      <div className="relative z-1 flex w-full max-w-sm flex-col items-center px-10 text-center">
        <Link href="/" className="mb-6">
          <LogoTile branding={branding} size="large" />
        </Link>
        <span className="mb-4 font-mono-accent text-xs tracking-[0.14em] text-white/45 uppercase">
          [ {branding ? company_name : "workspace 97th"} ]
        </span>
        <p className="text-xl leading-relaxed font-light text-white/90">{branding?.login_headline || DEFAULT_HEADLINE}</p>
        {branding?.login_message ? (
          <p className="mt-3 text-sm leading-relaxed text-white/60">{branding.login_message}</p>
        ) : null}

        <div className="mt-10 w-full space-y-5 border-t border-white/10 pt-8 text-left">
          {brand_highlights.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-white/10 text-white">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white/90">{title}</p>
                <p className="text-sm text-white/50">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="absolute bottom-6 font-mono-accent text-[11px] tracking-[0.1em] text-white/30">
        © {new Date().getFullYear()} {company_name}
      </p>
    </div>
  );
};
