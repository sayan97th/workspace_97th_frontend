import { beforeAll, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilesMenu from "@/components/board/table/menus/FilesMenu";
import { canRenameFile, filesFromClipboard, isImageFile, prepareUploads, splitFileName } from "@/components/board/table/menus/filesCellUtils";
import type { CellFile } from "@/components/board/table/types";

const image_file: CellFile = {
  id: "img-1",
  kind: "file",
  file_name: "screenshot_111.png",
  url: "https://cdn.example.com/a.png",
  mime_type: "image/png",
  size_bytes: 2048,
};
const pdf_file: CellFile = { id: "pdf-1", kind: "file", file_name: "brief.pdf", url: "https://cdn.example.com/b.pdf", mime_type: "application/pdf", size_bytes: 10 };
const link_file: CellFile = { id: "link-1", kind: "link", source: "link", file_name: "Figma", url: "https://figma.com/x", mime_type: "text/uri-list", size_bytes: 0 };
const doc_file: CellFile = { id: "doc-1", kind: "doc", doc_id: 4, file_name: "Spec", url: "/boards/4", mime_type: "application/vnd.workspace.doc", size_bytes: 0 };

const renderMenu = (overrides: Partial<Parameters<typeof FilesMenu>[0]> = {}) => {
  const props = {
    files: [image_file, pdf_file, link_file, doc_file],
    is_uploading: false,
    is_creating_doc: false,
    upload_error: null,
    can_edit: true,
    onUpload: vi.fn(),
    onOpenWebcam: vi.fn(),
    onCreateDoc: vi.fn(),
    onAddLink: vi.fn(),
    onRename: vi.fn().mockResolvedValue(undefined),
    onPreview: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<FilesMenu {...props} />);
  return props;
};

describe("filesCellUtils", () => {
  test("splits a name into base and extension", () => {
    expect(splitFileName("menu.request.png")).toEqual({ base_name: "menu.request", extension: "png" });
    expect(splitFileName("README")).toEqual({ base_name: "README", extension: "" });
    expect(splitFileName(".env")).toEqual({ base_name: ".env", extension: "" });
  });

  test("only uploaded images count as images", () => {
    expect(isImageFile(image_file)).toBe(true);
    expect(isImageFile({ ...image_file, kind: undefined, mime_type: "" })).toBe(true);
    expect(isImageFile(pdf_file)).toBe(false);
    expect(isImageFile({ ...link_file, file_name: "photo.png" })).toBe(false);
  });

  test("docs cannot be renamed from the cell", () => {
    expect(canRenameFile(doc_file)).toBe(false);
    expect(canRenameFile(link_file)).toBe(true);
  });

  test("names unsupported and oversized files and keeps the rest", () => {
    const ok = new File(["x"], "a.png", { type: "image/png" });
    const bad = new File(["x"], "virus.exe");
    const big = new File(["x"], "huge.pdf");
    Object.defineProperty(big, "size", { value: 60 * 1024 * 1024 });

    const { accepted, error } = prepareUploads([ok, bad, big]);
    expect(accepted).toEqual([ok]);
    expect(error).toContain("virus.exe is not a supported file type");
    expect(error).toContain("huge.pdf is larger than 50 MB");
  });

  test("gives a pasted image a readable name and keeps real file names", () => {
    const pasted = new File(["x"], "image.png", { type: "image/png" });
    const named = new File(["x"], "logo.png", { type: "image/png" });
    const [renamed, kept] = filesFromClipboard({ files: [pasted, named] } as unknown as DataTransfer);
    expect(renamed.name).toMatch(/^pasted_image_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_1\.png$/);
    expect(kept.name).toBe("logo.png");
  });
});

describe("FilesMenu", () => {
  // jsdom has no hit testing, `PopoverPanel` asks it whether the anchor cell is covered.
  beforeAll(() => {
    if (!document.elementsFromPoint) document.elementsFromPoint = () => [];
  });

  test("shows a thumbnail for images and opens the preview from it and from the name", async () => {
    const props = renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Preview screenshot_111.png" }));
    await userEvent.click(screen.getByRole("link", { name: "screenshot_111.png" }));
    expect(props.onPreview).toHaveBeenCalledTimes(2);
    expect(props.onPreview).toHaveBeenCalledWith("img-1");
    expect(screen.queryByRole("button", { name: "Preview brief.pdf" })).not.toBeInTheDocument();
  });

  test("renames an entry, selecting only the name before the extension", async () => {
    const props = renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Rename screenshot_111.png" }));

    const input = screen.getByRole("textbox", { name: "New name for screenshot_111.png" }) as HTMLInputElement;
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe("screenshot_111".length);

    await userEvent.keyboard("menu_request_1{Enter}");
    expect(props.onRename).toHaveBeenCalledWith("img-1", "menu_request_1.png");
    await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
  });

  test("keeps the field open with the API error when the rename fails", async () => {
    const props = renderMenu({ onRename: vi.fn().mockRejectedValue({ errors: { file_name: ["The file name cannot contain slashes."] } }) });
    await userEvent.click(screen.getByRole("button", { name: "Rename brief.pdf" }));
    await userEvent.keyboard("a/b{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("The file name cannot contain slashes.");
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test("Escape cancels the rename without closing the menu", async () => {
    const props = renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Rename Figma" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(props.onRename).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  test("docs and read only cells offer no rename", () => {
    renderMenu({ can_edit: false });
    expect(screen.queryByRole("button", { name: /^Rename/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Drag files here/)).not.toBeInTheDocument();
  });

  test("a doc entry has no rename button", () => {
    renderMenu();
    expect(screen.queryByRole("button", { name: "Rename Spec" })).not.toBeInTheDocument();
  });

  test("pasting an image into the open menu uploads it", () => {
    const props = renderMenu();
    const pasted = new File(["x"], "image.png", { type: "image/png" });
    fireEvent.paste(screen.getByText("Files in this cell").closest(".files-menu")!, { clipboardData: { files: [pasted] } });
    expect(props.onUpload).toHaveBeenCalledTimes(1);
    expect(vi.mocked(props.onUpload).mock.calls[0][0][0].name).toMatch(/^pasted_image_/);
  });

  test("dropping files on the drop zone uploads them", async () => {
    const props = renderMenu();
    const dropped = new File(["x"], "notes.pdf", { type: "application/pdf" });
    const zone = screen.getByLabelText(/Upload files/);
    fireEvent.drop(zone, { dataTransfer: { files: [dropped], items: [{ kind: "file", type: dropped.type, getAsFile: () => dropped }], types: ["Files"] } });
    await waitFor(() => expect(props.onUpload).toHaveBeenCalledWith([dropped]));
  });
});
