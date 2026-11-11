import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { UploadProgress } from "@/lib/api-client";
import { useCellFileUploads, type UploadBatchFn } from "@/components/board/table/cells/useCellFileUploads";

type Deferred = { resolve: () => void; reject: (error: unknown) => void; onProgress: (progress: UploadProgress) => void; files: File[] };

/** An upload function whose calls stay open until the test settles them. */
function controlledUpload() {
  const calls: Deferred[] = [];
  const upload: UploadBatchFn = (files, onProgress) =>
    new Promise<void>((resolve, reject) => {
      calls.push({ resolve, reject, onProgress, files });
    });
  return { calls, upload: vi.fn(upload) };
}

const pdf = (name: string) => new File(["x"], name, { type: "application/pdf" });

beforeAll(() => {
  URL.createObjectURL ??= () => "blob:preview";
  URL.revokeObjectURL ??= () => undefined;
});

afterEach(() => vi.restoreAllMocks());

describe("useCellFileUploads", () => {
  test("shows the files at once and follows the bytes sent", async () => {
    const { calls, upload } = controlledUpload();
    const { result } = renderHook(() => useCellFileUploads(upload));

    act(() => void result.current.enqueue([pdf("brief.pdf")]));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(result.current.pending[0]).toMatchObject({ file_name: "brief.pdf", status: "uploading" });
    expect(result.current.is_uploading).toBe(true);

    act(() => calls[0].onProgress({ loaded: 50, total: 100 }));
    expect(result.current.summary).toMatchObject({ status: "uploading", progress: 0.5 });

    act(() => calls[0].onProgress({ loaded: 100, total: 100 }));
    expect(result.current.summary?.status).toBe("processing");

    await act(async () => calls[0].resolve());
    expect(result.current.pending).toHaveLength(0);
    expect(result.current.summary).toBeNull();
  });

  test("a second upload waits for the first instead of being ignored", async () => {
    const { calls, upload } = controlledUpload();
    const { result } = renderHook(() => useCellFileUploads(upload));

    act(() => {
      result.current.enqueue([pdf("first.pdf")]);
      result.current.enqueue([pdf("second.pdf")]);
    });
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(result.current.pending.map((entry) => entry.status)).toEqual(["uploading", "queued"]);
    expect(result.current.summary).toMatchObject({ queued_count: 1 });

    await act(async () => calls[0].resolve());
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].files[0].name).toBe("second.pdf");
    await act(async () => calls[1].resolve());
    expect(result.current.pending).toHaveLength(0);
  });

  test("a failure stays with its message, Retry sends the same files again", async () => {
    const { calls, upload } = controlledUpload();
    const { result } = renderHook(() => useCellFileUploads(upload));

    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.enqueue([pdf("brief.pdf")]).done;
    });
    await waitFor(() => expect(calls).toHaveLength(1));
    await act(async () => {
      calls[0].reject({ message: "Server error" });
      await done.catch(() => undefined);
    });
    expect(result.current.summary).toMatchObject({ status: "failed", error: "Server error" });
    expect(result.current.is_uploading).toBe(false);

    act(() => result.current.retry(result.current.pending[0].batch_id));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1].files[0].name).toBe("brief.pdf");
    await act(async () => calls[1].resolve());
    expect(result.current.pending).toHaveLength(0);
  });

  test("a waiting batch can be cancelled before it is sent", async () => {
    const { calls, upload } = controlledUpload();
    const { result } = renderHook(() => useCellFileUploads(upload));

    let second_batch = "";
    act(() => {
      result.current.enqueue([pdf("first.pdf")]);
      second_batch = result.current.enqueue([pdf("second.pdf")]).batch_id;
    });
    await waitFor(() => expect(calls).toHaveLength(1));
    act(() => result.current.dismiss(second_batch));
    await act(async () => calls[0].resolve());
    expect(calls).toHaveLength(1);
    expect(result.current.pending).toHaveLength(0);
  });
});
