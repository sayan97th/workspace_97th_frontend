"use client";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type RecorderSelectOption = {
  value: string;
  label: string;
  /** Second line under the label, e.g. "Recommended" or a resolution. */
  caption?: string;
};

export type RecorderSelectProps = {
  /** Read by screen readers, e.g. "Microphone". */
  label: string;
  /** Shown in front of the value inside the trigger. */
  icon: React.ReactNode;
  value: string;
  options: RecorderSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Extra content at the right of the trigger (the microphone level meter). */
  trailing?: React.ReactNode;
};

type MenuPosition = { left: number; top: number; width: number; max_height: number; placement: "below" | "above" };

const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 280;
const VIEWPORT_MARGIN = 12;

/**
 * The recorder's device picker, in place of the browser's native select (whose
 * list looked out of place and cut long device names). A trigger row with an
 * icon, the chosen value and a chevron opens a floating list with a check on
 * the current choice. Keyboard: arrows move, Enter or Space picks, Escape and
 * Tab close, typing a letter jumps to the next match. Portaled to `<body>`
 * with fixed positioning, so the dialog's scroll area never clips it; it flips
 * above the trigger when there is no room below.
 */
export default function RecorderSelect({ label, icon, value, options, onChange, disabled = false, trailing }: RecorderSelectProps) {
  const [is_open, setIsOpen] = useState(false);
  const [active_index, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const list_ref = useRef<HTMLUListElement>(null);
  const list_id = useId();
  const selected = options.find((option) => option.value === value) ?? options[0];

  const open = () => {
    if (disabled || options.length === 0) return;
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    setIsOpen(true);
  };

  const close = (return_focus = true) => {
    setIsOpen(false);
    if (return_focus) trigger_ref.current?.focus();
  };

  const pick = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  };

  // Place the list under the trigger (or above it near the bottom of the window), matching its width.
  useLayoutEffect(() => {
    if (!is_open) return;
    const place = () => {
      const rect = trigger_ref.current?.getBoundingClientRect();
      if (!rect) return;
      const space_below = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
      const space_above = rect.top - VIEWPORT_MARGIN;
      const placement = space_below >= Math.min(MENU_MAX_HEIGHT, 180) || space_below >= space_above ? "below" : "above";
      const max_height = Math.min(MENU_MAX_HEIGHT, (placement === "below" ? space_below : space_above) - MENU_GAP);
      setPosition({
        left: rect.left,
        width: rect.width,
        top: placement === "below" ? rect.bottom + MENU_GAP : rect.top - MENU_GAP,
        max_height,
        placement,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [is_open]);

  // A click anywhere else closes the list.
  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (trigger_ref.current?.contains(target) || list_ref.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [is_open]);

  // Keep the highlighted row in view while moving with the arrows.
  useEffect(() => {
    if (!is_open) return;
    list_ref.current?.querySelector<HTMLElement>(`[data-index="${active_index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [is_open, active_index]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!is_open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }
    if (event.key === "ArrowDown") setActiveIndex((index) => Math.min(options.length - 1, index + 1));
    else if (event.key === "ArrowUp") setActiveIndex((index) => Math.max(0, index - 1));
    else if (event.key === "Home") setActiveIndex(0);
    else if (event.key === "End") setActiveIndex(options.length - 1);
    else if (event.key === "Enter" || event.key === " ") pick(active_index);
    else if (event.key === "Escape") {
      // The dialog behind must not close too.
      event.nativeEvent.stopImmediatePropagation();
      close();
    } else if (event.key === "Tab") {
      setIsOpen(false);
      return;
    } else if (event.key.length === 1) {
      const letter = event.key.toLowerCase();
      const next = options.findIndex((option, index) => index > active_index && option.label.toLowerCase().startsWith(letter));
      const wrapped = next >= 0 ? next : options.findIndex((option) => option.label.toLowerCase().startsWith(letter));
      if (wrapped >= 0) setActiveIndex(wrapped);
    } else return;
    event.preventDefault();
  };

  return (
    <div className="recorder-select" data-open={is_open || undefined} data-disabled={disabled || undefined}>
      <button
        ref={trigger_ref}
        type="button"
        className="recorder-select__trigger"
        onClick={() => (is_open ? close() : open())}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-controls={is_open ? list_id : undefined}
        aria-label={`${label}: ${selected?.label ?? "none"}`}
        aria-activedescendant={is_open ? `${list_id}-${active_index}` : undefined}
      >
        <span className="recorder-select__icon" aria-hidden="true">
          {icon}
        </span>
        <span className="recorder-select__value">
          <span className="recorder-select__eyebrow">{label}</span>
          <span className="recorder-select__label">{selected?.label ?? "None available"}</span>
        </span>
        {trailing}
        <ChevronDown size={16} className="recorder-select__chevron" aria-hidden="true" />
      </button>

      {is_open &&
        position &&
        createPortal(
          <ul
            ref={list_ref}
            id={list_id}
            role="listbox"
            aria-label={label}
            data-escape-layer
            className="recorder-select__menu"
            data-placement={position.placement}
            style={{
              left: position.left,
              width: position.width,
              maxHeight: position.max_height,
              ...(position.placement === "below" ? { top: position.top } : { bottom: window.innerHeight - position.top }),
            }}
            onKeyDown={handleKeyDown}
          >
            {options.map((option, index) => {
              const is_selected = option.value === selected?.value;
              return (
                <li
                  key={option.value || "__default"}
                  id={`${list_id}-${index}`}
                  role="option"
                  aria-selected={is_selected}
                  data-index={index}
                  data-active={index === active_index || undefined}
                  className="recorder-select__option"
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => pick(index)}
                >
                  <span className="recorder-select__option-text">
                    <span className="recorder-select__option-label">{option.label}</span>
                    {option.caption && <span className="recorder-select__option-caption">{option.caption}</span>}
                  </span>
                  {is_selected && <Check size={16} className="recorder-select__check" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
