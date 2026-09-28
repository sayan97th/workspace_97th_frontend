/** "Tue, Sep 22, 9:00 AM": when a scheduled comment goes out, in the viewer's own time zone. */
export function formatScheduledTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** The `YYYY-MM-DDTHH:mm` value a `datetime-local` input speaks, for a date in the viewer's own time zone. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
