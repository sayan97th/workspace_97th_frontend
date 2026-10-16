"use client";
import React, { useEffect, useRef } from "react";
import type { BoardPersonOption } from "../toolbar/types";
import PersonAvatar from "../PersonAvatar";
import FloatingSuggestion from "../doc/editor/menus/FloatingSuggestion";
import { isMentionGroup, mentionOptionLabel, type MentionGroupOption, type MentionOption } from "./mentionOptions";
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

const MENU_WIDTH = 340;
const MENU_MAX_HEIGHT = 360;
const AVATAR_SIZE = 28;

/** Avatar stand-in for a group row: an "@" badge, since a group has no photo. */
const GroupBadge: React.FC = () => (
  <span className="mention-picker__badge" aria-hidden="true">
    @
  </span>
);

const groupSubtitle = (group: MentionGroupOption): string =>
  `${group.kind === "team" ? "Team, notify" : "Notify"} ${group.member_ids.length} ${group.member_ids.length === 1 ? "person" : "people"}`;

/**
 * `@mention` autocomplete card shared by the update composer, every reply
 * box and the "Notify" button, styled after the People column picker: a white
 * card with "Groups" (Everyone and the account teams) and "People in this
 * account" sections, and "Name (Job title)" rows with a 28px photo. Portaled
 * and anchored under the typed `@`, so it never covers the text being typed.
 * The editor keeps focus and owns the keyboard (see `useMentionPickerNavigation`),
 * this only draws the rows and keeps the highlighted one in view.
 */
function MentionPicker<TOption extends MentionOption = BoardPersonOption>({
  people,
  onPick,
  getAnchorRect,
  active_index,
  onHover,
  panel_ref,
  people_title = "People in this account",
}: MentionPickerProps<TOption>) {
  const list_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    list_ref.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active_index, people]);

  const groups = people.filter((option) => isMentionGroup(option));
  const persons = people.filter((option) => !isMentionGroup(option));

  const renderRow = (option: TOption) => {
    const index = people.indexOf(option);
    const is_active = index === active_index;
    const label = mentionOptionLabel(option);
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
      >
        {isMentionGroup(option) ? (
          <GroupBadge />
        ) : (
          <PersonAvatar person={option} size={AVATAR_SIZE} variant="flat" className="mention-picker__avatar" />
        )}
        <span className="mention-picker__text">
          <span className="mention-picker__label" title={label}>
            {label}
          </span>
          {isMentionGroup(option) && <span className="mention-picker__description">{groupSubtitle(option)}</span>}
        </span>
      </button>
    );
  };

  return (
    <FloatingSuggestion getRect={getAnchorRect} width={MENU_WIDTH} max_height={MENU_MAX_HEIGHT} class_name="mention-picker">
      <div ref={panel_ref} className="mention-picker__panel">
        <div ref={list_ref} role="listbox" aria-label="Mention someone" className="mention-picker__list">
          {groups.length > 0 && (
            <div role="group" aria-label="Groups" className="mention-picker__section">
              <div className="mention-picker__section-title">Groups</div>
              {groups.map(renderRow)}
            </div>
          )}
          {persons.length > 0 && (
            <div role="group" aria-label={people_title} className="mention-picker__section">
              <div className="mention-picker__section-title">{people_title}</div>
              {persons.map(renderRow)}
            </div>
          )}
          {people.length === 0 && <div className="mention-picker__empty">No people found</div>}
        </div>
      </div>
    </FloatingSuggestion>
  );
}

export default MentionPicker;
