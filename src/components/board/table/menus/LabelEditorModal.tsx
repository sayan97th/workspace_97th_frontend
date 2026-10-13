"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, PlusIcon } from "@/icons/board-icons";
import { DeleteIcon } from "@/icons/workspace-icons";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import { boardTreeFontClassName } from "../../board-tree-font";
import type { StatusDef } from "../types";
import { STATUS_PALETTE } from "../constants";
import OptionLabelInput from "./OptionLabelInput";
import "./label-editor-modal.css";

interface LabelEditorModalProps {
  title: string;
  defs: StatusDef[];
  onRename: (id: string, label: string) => void;
  onColor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

/**
 * "Edit labels" dialog for a Status or Label column, opened from its header
 * menu: recolor, rename and delete each label, or add a new one. Styles live
 * in `label-editor-modal.css`. Escape closes the color grid first, then the dialog.
 */
export default function LabelEditorModal({ title, defs, onRename, onColor, onDelete, onAdd, onClose }: LabelEditorModalProps) {
  const [color_picker_id, setColorPickerId] = useState<string | null>(null);
  const editable_defs = defs.filter((d) => !d.fixed);
  const input_refs = useRef(new Map<string, HTMLInputElement>());
  // Ids present when "+ Add new" was clicked. A real column only gets the new
  // option once the API answers, so the focus waits for an id outside this set.
  const ids_before_add_ref = useRef<Set<string> | null>(null);

  useEffect(() => {
    const ids_before_add = ids_before_add_ref.current;
    if (!ids_before_add) return;
    const added_def = editable_defs.find((d) => !ids_before_add.has(d.id));
    if (!added_def) return;
    ids_before_add_ref.current = null;
    const input = input_refs.current.get(added_def.id);
    input?.focus();
    input?.select();
  }, [editable_defs]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (color_picker_id) setColorPickerId(null);
      else onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [color_picker_id, onClose]);

  const handleAdd = () => {
    ids_before_add_ref.current = new Set(editable_defs.map((d) => d.id));
    onAdd();
  };

  return (
    <div className={`label-editor ${boardTreeFontClassName}`} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="label-editor__card">
        <div className="label-editor__header">
          <h2 className="label-editor__title">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="label-editor__icon-button">
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="label-editor__body">
          {editable_defs.length === 0 && <div className="label-editor__empty">No labels yet. Add the first one below.</div>}
          {editable_defs.map((def) => (
            <div key={def.id} className="label-editor__row">
              <Tooltip content="Change color" placement="right" disabled={color_picker_id === def.id}>
                <button
                  type="button"
                  onClick={() => setColorPickerId(color_picker_id === def.id ? null : def.id)}
                  aria-label={`Change color of ${def.label}`}
                  aria-expanded={color_picker_id === def.id}
                  className="label-editor__swatch"
                  style={{ background: def.color }}
                />
              </Tooltip>
              {color_picker_id === def.id && (
                <div className="label-editor__palette" role="group" aria-label="Label colors">
                  {STATUS_PALETTE.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => { onColor(def.id, color); setColorPickerId(null); }}
                      aria-label={`Use color ${color}`}
                      aria-pressed={color === def.color}
                      className="label-editor__palette-color"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              )}
              <OptionLabelInput
                ref={(el) => {
                  if (el) input_refs.current.set(def.id, el);
                  else input_refs.current.delete(def.id);
                }}
                value={def.label}
                onCommit={(label) => onRename(def.id, label)}
                aria_label="Label name"
                className="label-editor__input"
              />
              <Tooltip content="Delete label" placement="left">
                <button type="button" onClick={() => onDelete(def.id)} aria-label={`Delete ${def.label}`} className="label-editor__icon-button label-editor__icon-button--danger">
                  <DeleteIcon size={16} />
                </button>
              </Tooltip>
            </div>
          ))}
          <button type="button" onClick={handleAdd} className="label-editor__add">
            <PlusIcon size={14} />
            Add label
          </button>
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
