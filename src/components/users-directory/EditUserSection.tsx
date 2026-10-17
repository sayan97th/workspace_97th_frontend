import React from "react";
import { AlertCircleIcon } from "@/icons/workspace-icons";
import type { InvitationTone } from "@/components/invitations";

export type EditUserSectionProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Tints the header icon, and a `danger` section gets a red outline. */
  tone?: InvitationTone;
  /** Hint and buttons in the gray bar at the bottom of the card. */
  footer?: React.ReactNode;
  /** Renders the children edge to edge, for rows that draw their own padding. */
  is_flush?: boolean;
  children: React.ReactNode;
};

/** White card with an icon, title and description header, used by every Edit user tab. */
const EditUserSection: React.FC<EditUserSectionProps> = ({
  icon,
  title,
  description,
  tone = "brand",
  footer,
  is_flush = false,
  children,
}) => (
  <section className="ud-section" data-tone={tone === "danger" ? "danger" : undefined}>
    <header className="ud-section-header">
      <span className="ud-section-icon" data-tone={tone} aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="ud-section-title">{title}</h2>
        <p className="ud-section-description">{description}</p>
      </div>
    </header>
    {is_flush ? <div className="mt-4">{children}</div> : <div className="ud-section-body">{children}</div>}
    {footer ? <div className="ud-section-footer">{footer}</div> : null}
  </section>
);

/** Red message under an invalid field. */
export const EditUserFieldError: React.FC<{ id?: string; message: string | undefined }> = ({ id, message }) =>
  message ? (
    <p id={id} className="ud-field-error" role="alert">
      <AlertCircleIcon size={13} />
      {message}
    </p>
  ) : null;

export default EditUserSection;
