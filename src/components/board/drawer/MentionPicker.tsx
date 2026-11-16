"use client";
import React, { useEffect, useRef } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import FloatingSuggestion from "../doc/editor/menus/FloatingSuggestion";
import { isMentionGroup, isMentionSuggestion, type MentionGroupOption, type MentionOption } from "./mentionOptions";
import { useBoardPrivacy } from "../privacy/BoardPrivacyContext";
import PrivateBoardNotice from "../privacy/PrivateBoardNotice";
import "./mention-picker.scss";

export type MentionPickerProps<TOption extends MentionOption> = {
  people: TOption[];
  onPick: (option: TOption) => void;
  /**
   * Screen rectangle the card opens under: the typed `@` for a mention, the
   * bell button for "Notify". Flipped above it when there is no room below.
   */
  getAnchorRect: (() => DOMRect | null) | null;
  /** The row the keyboard cursor sits on, omitted when the list is mouse only (the "Notify" picker). */
  active_index?: number;
  onHover?: (index: number) => void;
  /** Wraps the whole card, so a host can tell clicks inside the portaled card from outside ones. */
  panel_ref?: React.Ref<HTMLDivElement>;
  /** Caption above the people rows. */
  people_title?: string;
};

const MENU_WIDTH = 300;
const MENU_MAX_HEIGHT = 360;
const AVATAR_SIZE = 24;

/** Avatar stand-in for a group row: two people in a circle, monday.com's team icon. */
const GroupIcon: React.FC = () => (
  <span className="mention-picker__group-icon" aria-hidden="true">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="9" cy="9.5" r="2.4" fill="currentColor" />
      <circle cx="15.2" cy="9.5" r="2.4" fill="currentColor" />
      <path d="M4.8 17.6c.7-2.4 2.3-3.7 4.2-3.7s3.5 1.3 4.2 3.7" fill="currentColor" />
      <path d="M11 17.6c.7-2.4 2.3-3.7 4.2-3.7s3.5 1.3 4.2 3.7" fill="currentColor" />
    </svg>
  </span>
);

/** The row title of a group: "Everyone on this board", or the team's own name. */
const groupLabel = (group: MentionGroupOption): string =>
  group.kind === "everyone" ? "Everyone on this board" : group.name;

/** The gray note after a group's name: how many people it notifies. */
const groupNote = (group: MentionGroupOption): string =>
  `${group.member_ids.length} ${group.member_ids.length === 1 ? "person" : "people"}`;

/**
 * `@mention` autocomplete card shared by the update composer, every reply
 * box and the "Notify" button, laid out like monday.com's: a white card with
 * a small arrow pointing at the typed `@`, a "People" section ("Name (Job
 * title)" rows, the title in gray, a round 24px photo) and a "Teams" section
 * ("Everyone on this board" and the account teams, with a group icon).
 * People whose name is only a typo away from the query (`@Ernsto`) come last,
 * under "Did you mean", like Slack's mention list. Portaled and anchored
 * under the typed `@`, so it never covers the text being typed. The editor
 * keeps focus and owns the keyboard (see `useMentionPickerNavigation`), this
 * only draws the rows and keeps the highlighted one in view. Rows are drawn
 * in the order they arrive, which is also the keyboard order.
 */
function MentionPicker<TOption extends MentionOption = BoardPersonOption>({
  people,
  onPick,
  getAnchorRect,
  active_index,
  onHover,
  panel_ref,
  people_title = "People",
}: MentionPickerProps<TOption>) {
  const list_ref = useRef<HTMLDivElement>(null);
  const { is_private_board } = useBoardPrivacy();

  useEffect(() => {
    list_ref.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active_index, people]);

  const persons = people.filter((option) => !isMentionGroup(option) && !isMentionSuggestion(option));
  const groups = people.filter((option) => isMentionGroup(option));
  // Names a typo away from what was typed (`@Ernsto`), listed last under their own caption.
  const suggestions = people.filter((option) => isMentionSuggestion(option));

  const renderRow = (option: TOption) => {
    const index = people.indexOf(option);
    const is_active = index === active_index;
    const is_group = isMentionGroup(option);
    const title = is_group ? groupLabel(option) : option.name;
    const note = is_group ? groupNote(option) : option.job_title;
    return (
      <button
        key={option.id}
        type="button"
        role="option"
        aria-selected={is_active}
        data-active={is_active || undefined}
        onClick={() => onPick(option)}
        onMouseMove={() => !is_active && onHover?.(index)}
        className="mention-picker__option"
        // "Name (Job title)" read as one name, the photo and the split spans aside.
        aria-label={note ? `${title} (${note})` : title}
        title={note ? `${title} (${note})` : title}
      >
        {is_group ? <GroupIcon /> : <PersonAvatar person={option} size={AVATAR_SIZE} className="mention-picker__avatar" />}
        <span className="mention-picker__text">
          <span className="mention-picker__label">{title}</span>
          {note && <span className="mention-picker__note">({note})</span>}
        </span>
      </button>
    );
  };

  const renderSection = (title: string, options: TOption[]) =>
    options.length > 0 && (
      <div role="group" aria-label={title} className="mention-picker__section">
        <div className="mention-picker__section-title">{title}</div>
        {options.map(renderRow)}
      </div>
    );

  return (
    <FloatingSuggestion
      getRect={getAnchorRect}
      width={MENU_WIDTH}
      max_height={MENU_MAX_HEIGHT}
      class_name="mention-picker"
      arrow_class_name="mention-picker-arrow"
    >
      <div ref={panel_ref} className="mention-picker__panel">
        <div ref={list_ref} role="listbox" aria-label="Mention someone" className="mention-picker__list">
          {renderSection(people_title, persons)}
          {renderSection("Teams", groups)}
          {renderSection(persons.length > 0 ? "Did you also mean" : "No exact match. Did you mean", suggestions)}
          {people.length === 0 && <div className="mention-picker__empty">No people found</div>}
        </div>
        {is_private_board && <PrivateBoardNotice variant="inline" message="Private board. Only people on this board are notified." />}
      </div>
    </FloatingSuggestion>
  );
}

export default MentionPicker;
