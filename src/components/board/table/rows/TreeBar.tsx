interface TreeBarProps {
  variant: "thick" | "thin" | "gap" | "faded" | "gutter";
  color: string;
  tint?: string;
  rounded_top_left?: boolean;
  /** `gutter` only: shows the group color (row hovered or selected). */
  is_active?: boolean;
}

/**
 * The always-present 5px "trunk" column that runs down the left edge of every
 * row in a group. `thick` is a solid fill (item rows, subitem header rows);
 * `thin`/`gap`/`faded` are a 1.5px line stretched with top/bottom insets
 * (not a fixed height) so it stays visually continuous from row to row —
 * that continuity is what makes the tree read as one connected line rather
 * than disconnected hooks.
 */
export default function TreeBar({ variant, color, tint, rounded_top_left, is_active = false }: TreeBarProps) {
  // Un-contained tables: the group color only shows on the row being pointed at or selected.
  if (variant === "gutter") {
    return (
      <div className="relative w-[5px] flex-none">
        <div
          className="absolute inset-y-[3px] left-0 w-[3px] rounded-r-full transition-opacity duration-150"
          style={{ background: color, opacity: is_active ? 1 : 0 }}
        />
      </div>
    );
  }
  if (variant === "thick") {
    return <div className="w-[5px] flex-none" style={{ background: color, borderTopLeftRadius: rounded_top_left ? 3 : 0 }} />;
  }
  const background = variant === "faded" ? `linear-gradient(${color}, ${tint || color} 70%)` : variant === "gap" ? tint || color : color;
  return (
    <div className="relative w-[5px] flex-none">
      <div className="absolute left-[3.5px] -top-px -bottom-px w-[1.5px]" style={{ background }} />
    </div>
  );
}
