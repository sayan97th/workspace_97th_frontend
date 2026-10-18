"use client";
import React from "react";
import NavItemIcon from "@/components/workspace-nav/NavItemIcon";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import WorkspaceBadge from "@/layout/WorkspaceBadge";
import { TextLinesIcon } from "@/icons/board-icons";
import { ChevronRightIcon, LockIcon } from "@/icons/workspace-icons";
import type { SearchOption } from "./searchOptions";

type GlobalSearchOptionRowProps = {
  option: SearchOption;
  option_id: string;
  term: string;
  is_active: boolean;
  onSelect: () => void;
  onHover: () => void;
};

/** Wraps the first case-insensitive occurrence of `term` in `text` so the match stands out. */
export const HighlightedText: React.FC<{ text: string; term: string }> = ({ text, term }) => {
  const match_index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (match_index === -1) return <>{text}</>;

  const match_end = match_index + term.length;
  return (
    <>
      {text.slice(0, match_index)}
      <mark className="global-search__match">{text.slice(match_index, match_end)}</mark>
      {text.slice(match_end)}
    </>
  );
};

const OptionIcon: React.FC<{ option: SearchOption }> = ({ option }) => {
  if (option.kind === "workspace" && option.workspace) {
    return (
      <WorkspaceBadge
        workspace={{
          mono: option.workspace.mono,
          color: option.workspace.color,
          avatar_url: option.workspace.avatar_url ?? undefined,
          is_home: false,
        }}
        size={28}
      />
    );
  }

  return (
    <span className="global-search__option-icon" data-kind={option.kind}>
      {option.nav_icon ? <NavItemIcon source={option.nav_icon} size={16} /> : <TextLinesIcon size={15} />}
    </span>
  );
};

/**
 * One result of the top bar search: a type icon, the name with the typed term
 * highlighted, a breadcrumb (parent item, board, workspace) and a type chip.
 * The active row also shows an Enter key hint.
 */
const GlobalSearchOptionRow: React.FC<GlobalSearchOptionRowProps> = ({
  option,
  option_id,
  term,
  is_active,
  onSelect,
  onHover,
}) => (
  <div
    id={option_id}
    role="option"
    aria-selected={is_active}
    data-active={is_active || undefined}
    // Keep focus on the input so the click doesn't blur and close the list first.
    onMouseDown={(event) => event.preventDefault()}
    onClick={onSelect}
    onMouseMove={is_active ? undefined : onHover}
    className="global-search__option"
  >
    <OptionIcon option={option} />

    <span className="global-search__option-body">
      <span className="global-search__option-label">
        <HighlightedText text={option.label} term={term} />
      </span>
      {option.path.length > 0 && (
        <span className="global-search__option-path">
          {option.path.map((part, index) => (
            <React.Fragment key={`${part}-${index}`}>
              {index > 0 && <ChevronRightIcon size={10} className="global-search__option-path-separator" />}
              <span className="global-search__option-path-part">{part}</span>
            </React.Fragment>
          ))}
        </span>
      )}
    </span>

    {option.is_private && (
      <PortalTooltip content="Private board, only its members can see it">
        <span className="global-search__option-lock" aria-label="Private board">
          <LockIcon size={12} />
        </span>
      </PortalTooltip>
    )}

    {option.caption ? (
      <span className="global-search__option-caption">{option.caption}</span>
    ) : (
      <span className="global-search__option-type">{option.type_label}</span>
    )}

    <kbd className="global-search__option-enter" aria-hidden="true">
      ↵
    </kbd>
  </div>
);

export default GlobalSearchOptionRow;
