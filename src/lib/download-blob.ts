/** Saves `blob` to the user's device under `filename` by clicking a temporary link, used for server-generated downloads (e.g. an .xlsx export) fetched through `apiClient`. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
