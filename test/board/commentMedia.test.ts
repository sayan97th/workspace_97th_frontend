import { describe, expect, it } from "vitest";
import { attachmentRejectionReason, classifyAttachment, formatAttachmentSize } from "@/components/board/drawer/drawerAttachments";
import { collectThreadMedia, extractBodyImageUrls } from "@/components/board/drawer/media/threadMedia";
import type { DrawerComment } from "@/components/board/drawer/types";
import { defaultRecordingTitle, formatRecordingTime, recordingFileName } from "@/components/recorder/recorderUtils";

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

describe("collectThreadMedia", () => {
  it("lists attachments and pasted images oldest first, without duplicates", () => {
    const older = comment({
      id: "1",
      posted_at_iso: "2026-11-16T10:00:00Z",
      body: "Look ![shot](https://cdn.example.com/a.png)",
      attachments: [{ id: "9", file_name: "demo.webm", tag: "VID", tag_color: "#e2445c", media_kind: "video", download_url: "https://cdn.example.com/demo.webm" }],
    });
    const newer = comment({
      id: "2",
      body: "Same one again ![shot](https://cdn.example.com/a.png)",
      attachments: [{ id: "10", file_name: "notes.pdf", tag: "PDF", tag_color: "#e0524a", media_kind: "file", download_url: "https://cdn.example.com/notes.pdf" }],
    });

    const items = collectThreadMedia([newer, older]);
    expect(items.map((item) => [item.kind, item.url])).toEqual([
      ["video", "https://cdn.example.com/demo.webm"],
      ["image", "https://cdn.example.com/a.png"],
    ]);
    expect(items[0].author?.name).toBe("Ana Diaz");
  });

  it("reads image URLs from Markdown and HTML bodies", () => {
    expect(extractBodyImageUrls('![a](https://x.test/1.png) <img src="https://x.test/2.jpg">')).toEqual(["https://x.test/1.png", "https://x.test/2.jpg"]);
    expect(extractBodyImageUrls("![bad](javascript:alert(1))")).toEqual([]);
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
