import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "@/components/ui/button/Button";

describe("Button", () => {
  test("renders its label and fires onClick", async () => {
    const on_click = vi.fn();
    render(<Button onClick={on_click}>Save</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(on_click).toHaveBeenCalledTimes(1);
  });

  test("does not fire onClick when disabled", async () => {
    const on_click = vi.fn();
    render(
      <Button onClick={on_click} disabled>
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    await userEvent.click(button);

    expect(button).toBeDisabled();
    expect(on_click).not.toHaveBeenCalled();
  });
});
