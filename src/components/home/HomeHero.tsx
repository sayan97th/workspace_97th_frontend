import React from "react";
import Link from "next/link";
import UserAvatar from "@/components/common/UserAvatar";
import { CalendarViewIcon } from "@/icons/board-icons";
import { BellIcon, InviteIcon, SearchIcon } from "@/icons/workspace-icons";
import { useShortcutLabel } from "@/hooks/useShortcutLabel";
import { openShellPanel } from "@/layout/shell-events";
import type { User } from "@/types/auth";
import { greetingFor } from "./homeSummary";

type HomeHeroProps = {
  user: User | null;
  today: Date;
  /** One line recap of the day, null while My work and the inbox load. */
  recap: string | null;
};

/** The monday group colors the illustration's board rows use. */
const ART_GROUPS = [
  { color: "#579bfc", widths: [118, 84] },
  { color: "#a25ddc", widths: [96, 128] },
  { color: "#00c875", widths: [132, 70] },
];

/**
 * A small floating board drawn in SVG: three groups with colored rows, a done
 * badge and a bell, so the welcome card feels like the product itself.
 */
const HeroArt: React.FC = () => (
  <svg className="home-hero-art" viewBox="0 0 340 190" fill="none" aria-hidden="true">
    <circle cx="300" cy="28" r="40" fill="var(--home-brand)" opacity="0.12" />
    <circle cx="36" cy="168" r="26" fill="#579bfc" opacity="0.12" />
    <g className="home-float">
      <rect x="40" y="18" width="250" height="150" rx="14" fill="var(--home-art-card)" stroke="var(--home-art-line)" />
      <rect x="58" y="34" width="70" height="8" rx="4" fill="var(--home-text)" opacity="0.75" />
      <rect x="134" y="34" width="34" height="8" rx="4" fill="var(--home-art-line)" />
      {ART_GROUPS.map((group, group_index) => {
        const top = 56 + group_index * 36;
        return (
          <g key={group.color}>
            <rect x="58" y={top} width="4" height="28" rx="2" fill={group.color} />
            {group.widths.map((width, row_index) => (
              <g key={width}>
                <rect x="68" y={top + row_index * 15} width={width} height="11" rx="3" fill="var(--home-art-line)" />
                <rect x="210" y={top + row_index * 15} width="58" height="11" rx="3" fill={group.color} opacity={row_index === 0 ? 1 : 0.55} />
              </g>
            ))}
          </g>
        );
      })}
    </g>
    <g className="home-float" style={{ "--home-delay": "-2s" } as React.CSSProperties}>
      <circle cx="292" cy="150" r="20" fill="#00c875" />
      <path d="M283 150 l6 6 l11 -12" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g className="home-float" style={{ "--home-delay": "-4s" } as React.CSSProperties}>
      <rect x="14" y="40" width="44" height="44" rx="12" fill="var(--home-brand)" />
      <path d="M36 51 c-5 0 -8 3.6 -8 8.4 v5 l-2.6 4.6 h21.2 l-2.6 -4.6 v-5 c0 -4.8 -3 -8.4 -8 -8.4 z" fill="#ffffff" />
      <circle cx="36" cy="72.5" r="2.6" fill="#ffffff" />
    </g>
  </svg>
);

/** The welcome card: date, greeting, the day's recap and quick actions into the top bar's panels. */
const HomeHero: React.FC<HomeHeroProps> = ({ user, today, recap }) => {
  const shortcut_label = useShortcutLabel();
  const first_name = user?.first_name?.trim();

  return (
    <section className="home-hero home-rise" aria-labelledby="home-hero-title">
      <HeroArt />
      <div className="home-hero-content">
        <div className="flex items-center gap-4">
          {user && (
            <span className="hidden flex-none rounded-full ring-4 ring-[var(--home-surface)] sm:block">
              <UserAvatar user={user} size={56} font_size={20} />
            </span>
          )}
          <div className="min-w-0">
            <p className="home-hero-date">{today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 id="home-hero-title" className="home-hero-title font-heading">
              {greetingFor(today)}
              {first_name ? `, ${first_name}` : ""}!
            </h1>
          </div>
        </div>
        <p className="home-hero-recap" aria-live="polite">
          {recap ?? "Getting your day ready..."}
        </p>

      </div>
    </section>
  );
};

export default HomeHero;
