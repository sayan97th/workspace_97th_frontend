/**
 * Static data backing the "Request to become a member" modal. Mirrors the
 * approved 97 Workspace design. Members are intentionally decoupled from the
 * modal component so the same list can later be fed from the API without
 * touching the presentation layer.
 */

/** A person who can be selected as a recipient of an access request. */
export type RequestAccessMember = {
  id: string;
  name: string;
  /** Tailwind gradient utilities used to paint the circular avatar. */
  avatar_gradient: string;
  /** Whether the member starts selected when the modal is opened. */
  default_selected: boolean;
};

/** Account admins / owners the request can be sent to. */
export const request_access_members: RequestAccessMember[] = [
  {
    id: "olivia-bennett",
    name: "Olivia Bennett",
    avatar_gradient: "from-[#5b7c99] to-[#2e4257]",
    default_selected: true,
  },
  {
    id: "marcus-reed",
    name: "Marcus Reed",
    avatar_gradient: "from-[#c98a6b] to-[#8a4a34]",
    default_selected: true,
  },
  {
    id: "priya-sharma",
    name: "Priya Sharma",
    avatar_gradient: "from-[#6b9c8a] to-[#347a5a]",
    default_selected: true,
  },
  {
    id: "daniel-cortez",
    name: "Daniel Cortez",
    avatar_gradient: "from-[#9c6ba0] to-[#5a347a]",
    default_selected: true,
  },
  {
    id: "sophia-nguyen",
    name: "Sophia Nguyen",
    avatar_gradient: "from-[#6b7c9c] to-[#34477a]",
    default_selected: true,
  },
  {
    id: "ethan-walker",
    name: "Ethan Walker",
    avatar_gradient: "from-[#4f9d8c] to-[#276155]",
    default_selected: false,
  },
  {
    id: "amara-johnson",
    name: "Amara Johnson",
    avatar_gradient: "from-[#b8728a] to-[#7a2f4a]",
    default_selected: false,
  },
  {
    id: "liam-oconnor",
    name: "Liam O'Connor",
    avatar_gradient: "from-[#7c8fb8] to-[#3f4f7a]",
    default_selected: false,
  },
];

/** Default placeholder shown in the request message textarea. */
export const request_access_message_placeholder = "Hi, please make me a team member";
