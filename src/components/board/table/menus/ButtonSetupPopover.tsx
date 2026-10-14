"use client";

import { CalendarDays, MousePointer2 } from "lucide-react";
import PopoverPanel from "./PopoverPanel";
import "./button-setup-popover.css";

interface ButtonSetupPopoverProps {
  /** Opens the Button builder, omitted for viewers who cannot create automations. */
  onSetUp?: () => void;
  onClose: () => void;
}

const SAMPLE_ITEMS = ["New blog post", "Design new icons", "Web redesign"];

/**
 * The illustration of monday's popover: three items with a button each, and a cursor that moves
 * from one button to the next, pressing it while its "Set date" tooltip shows. Still under
 * reduced motion, with the cursor on the first button.
 */
function ButtonColumnIllustration() {
  return (
    <div className="button-setup__art" aria-hidden="true">
      <div className="button-setup__halo" />
      <div className="button-setup__rows">
        {SAMPLE_ITEMS.map((name, index) => (
          <div key={name} className="button-setup__row">
            <div className="button-setup__item">
              <span className="button-setup__item-name">{name}</span>
              <span className="button-setup__bubble">
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <path d="M12 3.5c-4.7 0-8.5 3.3-8.5 7.4 0 2.1 1 4 2.6 5.4l-.9 3.6 3.9-2c.9.3 1.9.4 2.9.4 4.7 0 8.5-3.3 8.5-7.4S16.7 3.5 12 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
                </svg>
                <span className="button-setup__bubble-dot" />
              </span>
            </div>
            <div className="button-setup__cell">
              <span className="button-setup__pill" style={{ animationDelay: `${index * 2}s` }} />
            </div>
          </div>
        ))}
        <span className="button-setup__tooltip">
          <CalendarDays size={12} strokeWidth={1.8} />
          Set date
        </span>
        <MousePointer2 className="button-setup__cursor" size={26} strokeWidth={1.4} />
      </div>
    </div>
  );
}

/**
 * monday's "Button column settings" popover, shown when a Button cell is clicked before any
 * automation watches that button. "Set up" opens the Button builder, after that a click on the
 * button runs its automations.
 */
export default function ButtonSetupPopover({ onSetUp, onClose }: ButtonSetupPopoverProps) {
  return (
    <PopoverPanel onClose={onClose} unstyled className="left-1/2 top-full mt-1 -translate-x-1/2">
      <div role="dialog" aria-label="Button column settings" className="button-setup">
        <div className="button-setup__title">Button column settings</div>
        <ButtonColumnIllustration />
        <div className="button-setup__heading">Button column</div>
        <p className="button-setup__text">Set up automatic actions like duplicate, move item, notify someone and more...</p>
        {onSetUp ? (
          <button type="button" className="button-setup__action" onClick={onSetUp} autoFocus>
            Set up
          </button>
        ) : (
          <p className="button-setup__note">Ask a board owner to set up what this button does.</p>
        )}
      </div>
    </PopoverPanel>
  );
}
