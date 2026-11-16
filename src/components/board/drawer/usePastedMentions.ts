"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useBoardPrivacy } from "@/components/board/privacy/BoardPrivacyContext";
import type { BoardPersonOption } from "../toolbar/types";
import { hasMentionText, type UnresolvedMention } from "./pastedMentions";
import type { PastedMentionsNoticeProps } from "./PastedMentionsNotice";
import type { RichTextComposerProps, RichTextComposerRef } from "./RichTextComposer";

const NO_PEOPLE: BoardPersonOption[] = [];

type UsePastedMentionsOptions = {
  /** The composer's Markdown body. */
  markdown: string;
  rich_text_ref: RefObject<RichTextComposerRef | null>;
  /** Who can be tagged, the board roster the `@` picker offers. Empty switches the feature off. */
  people: BoardPersonOption[];
  /** Adds people to the draft's mentions, for a paste and for a "Did you mean" pick alike. */
  onTag: (people: BoardPersonOption[]) => void;
  /** People whose tag went away (their `@Name` left the body), so the composer stops mentioning them. */
  onDropped?: (people: BoardPersonOption[]) => void;
};

/**
 * Everything a composer needs for Slack style pasted mentions: the props for
 * its `RichTextComposer` and for its `PastedMentionsNotice`.
 *
 * - Tags: the people a paste tagged. A tag only lasts while its `@Name` is
 *   still in `markdown`, deleting the text (or sending the draft, which
 *   clears it) drops it and hands it to `onDropped`.
 * - Flags: the pasted `@names` that matched nobody, several people, or
 *   someone not on this private board, as the editor reports them. Picking a
 *   "Did you mean" name rewrites the text and tags that person.
 *
 * A new paste shows the notice again after "Got it" hid it.
 */
export function usePastedMentions({ markdown, rich_text_ref, people, onTag, onDropped }: UsePastedMentionsOptions) {
  const privacy = useBoardPrivacy();
  const [pasted_people, setPastedPeople] = useState<BoardPersonOption[]>([]);
  const [unresolved, setUnresolved] = useState<UnresolvedMention[]>([]);
  const [is_dismissed, setIsDismissed] = useState(false);
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

  const addPastedPeople = (tagged: BoardPersonOption[]) => {
    if (tagged.length === 0) return;
    setPastedPeople((current) => [...current, ...tagged.filter((person) => !current.some((existing) => existing.id === person.id))]);
    callbacks_ref.current.onTag(tagged);
  };

  const handlePasteMentions = (tagged: BoardPersonOption[]) => {
    addPastedPeople(tagged);
    setIsDismissed(false);
  };

  const handleUnresolvedChange = (next: UnresolvedMention[]) => {
    setUnresolved((current) => {
      // A paste that flags something new brings a dismissed notice back.
      if (next.some((mention) => !current.some((existing) => existing.id === mention.id))) setIsDismissed(false);
      return next;
    });
  };

  const is_enabled = people.length > 0;

  const editor_props: Pick<RichTextComposerProps, "mention_people" | "onPasteMentions" | "outside_people" | "onUnresolvedMentionsChange"> = {
    mention_people: people,
    onPasteMentions: is_enabled ? handlePasteMentions : undefined,
    outside_people: privacy.outside_people ?? NO_PEOPLE,
    onUnresolvedMentionsChange: handleUnresolvedChange,
  };

  const notice_props: PastedMentionsNoticeProps = {
    people: is_dismissed ? NO_PEOPLE : pasted_people,
    unresolved: is_dismissed ? [] : unresolved,
    board_people: people,
    onUntag: (person) => rich_text_ref.current?.untagMention(person.name),
    onResolve: (mention, person) => {
      rich_text_ref.current?.resolveUnresolvedMention(mention.id, person);
      addPastedPeople([person]);
    },
    onSendAsText: (mention) => rich_text_ref.current?.dismissUnresolvedMention(mention.id, true),
    onReveal: (mention) => rich_text_ref.current?.revealUnresolvedMention(mention.id),
    onInviteClick: privacy.onInviteClick,
    onDismiss: () => setIsDismissed(true),
  };

  return { editor_props, notice_props };
}
