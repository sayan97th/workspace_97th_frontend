import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateContentModal, { CREATE_CONTENT_KINDS } from "@/components/workspace-nav/CreateContentModal";

const renderModal = (props: Partial<React.ComponentProps<typeof CreateContentModal>> = {}) => {
  const on_submit = vi.fn().mockResolvedValue(undefined);
  const on_close = vi.fn();
  render(<CreateContentModal is_open kind={CREATE_CONTENT_KINDS.board} onSubmit={on_submit} onClose={on_close} {...props} />);
  return { on_submit, on_close };
};

describe("CreateContentModal", () => {
  test("creates a main board with the default name", async () => {
    const { on_submit, on_close } = renderModal();

    expect(screen.getByRole("heading", { name: "Create Board" })).toBeInTheDocument();
    expect(screen.getByLabelText("Board name")).toHaveValue("New Board");
    expect(screen.getByRole("radio", { name: "Main" })).toBeChecked();

    await userEvent.click(screen.getByRole("button", { name: "Create Board" }));

    expect(on_submit).toHaveBeenCalledWith({ label: "New Board", board_type: "main" });
    expect(on_close).toHaveBeenCalled();
  });

  test("creates a private board and explains who can see it", async () => {
    const { on_submit } = renderModal();

    const name_input = screen.getByLabelText("Board name");
    await userEvent.clear(name_input);
    await userEvent.type(name_input, "  Q4 plan  ");
    await userEvent.click(screen.getByRole("radio", { name: "Private" }));

    expect(screen.getByText("Only you and the people you invite can see and open this board.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create Board" }));

    expect(on_submit).toHaveBeenCalledWith({ label: "Q4 plan", board_type: "private" });
  });

  test("blocks an empty name", async () => {
    const { on_submit } = renderModal();

    await userEvent.clear(screen.getByLabelText("Board name"));

    expect(screen.getByRole("button", { name: "Create Board" })).toBeDisabled();
    expect(on_submit).not.toHaveBeenCalled();
  });

  test("folders have no privacy and always send main", async () => {
    const { on_submit } = renderModal({ kind: CREATE_CONTENT_KINDS.folder });

    expect(screen.queryByRole("radio", { name: "Private" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create Folder" }));

    expect(on_submit).toHaveBeenCalledWith({ label: "New Folder", board_type: "main" });
  });

  test("keeps the dialog open when creating fails", async () => {
    const on_close = vi.fn();
    const on_submit = vi.fn().mockRejectedValue(new Error("Server error"));
    render(<CreateContentModal is_open kind={CREATE_CONTENT_KINDS.doc} onSubmit={on_submit} onClose={on_close} />);

    await userEvent.click(screen.getByRole("button", { name: "Create Doc" }));

    expect(on_submit).toHaveBeenCalled();
    expect(on_close).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
