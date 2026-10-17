"use client";
import React from "react";
import { AlertCircle } from "lucide-react";
import "./profile.scss";

export type ProfileFieldErrorProps = {
  message: string;
};

/** Inline field level error line, shared by every input in the Personal info, Password and Edit user cards. */
const ProfileFieldError: React.FC<ProfileFieldErrorProps> = ({ message }) => (
  <p className="profile-field-error !pl-0" role="alert">
    <AlertCircle size={13} className="flex-none" aria-hidden="true" />
    {message}
  </p>
);

export default ProfileFieldError;
