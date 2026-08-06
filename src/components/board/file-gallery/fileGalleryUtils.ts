/** Formats a byte count as a short, human-readable size ("128 KB", "3.4 MB"). */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit_index = 0;
  while (value >= 1024 && unit_index < units.length - 1) {
    value /= 1024;
    unit_index++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit_index]}`;
};

/** Short date for a file's uploaded timestamp ("Aug 6, 2026"). */
export const formatUploadedDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
