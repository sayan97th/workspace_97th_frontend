import React, { useId } from "react";
import { ChevronDownIcon } from "@/icons/workspace-icons";

type HomeSectionProps = {
  title: string;
  /** Badge next to the title, hidden while the list is loading (null). */
  count?: number | null;
  is_collapsed: boolean;
  onToggle: () => void;
  /** Right side of the header, usually a link to the full page. */
  action?: React.ReactNode;
  /** Entrance animation delay in ms, so the cards rise one after another. */
  delay?: number;
  children: React.ReactNode;
};

/** A Home card with a monday style collapsible header (caret, title, count badge). */
const HomeSection: React.FC<HomeSectionProps> = ({ title, count, is_collapsed, onToggle, action, delay = 0, children }) => {
  const body_id = useId();

  return (
    <section className="home-section home-rise" style={{ "--home-delay": `${delay}ms` } as React.CSSProperties}>
      <header className="home-section-header">
        <button type="button" className="home-section-toggle" aria-expanded={!is_collapsed} aria-controls={body_id} onClick={onToggle}>
          <ChevronDownIcon size={16} className="home-section-caret" />
          <h2 className="home-section-title truncate">{title}</h2>
          {count !== undefined && count !== null && <span className="home-count">{count}</span>}
        </button>
        {action}
      </header>
      {!is_collapsed && (
        <div id={body_id} className="home-section-body">
          {children}
        </div>
      )}
    </section>
  );
};

export default HomeSection;
