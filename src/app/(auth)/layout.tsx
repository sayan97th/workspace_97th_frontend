import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import { ThemeProvider } from "@/context/ThemeContext";
import { GanttChart, Layers, Users } from "lucide-react";
import Link from "next/link";
import React from "react";

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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-1 bg-white p-6 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex h-screen w-full flex-col justify-center dark:bg-gray-900 lg:flex-row lg:justify-start">
          {/* Mobile brand mark — the brand panel below is hidden under lg, so this keeps it visible on small screens. */}
          <div className="mx-auto mb-6 w-full max-w-md lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-brand-500 font-outfit text-sm font-bold text-white">
                97
              </span>
              <span className="font-outfit text-sm font-semibold text-gray-800 dark:text-white/90">
                Workspace 97th
              </span>
            </Link>
          </div>

          {children}

          <div className="relative hidden h-full w-1/2 items-center justify-center overflow-hidden bg-[linear-gradient(160deg,var(--color-gray-700)_0%,var(--color-gray-600)_55%,var(--color-gray-500)_100%)] lg:flex">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(108deg,rgba(255,255,255,0.05)_0_2px,transparent_2px_22px)]" />
            <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-brand-500/25 blur-[110px]" />
            <div className="absolute -top-20 -left-16 h-72 w-72 rounded-full bg-sunset-500/15 blur-[110px]" />

            <div className="relative z-1 flex w-full max-w-sm flex-col items-center px-10 text-center">
              <Link
                href="/"
                className="mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-[18px] border-[3px] border-white/10 bg-brand-500 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              >
                <span className="font-outfit text-[38px] font-bold tracking-[-0.03em] text-white">
                  97
                </span>
              </Link>
              <span className="mb-4 font-mono-accent text-xs tracking-[0.14em] text-white/45 uppercase">
                [ workspace 97th ]
              </span>
              <p className="text-xl leading-relaxed font-light text-white/90">
                The workspace that keeps your team&apos;s content, sprints and
                clients in sync.
              </p>

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
              © {new Date().getFullYear()} 97th Floor
            </p>
          </div>
        </div>

        <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </ThemeProvider>
    </div>
  );
}
