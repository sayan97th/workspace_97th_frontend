"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

const OPEN_DELAY_MS = 350;
const CLOSE_DELAY_MS = 180;
/** A touch screen has no hover, so holding the trigger this long opens the card instead of clicking it. */
const LONG_PRESS_MS = 500;

/**
 * Hover, focus, click and long press wiring for a trigger that opens a
 * floating card (the Reactions card). Spread `trigger_props` on the
 * trigger, wrap its click handler with `guardClick` (a long press must not
 * also click), render the card while `anchor` is set and spread
 * `card_handlers` on it so the pointer or keyboard focus can move into it.
 */
export const usePeopleHoverList = <T extends HTMLElement>(is_enabled = true) => {
  const trigger_ref = useRef<T>(null);
  const timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long_press_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const did_long_press_ref = useRef(false);
  /** Set while focus goes back to the trigger after Escape, so that focus does not reopen the card. */
  const skip_focus_ref = useRef(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timer_ref.current) clearTimeout(timer_ref.current);
    timer_ref.current = null;
  }, []);

  const scheduleOpen = useCallback(() => {
    clearTimer();
    if (!is_enabled) return;
    timer_ref.current = setTimeout(() => setAnchor(trigger_ref.current), OPEN_DELAY_MS);
  }, [clearTimer, is_enabled]);

  const scheduleClose = useCallback(() => {
    clearTimer();
    timer_ref.current = setTimeout(() => setAnchor(null), CLOSE_DELAY_MS);
  }, [clearTimer]);

  const dismiss = useCallback(() => {
    clearTimer();
    setAnchor(null);
  }, [clearTimer]);

  /** Closes the card and puts keyboard focus back on its trigger. */
  const dismissAndRefocus = useCallback(() => {
    dismiss();
    skip_focus_ref.current = true;
    trigger_ref.current?.focus();
  }, [dismiss]);

  /** Opens right away (or closes when already open), for a click on a trigger whose only job is the card. */
  const toggleNow = useCallback(() => {
    clearTimer();
    if (!is_enabled) return;
    setAnchor((current) => (current ? null : trigger_ref.current));
  }, [clearTimer, is_enabled]);

  useEffect(
    () => () => {
      clearTimer();
      if (long_press_ref.current) clearTimeout(long_press_ref.current);
    },
    [clearTimer]
  );

  // The list emptied (the last like or reaction was removed), so nothing is left to show.
  useEffect(() => {
    if (!is_enabled) setAnchor(null);
  }, [is_enabled]);

  const startLongPress = (event: React.PointerEvent) => {
    if (event.pointerType !== "touch" || !is_enabled) return;
    did_long_press_ref.current = false;
    long_press_ref.current = setTimeout(() => {
      did_long_press_ref.current = true;
      setAnchor(trigger_ref.current);
    }, LONG_PRESS_MS);
  };

  const endLongPress = () => {
    if (long_press_ref.current) clearTimeout(long_press_ref.current);
    long_press_ref.current = null;
  };

  /** Runs `onClick` unless a long press just opened the card. */
  const guardClick = (onClick: () => void) => () => {
    if (did_long_press_ref.current) {
      did_long_press_ref.current = false;
      return;
    }
    onClick();
  };

  return {
    anchor,
    guardClick,
    toggleNow,
    trigger_props: {
      ref: trigger_ref,
      onMouseEnter: scheduleOpen,
      onMouseLeave: scheduleClose,
      onFocus: () => {
        if (skip_focus_ref.current) {
          skip_focus_ref.current = false;
          return;
        }
        scheduleOpen();
      },
      onBlur: scheduleClose,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Escape" && anchor) {
          event.stopPropagation();
          dismiss();
        }
      },
      onPointerDown: startLongPress,
      onPointerUp: endLongPress,
      onPointerCancel: endLongPress,
      onContextMenu: (event: React.MouseEvent) => {
        // The long press on a touch screen would otherwise open the browser's context menu on top of the card.
        if (did_long_press_ref.current) event.preventDefault();
      },
    },
    card_handlers: { onEnter: clearTimer, onLeave: scheduleClose, onDismiss: dismiss, onEscape: dismissAndRefocus },
  };
};
