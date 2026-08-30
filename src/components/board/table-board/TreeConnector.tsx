interface TreeConnectorProps {
  line_color: string;
  height_px: number;
}

const TreeConnector = ({ line_color, height_px }: TreeConnectorProps) => (
  <div className="relative w-[30px] flex-none">
    <div
      className="absolute -left-[1.5px] -top-px rounded-bl-[9px] border-b-[1.5px] border-l-[1.5px]"
      style={{ width: "31.5px", height: height_px, borderColor: line_color }}
    />
  </div>
);

export default TreeConnector;
