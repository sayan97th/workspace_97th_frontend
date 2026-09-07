/** Shared helpers for the "Import items" wizard's step components. */

/** Strips the extension (and any trailing `_<digits>` upload-id suffix some exporters add) from an uploaded file's name, for the "new table" name default. */
export function suggestGroupName(file_name: string): string {
  const without_extension = file_name.replace(/\.(csv|txt|xlsx|xls)$/i, "");
  const without_upload_id = without_extension.replace(/_\d{6,}$/, "");
  return (without_upload_id || without_extension || "Imported items").replace(/_/g, " ").trim();
}

/** Reads a human-readable message off whatever `apiClient` throws (see `lib/api-client.ts`'s `{ ...error_data, status_code }` shape). */
export function importErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}
