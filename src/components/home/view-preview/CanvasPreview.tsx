import React from "react";

/** A mini Canvas: sticky notes and a shape joined by a hand drawn arrow on a dotted board. */
const CanvasPreview: React.FC = () => (
  <div className="vp-canvas">
    <svg className="vp-canvas__arrow" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
      <path d="M30 22 C 48 6, 58 46, 74 30" vectorEffect="non-scaling-stroke" />
    </svg>
    <span className="vp-canvas__note" data-tone="yellow" />
    <span className="vp-canvas__note" data-tone="pink" />
    <span className="vp-canvas__note" data-tone="blue" />
    <span className="vp-canvas__shape" />
  </div>
);

export default CanvasPreview;
