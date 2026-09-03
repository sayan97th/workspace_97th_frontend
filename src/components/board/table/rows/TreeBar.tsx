interface TreeBarProps {
  variant: "thick" | "thin" | "gap" | "faded";
  color: string;
  tint?: string;
  rounded_top_left?: boolean;
}

/**
 * The always-present 5px "trunk" column that runs down the left edge of every
 * row in a group. `thick` is a solid fill (item rows, subitem header rows);
 * `thin`/`gap`/`faded` are a 1.5px line stretched with top/bottom insets
 * (not a fixed height) so it stays visually continuous from row to row —
 * that continuity is what makes the tree read as one connected line rather
 * than disconnected hooks.
 */
export default function TreeBar({ variant, color, tint, rounded_top_left }: TreeBarProps) {
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
