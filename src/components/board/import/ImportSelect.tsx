"use client";
import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PortalTooltip from "@/components/ui/tooltip/PortalTooltip";
import { ChevronDownIcon, CloseIcon } from "./importIcons";

export type ImportSelectOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Small muted text at the end of the row, e.g. "Detected". */
  hint?: string;
  is_disabled?: boolean;
  /** Shown as a tooltip on a disabled row, so it's clear why it can't be picked. */
  disabled_reason?: string;
  /** "action" rows (like "+ Create new column") read a little bolder. */
  tone?: "default" | "action";
};

export type ImportSelectGroup = { label?: string; options: ImportSelectOption[] };

export type ImportSelectProps = {
  value: string | null;
  groups: ImportSelectGroup[];
  onChange: (value: string) => void;
  /** Shows an "x" that clears the value, when there is one. */
  onClear?: () => void;
  placeholder?: string;
  aria_label: string;
  /** What the closed field shows instead of the option's own label (e.g. "New column: Owner"). */
  display_label?: string;
  display_icon?: React.ReactNode;
  is_invalid?: boolean;
  is_disabled?: boolean;
  className?: string;
  /** The menu is never narrower than this. */
  min_menu_width?: number;
};

/** A search box is shown once the list holds more options than this. */
const SEARCH_THRESHOLD = 8;
const MENU_MAX_HEIGHT = 280;
const VIEWPORT_GUTTER = 8;
const GAP = 4;

type MenuPosition = { top: number; left: number; width: number; max_height: number };

/**
 * The wizard's dropdown, styled after monday.com's import pickers: a 32px
 * field with the picked option's icon, an optional clear "x", and a menu
 * portaled to `document.body` so the scrolling column list never clips it.
 * The menu opens below the field, or above it when there's more room there,
 * and closes on outside click, Escape, or when the page scrolls under it.
 * Arrow keys move through the enabled options and Enter picks one.
 */
