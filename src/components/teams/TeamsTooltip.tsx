import React from "react";

export type TeamsTooltipProps = {
  content: string;
  children: React.ReactNode;
};

/** monday's dark tooltip under a control, CSS only, shown on hover and keyboard focus. */
const TeamsTooltip: React.FC<TeamsTooltipProps> = ({ content, children }) => (
  <span className="teams-tooltip">
    {children}
    <span role="tooltip" className="teams-tooltip-bubble">
      {content}
    </span>
  </span>
);

export default TeamsTooltip;
