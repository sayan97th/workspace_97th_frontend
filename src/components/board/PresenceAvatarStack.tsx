"use client";

import React from "react";
import { useBoardPresence } from "@/hooks/useBoardPresence";
import PersonAvatarStack from "./PersonAvatarStack";

export type PresenceAvatarStackProps = {
  board_id: number;
};

/** Face-pile of the other users currently viewing this board's Table tab, rendered in `BoardHeader`. Renders nothing while alone. */
const PresenceAvatarStack: React.FC<PresenceAvatarStackProps> = ({ board_id }) => {
  const presence_users = useBoardPresence(board_id);

  if (presence_users.length === 0) return null;

  return (
    <PersonAvatarStack
      people={presence_users.map((presence_user) => ({
        id: presence_user.id,
        full_name: presence_user.name,
        profile_photo_url: presence_user.avatar,
      }))}
      max_visible={5}
    />
  );
};

export default PresenceAvatarStack;
