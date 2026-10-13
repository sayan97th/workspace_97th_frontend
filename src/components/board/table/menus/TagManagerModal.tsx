"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CloseIcon, PlusIcon } from "@/icons/board-icons";
import { DeleteIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { boardTreeFontClassName } from "../../board-tree-font";
import type { TagDef } from "../types";
import { STATUS_PALETTE } from "../constants";
import { formatTagLabel, tagSearchKey } from "../tagLabels";
import OptionLabelInput from "./OptionLabelInput";
import "./label-editor-modal.css";
import "./tags-picker.css";

interface TagManagerModalProps {
  tag_defs: TagDef[];
  onColor: (id: string, color: string) => void;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onAdd: (label: string) => void;
  onClose: () => void;
}

const itemCountLabel = (count: number): string => `${count} ${count === 1 ? "item" : "items"}`;

/**
 * "Manage tags" dialog opened from a Tags cell picker: search, recolor,
 * rename and delete the tags, or add a new one. Public tags shared from other
 * boards are marked, since editing them changes them everywhere. Deleting a
 * tag that items still use asks first. Shares the "Edit labels" dialog's
 * look (`label-editor-modal.css`), its extras live in `tags-picker.css`.
 * Escape closes the color grid or the delete prompt first, then the dialog.
 */
export default function TagManagerModal({ tag_defs, onColor, onRename, onDelete, onAdd, onClose }: TagManagerModalProps) {
  const [color_picker_id, setColorPickerId] = useState<string | null>(null);
  const [confirm_delete_id, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  const search_key = tagSearchKey(search);
  const visible_tags = tag_defs.filter((tag) => tagSearchKey(tag.label).includes(search_key));
  const draft_label = formatTagLabel(draft);
  const is_duplicate_draft = tag_defs.some((tag) => tagSearchKey(tag.label) === tagSearchKey(draft));
  const can_add = draft_label !== "" && !is_duplicate_draft;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (color_picker_id) setColorPickerId(null);
      else if (confirm_delete_id) setConfirmDeleteId(null);
      else onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [color_picker_id, confirm_delete_id, onClose]);

  const requestDelete = (tag: TagDef) => {
    setColorPickerId(null);
    if ((tag.usage_count ?? 0) > 0 || tag.is_shared) setConfirmDeleteId(tag.id);
    else onDelete(tag.id);
  };

  const handleAdd = (event: FormEvent) => {
    event.preventDefault();
    if (!can_add) return;
    onAdd(draft_label);
    setDraft("");
  };

  return (
    <div className={`label-editor ${boardTreeFontClassName}`} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Manage tags" onClick={(e) => e.stopPropagation()} className="label-editor__card">
        <div className="label-editor__header">
          <h2 className="label-editor__title">Manage tags</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="label-editor__icon-button">
            <CloseIcon size={16} />
          </button>
        </div>
        <p className="tag-manager__intro">Public tags are shared across the account, a change here updates every board that uses them.</p>
        <div className="tag-manager__search">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tags" aria-label="Search tags" className="tag-manager__search-input" />
        </div>
        <div className="label-editor__body">
          {tag_defs.length === 0 && <div className="label-editor__empty">No tags yet. Add the first one below.</div>}
          {tag_defs.length > 0 && visible_tags.length === 0 && <div className="label-editor__empty">No tags match your search.</div>}
          {visible_tags.map((tag) =>
            confirm_delete_id === tag.id ? (
              <div key={tag.id} className="tag-manager__confirm" role="alert">
                <span className="tag-manager__confirm-text">
                  Delete <strong style={{ color: tag.color }}>{formatTagLabel(tag.label)}</strong>?
                  {(tag.usage_count ?? 0) > 0 && ` It is removed from ${itemCountLabel(tag.usage_count ?? 0)}.`}
                  {tag.is_shared && " Other boards lose it too."}
                </span>
                <button type="button" onClick={() => setConfirmDeleteId(null)} className="tag-manager__confirm-cancel">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(tag.id);
                    setConfirmDeleteId(null);
                  }}
                  className="tag-manager__confirm-delete"
                >
                  Delete
                </button>
              </div>
            ) : (
              <div key={tag.id} className="label-editor__row">
                <Tooltip content="Change color" placement="right" disabled={color_picker_id === tag.id}>
                  <button
                    type="button"
                    onClick={() => setColorPickerId(color_picker_id === tag.id ? null : tag.id)}
                    aria-label={`Change color of ${tag.label}`}
                    aria-expanded={color_picker_id === tag.id}
                    className="label-editor__swatch"
                    style={{ background: tag.color }}
                  />
                </Tooltip>
                {color_picker_id === tag.id && (
                  <div className="label-editor__palette" role="group" aria-label="Tag colors">
                    {STATUS_PALETTE.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => {
                          onColor(tag.id, color);
                          setColorPickerId(null);
                        }}
                        aria-label={`Use color ${color}`}
                        aria-pressed={color === tag.color}
                        className="label-editor__palette-color"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                )}
                <OptionLabelInput
                  value={tag.label}
                  onCommit={(label) => {
                    const next_label = formatTagLabel(label);
                    if (next_label && next_label !== tag.label) onRename(tag.id, next_label);
                  }}
                  aria_label="Tag name"
                  className="label-editor__input tag-manager__input"
                />
                {tag.is_shared && (
                  <Tooltip content="Public tag from another board" placement="left">
                    <span className="tag-manager__shared">Shared</span>
                  </Tooltip>
                )}
                {tag.usage_count !== undefined && <span className="tag-manager__count">{itemCountLabel(tag.usage_count)}</span>}
                <Tooltip content="Delete tag" placement="left">
                  <button type="button" onClick={() => requestDelete(tag)} aria-label={`Delete ${tag.label}`} className="label-editor__icon-button label-editor__icon-button--danger">
                    <DeleteIcon size={16} />
                  </button>
                </Tooltip>
              </div>
            )
          )}
          <form onSubmit={handleAdd} className="tag-manager__add">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="#new-tag" aria-label="New tag name" className="tag-manager__add-input" />
            <button type="submit" disabled={!can_add} className="tag-manager__add-button" title={is_duplicate_draft ? "This tag already exists" : undefined}>
              <PlusIcon size={12} />
              Add tag
            </button>
          </form>
        </div>
        <div className="label-editor__footer">
          <button type="button" onClick={onClose} className="label-editor__done">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
