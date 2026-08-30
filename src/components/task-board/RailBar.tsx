type RailBarVariant = "solid" | "faded" | "gap";

interface RailBarProps {
  variant: RailBarVariant;
}

const RAIL_BACKGROUND: Record<RailBarVariant, string> = {
  solid: "#4f6bed",
  gap: "#c3cef9",
  faded: "linear-gradient(#4f6bed, #c3cef9 70%)",
};

const RailBar = ({ variant }: RailBarProps) => (
  <div className="relative w-[5px] flex-none">
    <div className="absolute -top-px -bottom-px left-[3.5px] w-[1.5px]" style={{ background: RAIL_BACKGROUND[variant] }} />
  </div>
);

export default RailBar;
