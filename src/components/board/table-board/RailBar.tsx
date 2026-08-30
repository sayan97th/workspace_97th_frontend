type RailBarVariant = "solid" | "faded" | "gap";

interface RailBarProps {
  variant: RailBarVariant;
  /** The owning group/table's accent color — defaults to the design's original blue for callers that don't (yet) know their group's color. */
  color?: string;
}

const RailBar = ({ variant, color = "#4f6bed" }: RailBarProps) => {
  const background =
    variant === "solid" ? color : variant === "gap" ? `color-mix(in srgb, ${color} 35%, white)` : `linear-gradient(${color}, color-mix(in srgb, ${color} 35%, white) 70%)`;

  return (
    <div className="relative w-[5px] flex-none">
      <div className="absolute -top-px -bottom-px left-[3.5px] w-[1.5px]" style={{ background }} />
    </div>
  );
};

export default RailBar;
