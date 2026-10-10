"use client";
import React from "react";
import { FileText, Mail, MessageCircle, Users, Webhook } from "lucide-react";
import ExternalAppLogo from "@/components/integrations/ExternalAppLogo";
import { useAccountBranding } from "@/hooks/useAccountBranding";
import { RECIPE_APP_LABELS, titleParts, type AutomationRecipe, type RecipeApp, type RecipeColumnNeed } from "./automationTemplates";

export type RecipeCardProps = {
  recipe: AutomationRecipe;
  /** Columns the table still needs for this recipe, shown under the sentence. */
  missing?: RecipeColumnNeed[];
  onUse: (recipe: AutomationRecipe) => void;
};

/** A logo inside the light outlined hexagon of monday's template cards. */
function HexBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative flex h-[34px] w-[31px] flex-none items-center justify-center">
      <svg viewBox="0 0 31 34" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d="M15.5 1.5 L29 9.25 L29 24.75 L15.5 32.5 L2 24.75 L2 9.25 Z" className="fill-boardtree-surface stroke-boardtree-border" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="relative flex items-center justify-center">{children}</span>
    </span>
  );
}

/** The board's own end of the chain, the account logo like monday's colourful mark. */
function WorkspaceMark() {
  const { logo_url } = useAccountBranding();
  return (
    <HexBadge>
      {logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo_url} alt="" className="h-[15px] w-[15px] object-contain" />
      ) : (
        <span className="flex h-[15px] w-[15px] items-center justify-center rounded-[4px] bg-brand-500 text-[7px] font-bold text-white">97</span>
      )}
    </HexBadge>
  );
}

const LUCIDE_APP_ICONS: Partial<Record<RecipeApp, React.ReactNode>> = {
  email: <Mail size={14} />,
  slack: <MessageCircle size={14} />,
  webhook: <Webhook size={14} />,
  form: <FileText size={14} />,
  team: <Users size={14} />,
};

/** One outside app of the chain: its logo and, for the integrations, its name in grey. */
function AppBadge({ app }: { app: RecipeApp }) {
  const is_integration = app === "gmail" || app === "outlook" || app === "google_calendar";
  return (
    <span className="flex items-center gap-1.5" title={RECIPE_APP_LABELS[app]}>
      <HexBadge>{is_integration ? <ExternalAppLogo app={app} size={15} /> : <span className="text-boardtree-text-secondary">{LUCIDE_APP_ICONS[app]}</span>}</HexBadge>
      {is_integration && <span className="text-[12.5px] text-boardtree-text-faint">{RECIPE_APP_LABELS[app]}</span>}
    </span>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 16 12" width="14" height="11" className="flex-none text-[#00a359]" aria-hidden="true">
    <path d="M1 6 H14 M9.5 1.5 L14 6 L9.5 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * One gallery recipe as a monday.com template card: the board to app chain (app to board when the
 * app sets it off), the sentence with its highlighted words, and "Use template".
 */
export default function RecipeCard({ recipe, missing = [], onUse }: RecipeCardProps) {
  const plain_title = recipe.title.replaceAll("**", "");
  const apps = recipe.apps.map((app) => <AppBadge key={app} app={app} />);
  const chain = recipe.apps.length === 0 ? [<WorkspaceMark key="board" />] : recipe.flows_in ? [...apps, <WorkspaceMark key="board" />] : [<WorkspaceMark key="board" />, ...apps];

  return (
    <article className="flex min-h-[255px] flex-col rounded-[8px] border border-boardtree-border bg-boardtree-surface p-4 transition-shadow hover:shadow-[0_6px_18px_rgba(30,34,55,0.10)]">
      <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
        {chain.map((entry, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Arrow />}
            {entry}
          </React.Fragment>
        ))}
      </div>
      <p className="mt-9 text-[18px] font-light leading-[1.5] text-boardtree-text">
        {titleParts(recipe.title).map((part, index) => (part.is_bold ? <strong key={index} className="font-semibold">{part.text}</strong> : <span key={index}>{part.text}</span>))}
      </p>
      {missing.length > 0 && <p className="mt-2 text-[12px] text-boardtree-text-faint">Needs {missing.map((need) => `a ${need.label} column`).join(", ")}</p>}
      <span className="flex-1" />
      <button
        type="button"
        onClick={() => onUse(recipe)}
        aria-label={`Use template: ${plain_title}`}
        className="mt-4 h-8 w-full rounded-[4px] border border-boardtree-border text-[13px] text-boardtree-text hover:bg-boardtree-hover"
      >
        Use template
      </button>
    </article>
  );
}

/** monday's last card of a category, a dashed box that opens a blank automation. */
export function CustomRecipeCard({ onCustom }: { onCustom: () => void }) {
  return (
    <button
      type="button"
      onClick={onCustom}
      className="flex min-h-[255px] flex-col items-center justify-center gap-4 rounded-[8px] border-2 border-dashed border-boardtree-border bg-boardtree-surface p-4 text-center transition-colors hover:border-boardtree-accent/60 hover:bg-boardtree-hover/40"
    >
      <svg viewBox="0 0 32 32" width="34" height="34" className="text-boardtree-text" aria-hidden="true">
        <rect x="6" y="9" width="20" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16 4 V9 M11 16 V18 M21 16 V18 M3 15 V19 M29 15 V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-[18px] font-normal text-boardtree-text">Can&apos;t find the right automation?</span>
      <span className="text-[13px] text-boardtree-accent">Create a custom automation</span>
    </button>
  );
}
