import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangeBoardTypeModal from "@/components/board/ChangeBoardTypeModal";

const renderModal = (props: Partial<React.ComponentProps<typeof ChangeBoardTypeModal>> = {}) => {
  const on_submit = vi.fn().mockResolvedValue(undefined);
  render(
    <ChangeBoardTypeModal is_open initial_board_type="main" onSubmit={on_submit} onClose={vi.fn()} {...props} />
  );
  return on_submit;
};

describe("ChangeBoardTypeModal", () => {
  test("lets the board creator switch the board to private", async () => {
    const on_submit = renderModal({ can_make_private: true });

    await userEvent.click(screen.getByRole("button", { name: "Private" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(on_submit).toHaveBeenCalledWith("private");
  });

  test("disables Private for someone who did not create the board", () => {
    renderModal({ can_make_private: false });

    const private_option = screen.getByRole("button", { name: "Private" });
    expect(private_option).toBeDisabled();
    expect(private_option).toHaveAttribute("title", "Only the board creator can make it private");
    expect(screen.getByRole("button", { name: "Shareable" })).toBeEnabled();
  });

  test("shows the API message when the change is refused", async () => {
    renderModal({
      onSubmit: vi.fn().mockRejectedValue({ message: "Only the board's creator or owner can make it private." }),
    });

    await userEvent.click(screen.getByRole("button", { name: "Private" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Only the board's creator or owner can make it private.");
  });
});
