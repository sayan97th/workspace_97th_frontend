"use client";
import { useEffect, useRef, useState } from "react";
import { useBoardPrivacy } from "@/components/board/privacy/BoardPrivacyContext";
import type { BoardPersonOption } from "../toolbar/types";
import { hasMentionText } from "./pastedMentions";
import type { RichTextComposerProps } from "./RichTextComposer";

const NO_PEOPLE: BoardPersonOption[] = [];

type UsePastedMentionsOptions = {
  /** The composer's Markdown body. */
  markdown: string;
  /** Who can be tagged, the board roster the `@` picker offers. Empty switches the feature off. */
  people: BoardPersonOption[];
  /** Adds people to the draft's mentions, for a paste and for a "Did you mean" pick alike. */
  onTag: (people: BoardPersonOption[]) => void;
  /** People whose tag went away (their `@Name` left the body), so the composer stops mentioning them. */
  onDropped?: (people: BoardPersonOption[]) => void;
};

/**
 * The `RichTextComposer` props for Slack style pasted mentions. People a
 * paste (or a "Did you mean" pick in the editor's popover) tagged are kept
 * only while their `@Name` is still in `markdown`: deleting the text, or
 * sending the draft, which clears it, drops them and hands them to
 * `onDropped`, so the composer stops mentioning them too. Inside a private
 * board, workspace members left out of it are passed along so the editor can
 * flag them and offer "Invite to board".
 */
export function usePastedMentions({ markdown, people, onTag, onDropped }: UsePastedMentionsOptions) {
  const privacy = useBoardPrivacy();
  const [pasted_people, setPastedPeople] = useState<BoardPersonOption[]>([]);
  const callbacks_ref = useRef({ onTag, onDropped });

  useEffect(() => {
    callbacks_ref.current = { onTag, onDropped };
  });

  useEffect(() => {
    if (pasted_people.length === 0) return;
    const dropped = pasted_people.filter((person) => !hasMentionText(markdown, person.name));
    if (dropped.length === 0) return;
    setPastedPeople((current) => current.filter((person) => !dropped.includes(person)));
    callbacks_ref.current.onDropped?.(dropped);
  }, [markdown, pasted_people]);

  const handlePasteMentions = (tagged: BoardPersonOption[]) => {
    if (tagged.length === 0) return;
    setPastedPeople((current) => [...current, ...tagged.filter((person) => !current.some((existing) => existing.id === person.id))]);
    callbacks_ref.current.onTag(tagged);
  };

  const editor_props: Pick<RichTextComposerProps, "mention_people" | "onPasteMentions" | "outside_people" | "onInviteToBoard"> = {
    mention_people: people,
    onPasteMentions: people.length > 0 ? handlePasteMentions : undefined,
    outside_people: privacy.outside_people ?? NO_PEOPLE,
    onInviteToBoard: privacy.onInviteClick,
  };

  return { editor_props };
}
