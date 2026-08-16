/** Formats reactor names into a short "who reacted" phrase for a reaction pill's hover tooltip. */
export const formatReactorNames = (reactor_names: string[]): string => {
  if (reactor_names.length === 0) return "";
  if (reactor_names.length === 1) return reactor_names[0];
  if (reactor_names.length === 2) return `${reactor_names[0]} and ${reactor_names[1]}`;
  if (reactor_names.length === 3) return `${reactor_names[0]}, ${reactor_names[1]}, and ${reactor_names[2]}`;
  return `${reactor_names[0]}, ${reactor_names[1]}, and ${reactor_names.length - 2} others`;
};
