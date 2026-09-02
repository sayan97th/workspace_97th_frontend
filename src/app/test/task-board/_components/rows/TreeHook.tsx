interface TreeHookProps {
  color: string;
  ghost?: boolean;
}

/** The 30px branch column: a rounded corner curving from the trunk into the row's checkbox. */
export default function TreeHook({ color, ghost }: TreeHookProps) {
  return (
    <div className="relative w-[30px] flex-none">
      <div
        className="absolute -left-[1.5px] -top-px w-[31.5px] rounded-bl-[9px] border-b-[1.5px] border-l-[1.5px]"
        style={{ height: ghost ? 20 : 21, borderColor: color }}
      />
    </div>
  );
}
