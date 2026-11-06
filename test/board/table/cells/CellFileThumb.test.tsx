import { describe, expect, test } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import CellFileThumb from "@/components/board/table/cells/CellFileThumb";
import type { CellFile } from "@/components/board/table/types";

const image: CellFile = {
  id: "img",
  kind: "file",
  file_name: "shot.png",
  url: "https://cdn.example.com/shot.png",
  thumb_url: "https://cdn.example.com/shot.webp",
  mime_type: "image/png",
  size_bytes: 2048,
};

describe("CellFileThumb", () => {
  test("loads the light thumbnail first, lazily and decoded off the main thread", () => {
    const { container } = render(<CellFileThumb file={image} />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(image.thumb_url);
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
  });

  test("falls back to the original, then to an image glyph, never a broken image", () => {
    const { container } = render(<CellFileThumb file={image} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")!.getAttribute("src")).toBe(image.url);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  test("an upload from before thumbnails existed uses its original", () => {
    const { container } = render(<CellFileThumb file={{ ...image, thumb_url: undefined }} />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe(image.url);
  });
});
