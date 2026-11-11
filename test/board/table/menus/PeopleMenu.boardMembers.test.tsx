import { beforeAll, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PeopleMenu from "@/components/board/table/menus/PeopleMenu";
import type { PersonDef } from "@/components/board/table/types";
import { isAssignablePerson } from "@/lib/assignable-person";

// The client asked that a People column only offers the people added to the board. Everyone else
// stays out of the list, but someone already assigned keeps showing as a chip.

const people: PersonDef[] = [
  { id: "1", name: "Amanda McKay", initials: "AM", color: "#579bfc", job_title: "EA to CEO" },
  { id: "2", name: "Brandon Stauffer", initials: "BS", color: "#a25ddc" },
  { id: "3", name: "Britni Dillard", initials: "BD", color: "#e2445c", is_outside_board: true },
  { id: "4", name: "Ernesto Afane", initials: "EA", color: "#00c875", is_deactivated: true },
];

const renderMenu = (selected: string[] = []) =>
  render(
    <PeopleMenu people={people} selected={selected} query="" onQueryChange={vi.fn()} onSave={vi.fn()} onClose={vi.fn()} />
  );

describe("PeopleMenu board members", () => {
  beforeAll(() => {
    // jsdom has no hit testing, the popover only uses it to follow a scrolled away anchor.
    if (!document.elementsFromPoint) document.elementsFromPoint = () => [];
  });

  test("lists only active people added to the board", () => {
    renderMenu();

    expect(screen.getByText("Amanda McKay (EA to CEO)")).toBeInTheDocument();
    expect(screen.getByText("Brandon Stauffer")).toBeInTheDocument();
    expect(screen.queryByText("Britni Dillard")).not.toBeInTheDocument();
    expect(screen.queryByText("Ernesto Afane")).not.toBeInTheDocument();
  });

  test("keeps someone outside the board as a chip when they are already assigned", () => {
    renderMenu(["3"]);

    expect(screen.getByText("Britni Dillard")).toBeInTheDocument();
  });

  test("isAssignablePerson needs an active account on the board", () => {
    expect(people.map(isAssignablePerson)).toEqual([true, true, false, false]);
  });
});
