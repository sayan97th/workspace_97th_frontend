"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { StatusDef } from "../types";
import "../menus/dropdown-picker.css";

/** Gap between chips, matching `.dropdown-cell`'s own `gap`. */
const CHIP_GAP_PX = 6;
/** Room kept for the "+N" badge (its width plus a gap) whenever some labels don't fit. */
const MORE_BADGE_RESERVE_PX = 36;

interface DropdownCellChipsProps {
  /** The cell's labels in their stored order, already resolved to their option (or a colorless fallback). */
  labels: StatusDef[];
}

/**
 * The Dropdown cell's content, monday style: as many tinted label chips as fit
 * in the column, then a dark "+N" badge for the rest. The first chip always
 * shows, truncated if it has to. Every chip is rendered once in a hidden
 * measuring row, so the visible count follows the column's width live.
 */
export default function DropdownCellChips({ labels }: DropdownCellChipsProps) {
  const container_ref = useRef<HTMLDivElement>(null);
  const measure_ref = useRef<HTMLDivElement>(null);
  const [visible_count, setVisibleCount] = useState(labels.length);

  useLayoutEffect(() => {
    const container_el = container_ref.current;
    const measure_el = measure_ref.current;
    if (!container_el || !measure_el) return;

    const measure = () => {
      const available_width = container_el.clientWidth;
      const chip_widths = Array.from(measure_el.children).map((chip) => (chip as HTMLElement).offsetWidth);
      let used_width = 0;
      let count = 0;
      for (let index = 0; index < chip_widths.length; index += 1) {
        const remaining = chip_widths.length - index - 1;
        const next_width = used_width + (index > 0 ? CHIP_GAP_PX : 0) + chip_widths[index];
        if (next_width + (remaining > 0 ? MORE_BADGE_RESERVE_PX : 0) > available_width) break;
        used_width = next_width;
        count += 1;
      }
      setVisibleCount(Math.max(1, count));
    };

    measure();
    const resize_observer = new ResizeObserver(measure);
    resize_observer.observe(container_el);
    return () => resize_observer.disconnect();
  }, [labels]);

  if (labels.length === 0) return null;

  const visible_labels = labels.slice(0, visible_count);
  const hidden_labels = labels.slice(visible_count);

  return (
    <div ref={container_ref} className="dropdown-cell">
      <div ref={measure_ref} className="dropdown-cell__measure" aria-hidden="true">
        {labels.map((label) => (
          <span key={label.id} className="dropdown-cell__chip" style={chipStyle(label.color)}>
            {label.label}
          </span>
        ))}
      </div>
      {visible_labels.map((label, index) => (
        <span
          key={label.id}
          title={label.label}
          className={`dropdown-cell__chip ${index === 0 ? "dropdown-cell__chip--shrink" : ""}`}
          style={chipStyle(label.color)}
        >
          {label.label}
        </span>
      ))}
      {hidden_labels.length > 0 && (
        <span className="dropdown-cell__more" title={hidden_labels.map((label) => label.label).join(", ")}>
          +{hidden_labels.length}
        </span>
      )}
    </div>
  );
}

function chipStyle(color: string): CSSProperties {
  return { "--dropdown-chip-color": color || "#9aa0b6" } as CSSProperties;
}
