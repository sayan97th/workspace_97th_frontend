"use client";
import React, { createContext, useContext, useState } from "react";

type GlobalModalsContextType = {
  /** Whether the Teams directory dialog (owned by {@link AppTopBar}) is open. */
  is_teams_open: boolean;
  /** Opens the Teams directory dialog from anywhere under the admin layout. */
  openTeams: () => void;
  closeTeams: () => void;
};

const GlobalModalsContext = createContext<GlobalModalsContextType | undefined>(undefined);

/**
 * Lets routed pages (e.g. `/profile`) trigger dialogs that live outside the React tree
 * they're rendered in, such as {@link TeamsModal} which is mounted once by {@link AppTopBar}
 * alongside the sidebar and stays alive across route changes within the admin layout.
 */
export const useGlobalModals = (): GlobalModalsContextType => {
  const context = useContext(GlobalModalsContext);
  if (!context) {
    throw new Error("useGlobalModals must be used within a GlobalModalsProvider");
  }
  return context;
};

export const GlobalModalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [is_teams_open, setIsTeamsOpen] = useState(false);

  const value: GlobalModalsContextType = {
    is_teams_open,
    openTeams: () => setIsTeamsOpen(true),
    closeTeams: () => setIsTeamsOpen(false),
  };

  return <GlobalModalsContext.Provider value={value}>{children}</GlobalModalsContext.Provider>;
};