const ImportSelect: React.FC<ImportSelectProps> = ({
  value,
  groups,
  onChange,
  onClear,
  placeholder = "Select column",
  aria_label,
  display_label,
  display_icon,
  is_invalid = false,
  is_disabled = false,
  className = "",
  min_menu_width = 220,
}) => {
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const menu_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);
  const list_id = useId();
  const [is_open, setIsOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [query, setQuery] = useState("");
  const [active_value, setActiveValue] = useState<string | null>(null);

  const all_options = useMemo(() => groups.flatMap((group) => group.options), [groups]);
  const selected = all_options.find((option) => option.value === value) ?? null;
  const is_searchable = all_options.length > SEARCH_THRESHOLD;

  const visible_groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({ ...group, options: group.options.filter((option) => option.label.toLowerCase().includes(needle)) }))
      .filter((group) => group.options.length > 0);
  }, [groups, query]);
  const enabled_values = useMemo(
    () => visible_groups.flatMap((group) => group.options).filter((option) => !option.is_disabled).map((option) => option.value),
    [visible_groups]
  );

  const measure = useCallback(() => {
    const rect = trigger_ref.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, min_menu_width);
    const space_below = window.innerHeight - rect.bottom - VIEWPORT_GUTTER - GAP;
    const space_above = rect.top - VIEWPORT_GUTTER - GAP;
    const opens_above = space_below < Math.min(MENU_MAX_HEIGHT, 180) && space_above > space_below;
    const max_height = Math.min(MENU_MAX_HEIGHT, opens_above ? space_above : space_below);
    const left = Math.min(Math.max(VIEWPORT_GUTTER, rect.left), window.innerWidth - width - VIEWPORT_GUTTER);
    setPosition({
      top: opens_above ? rect.top - GAP - max_height : rect.bottom + GAP,
      left,
      width,
      max_height,
    });
  }, [min_menu_width]);

  const close = useCallback((restore_focus = true) => {
    setIsOpen(false);
    setQuery("");
    if (restore_focus) trigger_ref.current?.focus();
  }, []);

  const open = () => {
    if (is_disabled) return;
    measure();
    setActiveValue(selected && !selected.is_disabled ? selected.value : enabled_values[0] ?? null);
    setIsOpen(true);
  };

  useLayoutEffect(() => {
    if (!is_open || !position || !menu_ref.current) return;
    // A menu opened above the field hugs it, however short its list turns out to be.
    const trigger_rect = trigger_ref.current?.getBoundingClientRect();
    const menu_height = menu_ref.current.offsetHeight;
    if (trigger_rect && position.top < trigger_rect.top && menu_height < position.max_height) {
      setPosition((current) => (current ? { ...current, top: trigger_rect.top - GAP - menu_height, max_height: menu_height } : current));
    }
  }, [is_open, position]);

  useEffect(() => {
    if (!is_open) return;
    if (is_searchable) search_ref.current?.focus();
    else menu_ref.current?.focus();
  }, [is_open, is_searchable]);

  useEffect(() => {
    if (!is_open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menu_ref.current?.contains(target) || trigger_ref.current?.contains(target)) return;
      close(false);
    };
    const handleScroll = (event: Event) => {
      if (menu_ref.current?.contains(event.target as Node)) return;
      close(false);
    };
    const handleResize = () => close(false);
    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [is_open, close]);

  useEffect(() => {
    if (!is_open || !active_value) return;
    const row = menu_ref.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(active_value)}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [is_open, active_value]);

  const pick = (option: ImportSelectOption) => {
    if (option.is_disabled) return;
    onChange(option.value);
    close();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      // Closes only the menu, never the wizard behind it.
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      close();
      return;
    }
    if (event.key === "Tab") {
      close(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (enabled_values.length === 0) return;
      const index = active_value ? enabled_values.indexOf(active_value) : -1;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = index === -1 ? (step === 1 ? 0 : enabled_values.length - 1) : (index + step + enabled_values.length) % enabled_values.length;
      setActiveValue(enabled_values[next]);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = all_options.find((candidate) => candidate.value === active_value);
      if (option) pick(option);
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (!is_open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      open();
    }
  };

  const shown_label = display_label ?? selected?.label ?? null;
  const shown_icon = display_icon ?? selected?.icon ?? null;
  const has_clear = Boolean(onClear) && value !== null && !is_disabled;

  return (
    <div className={`iw-select ${className}`} data-clearable={has_clear} data-invalid={is_invalid}>
      <button
        ref={trigger_ref}
        type="button"
        className="iw-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-controls={is_open ? list_id : undefined}
        aria-label={shown_label ? `${aria_label}: ${shown_label}` : aria_label}
        disabled={is_disabled}
        onClick={() => (is_open ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
      >
        {shown_label && shown_icon}
        <span className="iw-select-value" data-placeholder={!shown_label}>
          {shown_label ?? placeholder}
        </span>
      </button>
      {has_clear && (
        <PortalTooltip content="Clear" className="iw-select-clear-wrap">
          <button
            type="button"
            className="iw-select-clear"
            aria-label={`Clear ${aria_label}`}
            onClick={() => {
              onClear?.();
              close(false);
            }}
          >
            <CloseIcon size={14} />
          </button>
        </PortalTooltip>
      )}
      <span className="iw-select-chevron">
        <ChevronDownIcon size={16} />
      </span>

      {is_open && position
        ? createPortal(
            <div
              ref={menu_ref}
              className="iw-menu"
              style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.max_height }}
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
            >
              {is_searchable && (
                <div className="iw-menu-search">
                  <input
                    ref={search_ref}
                    type="text"
                    className="iw-input"
                    value={query}
                    placeholder="Search"
                    aria-label="Search options"
                    aria-controls={list_id}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveValue(null);
                    }}
                  />
                </div>
              )}
              <ul id={list_id} role="listbox" aria-label={aria_label} className="iw-menu-list">
                {visible_groups.length === 0 && <li className="iw-menu-empty">No matches</li>}
                {visible_groups.map((group, group_index) => (
                  <React.Fragment key={group.label ?? `group-${group_index}`}>
                    {group_index > 0 && !group.label && <li role="separator" className="iw-menu-divider" />}
                    {group.label && (
                      <li role="presentation" className="iw-menu-group-label">
                        {group.label}
                      </li>
                    )}
                    {group.options.map((option) => {
                      const row = (
                        <div
                          role="option"
                          data-value={option.value}
                          data-active={option.value === active_value}
                          data-tone={option.tone ?? "default"}
                          aria-selected={option.value === value}
                          aria-disabled={option.is_disabled || undefined}
                          className="iw-option"
                          onMouseEnter={() => !option.is_disabled && setActiveValue(option.value)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => pick(option)}
                        >
                          {option.icon}
                          <span className="iw-option-label">{option.label}</span>
                          {option.hint && <span className="iw-option-hint">{option.hint}</span>}
                        </div>
                      );
                      return (
                        <li key={option.value} role="presentation">
                          {option.is_disabled && option.disabled_reason ? (
                            <PortalTooltip content={option.disabled_reason} className="w-full">
                              {row}
                            </PortalTooltip>
                          ) : (
                            row
                          )}
                        </li>
                      );
                    })}
                  </React.Fragment>
                ))}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default ImportSelect;
