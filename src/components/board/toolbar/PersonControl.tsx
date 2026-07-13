"use client";
import React, { useRef, useState } from "react";
import { PersonIcon } from "@/icons/workspace-icons";
import { AVATAR_GRADIENTS } from "../TeamAvatars";
import type { BoardToolbarApi } from "./types";
import BoardPopover from "./BoardPopover";
import ToolbarButton from "./ToolbarButton";

export type PersonControlProps<TRow> = {
  toolbar: BoardToolbarApi<TRow>;
};

function PersonControl<TRow>({ toolbar }: PersonControlProps<TRow>) {
  const button_ref = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const is_open = toolbar.active_panel === "person";

  const filtered_persons = toolbar.persons.filter((person) =>
    person.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <ToolbarButton
        ref={button_ref}
        label="Person"
        Icon={PersonIcon}
        is_open={is_open}
        has_selection={toolbar.selected_person_ids.length > 0}
        badge_count={toolbar.selected_person_ids.length || undefined}
        onClick={() => toolbar.togglePanel("person")}
      />
      <BoardPopover anchor_el={button_ref.current} is_open={is_open} onClose={toolbar.closePanel} width={320}>
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 pb-3 pt-3.5">
          <span className="text-[14px] font-bold text-[#f2f4fb]">Filter this board by person</span>
        </div>
        <div className="p-3">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="mb-3 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[13px] text-[#e9eded] placeholder:text-[#7f88ac] focus:outline-none"
          />
          <div className="grid grid-cols-5 gap-2.5">
            {filtered_persons.map((person) => {
              const is_selected = toolbar.selected_person_ids.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  title={person.name}
                  onClick={() => toolbar.togglePersonId(person.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold text-white transition-shadow"
                  style={{
                    background: AVATAR_GRADIENTS[person.avatar_seed % AVATAR_GRADIENTS.length],
                    boxShadow: is_selected ? "0 0 0 2px #e53e2e" : "none",
                  }}
                >
                  {person.initials}
                </button>
              );
            })}
          </div>
          {toolbar.selected_person_ids.length > 0 && (
            <button
              type="button"
              onClick={toolbar.clearPersonFilter}
              className="mt-3 text-[13px] font-medium text-[#9aa2c4] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </BoardPopover>
    </>
  );
}

export default PersonControl;
