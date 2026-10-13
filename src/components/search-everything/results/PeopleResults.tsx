"use client";

import { useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/common/UserAvatar";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { CheckIcon, DuplicateIcon, MailIcon, PhoneIcon } from "@/icons/workspace-icons";
import type { PersonResult } from "@/types/search-everything";
import { Highlight } from "../shared";

type PeopleResultsProps = {
  people: PersonResult[];
  term: string;
};

/** Copy button with a "Copied" confirmation in its tooltip for a moment after the click. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [is_copied, setIsCopied] = useState(false);
  const timer_ref = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer_ref.current) window.clearTimeout(timer_ref.current);
  }, []);

  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setIsCopied(true);
      if (timer_ref.current) window.clearTimeout(timer_ref.current);
      timer_ref.current = window.setTimeout(() => setIsCopied(false), 1600);
    });
  };

  return (
    <Tooltip content={is_copied ? "Copied" : label} placement="top">
      <button type="button" onClick={copy} aria-label={label} className="search-everything__copy">
        {is_copied ? <CheckIcon size={13} /> : <DuplicateIcon size={13} />}
      </button>
    </Tooltip>
  );
}

/**
 * "People": a card per person, big photo over the top edge, name, job title,
 * then email and phone with copy buttons. "N/A" when there is no phone.
 */
export default function PeopleResults({ people, term }: PeopleResultsProps) {
  return (
    <div className="search-everything__people-grid">
      {people.map((person) => (
        <div key={person.id} className="search-everything__person">
          <span className="search-everything__person-avatar">
            <UserAvatar user={{ full_name: person.full_name, profile_photo_url: person.photo_url }} size={106} font_size={46} />
          </span>
          <div className="search-everything__person-name" title={person.full_name}>
            <Highlight text={person.full_name} term={term} />
          </div>
          <div className="search-everything__person-title" title={person.job_title ?? undefined}>
            {person.job_title || " "}
          </div>
          <div className="search-everything__person-contacts">
            <div className="search-everything__contact">
              <span className="search-everything__contact-icon" aria-hidden="true">
                <MailIcon size={14} />
              </span>
              <a href={`mailto:${person.email}`} className="search-everything__contact-value" title={person.email}>
                {person.email}
              </a>
              <CopyButton value={person.email} label="Copy email" />
            </div>
            <div className="search-everything__contact">
              <span className="search-everything__contact-icon" aria-hidden="true">
                <PhoneIcon size={14} />
              </span>
              {person.phone ? (
                <>
                  <a href={`tel:${person.phone}`} className="search-everything__contact-value">
                    {person.phone}
                  </a>
                  <CopyButton value={person.phone} label="Copy phone number" />
                </>
              ) : (
                <span className="search-everything__contact-value">N/A</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
