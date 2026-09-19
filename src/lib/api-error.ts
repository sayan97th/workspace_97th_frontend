/**
 * The most useful line of an error the API client threw: the first validation
 * message Laravel sent, then its top-level message, then `fallback`. Rejections
 * that are not API responses (a dropped connection) also land on `fallback`.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) return fallback;

  const { errors, message } = error as { errors?: Record<string, string[] | string>; message?: unknown };

  if (errors && typeof errors === "object") {
    const first = Object.values(errors)[0];
    const text = Array.isArray(first) ? first[0] : first;
    if (typeof text === "string" && text.trim()) return text;
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}
