"use client";
import React, { createContext, useContext } from "react";
import { createPortal } from "react-dom";

/** The element in the Administration page header that holds the active section's buttons. */
export const AdminPageActionsContext = createContext<HTMLElement | null>(null);

/**
 * Renders a section's main actions (Invite, Add department...) in the page header next to the
 * title, the way monday's administration places them, while the section keeps owning their state.
 * Renders nothing outside the Administration view.
 */
const AdminPageActions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const slot_el = useContext(AdminPageActionsContext);
  return slot_el ? createPortal(children, slot_el) : null;
};

export default AdminPageActions;
