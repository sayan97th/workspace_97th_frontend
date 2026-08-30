import Avatar from "./Avatar";
import OwnerMenu from "./OwnerMenu";
import type { Person } from "./types";

interface OwnerCellProps {
  people: Person[];
  owner_ids: string[];
  is_menu_open: boolean;
  avatar_size_px: number;
  onOpenMenu: () => void;
  onToggleOwner: (person_id: string) => void;
  onClearOwners: () => void;
  onCloseMenu: () => void;
  menu_top_offset_px: number;
}

const MAX_VISIBLE_AVATARS = 3;

const OwnerCell = ({
  people,
  owner_ids,
  is_menu_open,
  avatar_size_px,
  onOpenMenu,
  onToggleOwner,
  onClearOwners,
  onCloseMenu,
  menu_top_offset_px,
}: OwnerCellProps) => {
  const people_by_id = new Map(people.map((person) => [person.id, person]));
  const visible_owner_ids = owner_ids.slice(0, MAX_VISIBLE_AVATARS);
  const overflow_count = owner_ids.length - visible_owner_ids.length;

  return (
    <div className="relative flex h-full items-center justify-center">
      <button type="button" onClick={onOpenMenu} className="flex items-center pl-1.5">
        {visible_owner_ids.length ? (
          visible_owner_ids.map((person_id) => {
            const person = people_by_id.get(person_id);
            return (
              <Avatar
                key={person_id}
                initials={person?.initials ?? person_id}
                background_color={person?.avatar_bg ?? "#9aa0b6"}
                size_px={avatar_size_px}
              />
            );
          })
        ) : (
          <div
            className="-ml-[6px] flex items-center justify-center rounded-full border border-dashed border-[#d3d8e6] text-[#b6bbcd]"
            style={{ width: avatar_size_px, height: avatar_size_px, fontSize: avatar_size_px * 0.4 }}
          >
            +
          </div>
        )}
        {overflow_count > 0 && (
          <div
            className="-ml-[6px] flex items-center justify-center rounded-full border-2 border-white bg-[#eef1f9] font-semibold text-[#5b6180]"
            style={{ width: avatar_size_px, height: avatar_size_px, fontSize: avatar_size_px * 0.35 }}
          >
            +{overflow_count}
          </div>
        )}
      </button>

      {is_menu_open && (
        <OwnerMenu
          people={people}
          owner_ids={owner_ids}
          onToggleOwner={onToggleOwner}
          onClearOwners={onClearOwners}
          onClose={onCloseMenu}
          top_offset_px={menu_top_offset_px}
        />
      )}
    </div>
  );
};

export default OwnerCell;
