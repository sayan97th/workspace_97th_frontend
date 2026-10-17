"use client";
import React, { useState } from "react";
import ConfirmActionModal from "@/components/ui/modal/ConfirmActionModal";
import { DeleteIcon, LockIcon, RefreshIcon, ShieldIcon, UnlockIcon } from "@/icons/workspace-icons";
import type { AdminUserDto } from "@/types/administration/admin-users";
import EditUserSection from "./EditUserSection";

type PendingAction = "toggle" | "delete" | "restore" | null;

export type EditUserAccessSectionProps = {
  user: AdminUserDto;
  onToggleActive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onRestore: () => Promise<void>;
};

/**
 * "Account access" tab of the edit page: disable or enable sign in, delete the account, or
 * restore it once deleted. Every action asks for confirmation first, and the dialog shows the
 * API's error when one fails.
 */
const EditUserAccessSection: React.FC<EditUserAccessSectionProps> = ({ user, onToggleActive, onDelete, onRestore }) => {
  const [pending_action, setPendingAction] = useState<PendingAction>(null);
  const is_deleted = Boolean(user.deleted_at);
  const close = () => setPendingAction(null);

  return (
    <>
      {is_deleted ? (
        <EditUserSection
          icon={<RefreshIcon size={17} />}
          title="Deleted account"
          description="This account was deleted. Its name, email and history are kept, so you can bring it back."
          tone="neutral"
          is_flush
        >
          <div className="ud-action-list">
            <div className="ud-action-row">
              <div className="ud-action-text">
                <p className="ud-action-title">Restore account</p>
                <p className="ud-action-description">
                  {user.full_name} gets the account back exactly as it was, with the same roles, workspaces and history.
                </p>
              </div>
              <button type="button" onClick={() => setPendingAction("restore")} className="inv-button inv-button-primary">
                <RefreshIcon size={15} />
                Restore account
              </button>
            </div>
          </div>
        </EditUserSection>
      ) : (
        <div className="ud-stack">
          <EditUserSection
            icon={<ShieldIcon size={17} />}
            title="Sign in"
            description="Block or allow sign in without touching the account's data."
            tone={user.is_active ? "success" : "warning"}
            is_flush
          >
            <div className="ud-action-list">
              <div className="ud-action-row">
                <div className="ud-action-text">
                  <p className="ud-action-title">{user.is_active ? "Disable account" : "Enable account"}</p>
                  <p className="ud-action-description">
                    {user.is_active
                      ? "They can't sign in until you enable the account again. Boards, items and updates stay as they are."
                      : "Sign in is blocked right now. Enable the account to let them back in."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAction("toggle")}
                  className={`inv-button ${user.is_active ? "inv-button-secondary" : "inv-button-primary"}`}
                >
                  {user.is_active ? <LockIcon size={15} /> : <UnlockIcon size={15} />}
                  {user.is_active ? "Disable account" : "Enable account"}
                </button>
              </div>
            </div>
          </EditUserSection>

          <EditUserSection
            icon={<DeleteIcon size={17} />}
            title="Danger zone"
            description="Deleting removes the account from people pickers and mentions. You can restore it later."
            tone="danger"
            is_flush
          >
            <div className="ud-action-list">
              <div className="ud-action-row">
                <div className="ud-action-text">
                  <p className="ud-action-title">Delete user</p>
                  <p className="ud-action-description">
                    {user.full_name} loses access right away. Past comments and assignments still show who they were.
                  </p>
                </div>
                <button type="button" onClick={() => setPendingAction("delete")} className="inv-button ud-button-danger">
                  <DeleteIcon size={15} />
                  Delete user
                </button>
              </div>
            </div>
          </EditUserSection>
        </div>
      )}

      <ConfirmActionModal
        is_open={pending_action === "toggle"}
        title={user.is_active ? "Disable account" : "Enable account"}
        description={
          user.is_active ? (
            <>
              &quot;{user.full_name}&quot; will not be able to sign in until you enable the account again. Their data,
              boards and history are kept as they are.
            </>
          ) : (
            <>&quot;{user.full_name}&quot; will be able to sign in again right away.</>
          )
        }
        confirm_label={user.is_active ? "Disable account" : "Enable account"}
        variant={user.is_active ? "warning" : "neutral"}
        onConfirm={onToggleActive}
        onClose={close}
      />

      <ConfirmActionModal
        is_open={pending_action === "delete"}
        title="Delete user"
        description={
          <>
            This will delete &quot;{user.full_name}&quot;&apos;s account. Their name, email and photo are kept, so their
            past comments and assignments still show who they were, and you can restore the account later.
          </>
        }
        confirm_label="Delete user"
        variant="danger"
        risk_items={[
          "The account will lose access immediately.",
          "They will no longer appear in people pickers or mentions.",
        ]}
        onConfirm={onDelete}
        onClose={close}
      />

      <ConfirmActionModal
        is_open={pending_action === "restore"}
        title="Restore user"
        description={
          <>
            &quot;{user.full_name}&quot; will get their account back exactly as it was, with the same roles, workspaces
            and history.
          </>
        }
        confirm_label="Restore account"
        variant="neutral"
        onConfirm={onRestore}
        onClose={close}
      />
    </>
  );
};

export default EditUserAccessSection;
