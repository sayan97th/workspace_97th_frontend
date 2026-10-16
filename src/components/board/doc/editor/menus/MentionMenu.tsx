"use client";
import React, { useMemo } from "react";
import type { BoardPersonOption } from "@/components/board/toolbar/types";
import MentionPicker from "@/components/board/drawer/MentionPicker";
import { getUserInitials } from "@/lib/user";
import { useDocEditor } from "../DocEditorContext";
import type { DocMember } from "../extensions/doc-mention";
import { useSuggestionState } from "../suggestion-store";

/** A doc member in the shape the shared picker draws: string id, initials and a color seed that stays the same while the list filters. */
const toPersonOption = (member: DocMember): BoardPersonOption => ({
  id: String(member.id),
  name: member.full_name,
  initials: getUserInitials(member),
  avatar_seed: member.id,
  avatar_url: member.profile_photo_url ?? undefined,
  job_title: member.job_title?.trim() || undefined,
});

/**
 * The "@" people menu: workspace members filtered by what was typed after
 * "@". Drawn by the comment composer's `MentionPicker`, so a doc and an update
 * offer the same card ("People in this account", "Name (Job title)" rows),
 * anchored under the typed `@`. The Tiptap mention plugin owns the keyboard
 * through `mention_store`, this only maps the rows and forwards the pick.
 */
const MentionMenu: React.FC = () => {
  const { mention_store } = useDocEditor();
  const state = useSuggestionState(mention_store);

  const people = useMemo(() => state.items.map(toPersonOption), [state.items]);

  if (!state.is_open) return null;

  const pickPerson = (person: BoardPersonOption) => {
    const member = state.items.find((item) => String(item.id) === person.id);
    if (member) state.command?.(member);
  };

  return (
    <MentionPicker
      people={people}
      onPick={pickPerson}
      getAnchorRect={state.getRect}
      active_index={state.selected_index}
      onHover={(index) => mention_store.setState({ selected_index: index })}
    />
  );
};

export default MentionMenu;
