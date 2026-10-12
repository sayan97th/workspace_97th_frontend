"use client";
import React from "react";
import UserAvatar from "@/components/common/UserAvatar";
import { useDocEditor } from "../DocEditorContext";
import { useSuggestionState } from "../suggestion-store";
import FloatingSuggestion from "./FloatingSuggestion";

/** The "@" people menu: workspace members filtered by what was typed after "@". */
const MentionMenu: React.FC = () => {
  const { mention_store } = useDocEditor();
  const state = useSuggestionState(mention_store);

  if (!state.is_open) return null;

  return (
    <FloatingSuggestion getRect={state.getRect} width={280} max_height={320}>
      <div role="listbox" aria-label="Mention a person" className="doc-menu-list">
        <div className="doc-menu-section">
          <div className="doc-menu-section-label">People</div>
          {state.items.length === 0 ? (
            <div className="doc-menu-empty">No people found</div>
          ) : (
            state.items.map((member, index) => (
              <button
                key={member.id}
                type="button"
                role="option"
                aria-selected={index === state.selected_index}
                data-selected={index === state.selected_index}
                className="doc-menu-row"
                onMouseEnter={() => mention_store.setState({ selected_index: index })}
                onClick={() => state.command?.(member)}
              >
                <UserAvatar user={member} size={24} font_size={10} />
                <span className="doc-menu-row-label truncate">{member.full_name}</span>
                {member.job_title && <span className="doc-menu-row-shortcut truncate">{member.job_title}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </FloatingSuggestion>
  );
};

export default MentionMenu;
