import React from "react";
import type { BoardAutomationImportance } from "@/types/board-automation";

const FILLED_BARS: Record<BoardAutomationImportance, number> = { minor: 1, major: 2, critical: 3 };
const BAR_COLORS: Record<BoardAutomationImportance, string> = { minor: "#579bfc", major: "#fdab3d", critical: "#e2445c" };

/** Three rising bars, one to three of them filled, the importance mark next to each automation. */
export function ImportanceIcon({ importance, size = 14 }: { importance: BoardAutomationImportance; size?: number }) {
  const filled = FILLED_BARS[importance] ?? 1;
  return (
    <svg viewBox="0 0 14 14" width={size} height={size} aria-hidden="true" className="flex-none">
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={1 + index * 4.5}
          y={9 - index * 3}
          width="3"
          height={4 + index * 3}
          rx="0.8"
          fill={index < filled ? BAR_COLORS[importance] : "currentColor"}
          className={index < filled ? undefined : "text-boardtree-border"}
        />
      ))}
    </svg>
  );
}
