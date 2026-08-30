"use client";

import { useRef } from "react";
import Avatar from "./Avatar";
import { BellNotifyIcon, CheckIcon, CloseIcon, SparkleIcon } from "./icons";
import type { Person } from "./types";
import { useOutsideClick } from "./useOutsideClick";

interface OwnerMenuProps {
  people: Person[];
  owner_ids: string[];
  onToggleOwner: (person_id: string) => void;
  onClearOwners: () => void;
  onClose: () => void;
  top_offset_px: number;
}

const OwnerMenu = ({ people, owner_ids, onToggleOwner, onClearOwners, onClose, top_offset_px }: OwnerMenuProps) => {
  const menu_ref = useRef<HTMLDivElement>(null);
  useOutsideClick(menu_ref, true, onClose);
  const people_by_id = new Map(people.map((person) => [person.id, person]));

  return (
    <div
      ref={menu_ref}
      className="absolute left-1/2 z-[60] w-[320px] -translate-x-1/2 rounded-[10px] border border-[#e3e6ef] bg-white p-3 text-left shadow-[0_16px_40px_rgba(30,34,55,0.20)]"
      style={{ top: top_offset_px }}
    >
      <div className="flex items-center gap-2 rounded-[6px] border border-[#dfe3ef] px-2 py-[7px]">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {owner_ids.length ? (
            owner_ids.map((person_id) => (
              <div key={person_id} className="flex items-center gap-1.5 rounded bg-[#eaf0ff] px-[7px] py-[3px] text-[11.5px] font-medium text-[#3a52c8]">
                {people_by_id.get(person_id)?.initials ?? person_id}
              </div>
            ))
          ) : (
            <div className="text-xs text-[#a4aac2]">Search names</div>
          )}
        </div>
        <button type="button" onClick={onClearOwners} className="flex h-[18px] w-[18px] items-center justify-center text-[#a4aac2] hover:text-[#4a5068]">
          <CloseIcon />
        </button>
      </div>

      <div className="px-0.5 pb-1.5 pt-3 text-xs text-[#8b90a6]">Suggested people</div>
      <div className="flex max-h-[240px] flex-col gap-0.5 overflow-y-auto">
        {people.length === 0 && <div className="px-2 py-3 text-center text-[12.5px] text-[#a4aac2]">No members to assign.</div>}
        {people.map((person) => {
          const is_assigned = owner_ids.includes(person.id);
          return (
            <button
              type="button"
              key={person.id}
              onClick={() => onToggleOwner(person.id)}
              className="flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 hover:bg-[#f4f6fb]"
            >
              <Avatar initials={person.initials} background_color={person.avatar_bg} size_px={26} overlap={false} />
              <div className="flex-1 text-left text-[13px] text-[#262b45]">{person.name}</div>
              {is_assigned && (
                <div className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-[#4f6bed]">
                  <CheckIcon />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-[6px] bg-[#dfeaff] px-[10px] py-[9px] text-[12.5px] text-[#2a3f9c]">
        <BellNotifyIcon />
        Assignees will be notified
      </div>
      <div className="mt-2.5 h-px bg-[#eceef5]" />
      <button type="button" className="flex h-[38px] w-full items-center justify-center gap-2 text-[13px] text-[#4a5068] hover:text-[#4f6bed]">
        <SparkleIcon />
        Auto-assign people
      </button>
    </div>
  );
};

export default OwnerMenu;
