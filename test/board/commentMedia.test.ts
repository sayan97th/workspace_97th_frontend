import { describe, expect, it } from "vitest";
import { attachmentRejectionReason, classifyAttachment, formatAttachmentSize } from "@/components/board/drawer/drawerAttachments";
import { attachmentToMediaItem } from "@/components/board/drawer/media/threadMedia";
import type { DrawerComment } from "@/components/board/drawer/types";
import { defaultRecordingTitle, formatRecordingTime, maxRecordingMs, recordingFileName, toRecorderDevices } from "@/components/recorder/recorderUtils";

const fileOfSize = (name: string, size_bytes: number) => {
  const file = new File(["x"], name);
  Object.defineProperty(file, "size", { value: size_bytes });
  return file;
};

const author = { id: "1", name: "Ana Diaz", initials: "AD", avatar_seed: 1 };

const comment = (overrides: Partial<DrawerComment>): DrawerComment => ({
  id: "1",
  author,
  posted_at: "1h",
  posted_at_iso: "2026-11-17T10:00:00Z",
  body: "",
  view_count: 0,
  liked_by_me: false,
  like_count: 0,
  reactions: [],
  seen: true,
  seen_by: [],
  attachments: [],
  replies: [],
  ...overrides,
});

describe("classifyAttachment", () => {
  it("treats recordings and common video formats as videos", () => {
    expect(classifyAttachment("Recording 2026-11-17 at 10.42.webm")).toMatchObject({ tag: "VID", media_kind: "video" });
    expect(classifyAttachment("walkthrough.MP4").media_kind).toBe("video");
    expect(classifyAttachment("clip.mov").media_kind).toBe("video");
  });

  it("keeps images and documents apart", () => {
    expect(classifyAttachment("photo.jpeg").media_kind).toBe("image");
    expect(classifyAttachment("brief.pdf")).toMatchObject({ tag: "PDF", media_kind: "file" });
  });
});

describe("attachmentRejectionReason", () => {
  it("accepts a 200 MB video but not a 200 MB pdf", () => {
    expect(attachmentRejectionReason(fileOfSize("demo.webm", 200 * 1024 * 1024))).toBeNull();
    expect(attachmentRejectionReason(fileOfSize("big.pdf", 200 * 1024 * 1024))).toMatch(/50 MB/);
  });

  it("rejects videos over 500 MB and unsupported types", () => {
    expect(attachmentRejectionReason(fileOfSize("long.mp4", 600 * 1024 * 1024))).toMatch(/500 MB/);
    expect(attachmentRejectionReason(fileOfSize("tool.exe", 10))).toMatch(/not a supported/);
  });
});

describe("attachmentToMediaItem", () => {
  it("turns posted images and videos into slides with the author, and skips other files", () => {
    const video = { id: "9", file_name: "demo.webm", tag: "VID" as const, tag_color: "#e2445c", media_kind: "video" as const, download_url: "https://cdn.example.com/demo.webm" };
    const pdf = { id: "10", file_name: "notes.pdf", tag: "PDF" as const, tag_color: "#e0524a", media_kind: "file" as const, download_url: "https://cdn.example.com/notes.pdf" };
    const owner = comment({ id: "1", attachments: [video, pdf] });

    expect(attachmentToMediaItem(video, owner)).toMatchObject({ kind: "video", url: "https://cdn.example.com/demo.webm", comment_id: "1", author: { name: "Ana Diaz" } });
    expect(attachmentToMediaItem(pdf, owner)).toBeNull();
  });

  it("uses the local preview of a file that is not uploaded yet", () => {
    const draft = { id: "d1", file_name: "shot.png", tag: "IMG" as const, tag_color: "#a358df", media_kind: "image" as const, preview_url: "blob:local/1" };
    expect(attachmentToMediaItem(draft)?.url).toBe("blob:local/1");
  });
});

describe("recording quality", () => {
  it("gives higher qualities a shorter time limit so the video fits the 500 MB upload limit", () => {
    const minutes = (ms: number) => ms / 60000;
    expect(minutes(maxRecordingMs("720p", "screen"))).toBe(23);
    expect(minutes(maxRecordingMs("1080p", "screen"))).toBe(12);
    expect(minutes(maxRecordingMs("1440p", "screen"))).toBe(7);
    expect(maxRecordingMs("1080p", "camera")).toBeGreaterThan(maxRecordingMs("1080p", "screen"));
  });
});

describe("toRecorderDevices", () => {
  it("drops the browser's default and communications aliases and USB ids", () => {
    const device = (deviceId: string, label: string) => ({ deviceId, label, kind: "audioinput", groupId: "g", toJSON: () => ({}) }) as MediaDeviceInfo;
    const devices = toRecorderDevices(
      [device("default", "Default - Headset"), device("communications", "Communications - Headset"), device("abc", "C920 PRO HD Webcam Analog Stereo (046d:0892)"), device("def", "")],
      "audioinput",
      "Microphone"
    );
    expect(devices).toEqual([
      { id: "abc", label: "C920 PRO HD Webcam Analog Stereo" },
      { id: "def", label: "Microphone 2" },
    ]);
  });
});

describe("recorder helpers", () => {
  it("formats the timer", () => {
    expect(formatRecordingTime(42_000)).toBe("0:42");
    expect(formatRecordingTime(725_000)).toBe("12:05");
    expect(formatRecordingTime(3_729_000)).toBe("1:02:09");
  });

  it("builds safe file names with the right extension", () => {
    expect(recordingFileName('Bug: login "fails"', "video/webm")).toBe("Bug login fails.webm");
    expect(recordingFileName("   ", "video/mp4")).toMatch(/^Recording \d{4}-\d{2}-\d{2} at \d{2}\.\d{2}\.mp4$/);
    expect(defaultRecordingTitle(new Date(2026, 10, 17, 9, 5))).toBe("Recording 2026-11-17 at 09.05");
  });

  it("formats sizes", () => {
    expect(formatAttachmentSize(0)).toBe("");
    expect(formatAttachmentSize(1536)).toBe("1.5 KB");
    expect(formatAttachmentSize(52 * 1024 * 1024)).toBe("52 MB");
  });
});
