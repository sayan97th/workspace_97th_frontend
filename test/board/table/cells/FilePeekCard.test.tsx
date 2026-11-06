import { describe, expect, test } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import FilePeekCard from "@/components/board/table/cells/FilePeekCard";
import type { CellFile } from "@/components/board/table/types";

const image: CellFile = {
  id: "img",
  kind: "file",
  file_name: "Keep me logged in.png",
  url: "https://cdn.example.com/a.png",
  thumb_url: "https://cdn.example.com/a.webp",
  mime_type: "image/png",
  size_bytes: 83_000,
  width: 928,
  height: 1238,
};

const frameOf = (container: HTMLElement) => container.querySelector<HTMLElement>(".file-peek__frame")!;

describe("FilePeekCard", () => {
  test("shows the type, name, real size and weight", () => {
    const { container } = render(<FilePeekCard file={image} position={0} total={1} />);
    expect(container.textContent).toContain("PNG");
    expect(container.textContent).toContain("Keep me logged in.png");
    expect(container.textContent).toContain("928 × 1238");
    expect(container.textContent).toContain("81.1 KB");
    expect(container.querySelector(".file-peek")).not.toHaveAttribute("data-stacked");
  });

  test("a portrait image gets a tall frame and a wide one a short frame", () => {
    const tall = render(<FilePeekCard file={image} position={0} total={1} />);
    expect(frameOf(tall.container).style.height).toBe("216px");
    tall.unmount();
    const wide = render(<FilePeekCard file={{ ...image, width: 3000, height: 1000 }} position={0} total={1} />);
    expect(frameOf(wide.container).style.height).toBe("128px");
  });

  test("more images in the cell add the counter and the deck behind", () => {
    const { container } = render(<FilePeekCard file={image} position={1} total={4} />);
    expect(container.textContent).toContain("2 / 4");
    expect(container.querySelector(".file-peek")).toHaveAttribute("data-stacked", "2");
  });

  test("the shimmer stops once the image is in", () => {
    const { container } = render(<FilePeekCard file={image} position={0} total={1} />);
    expect(frameOf(container)).not.toHaveAttribute("data-loaded");
    fireEvent.load(container.querySelector("img.file-peek__image")!);
    expect(frameOf(container)).toHaveAttribute("data-loaded");
  });
});
