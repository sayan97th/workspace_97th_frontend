"use client";
import React from "react";
import type { AdministrationManagerApi } from "../useAdministrationManager";
import OwnerTransferCard from "../OwnerTransferCard";
import SettingsDropdown from "../SettingsDropdown";
import SettingsToggleRow from "../SettingsToggleRow";

export type AutomationsOwnershipSectionProps = {
  admin: AdministrationManagerApi;
};

/** Administration > Directory > Automations ownership — transfer/keep-alive rules for automations, integrations and workflows. */
const AutomationsOwnershipSection: React.FC<AutomationsOwnershipSectionProps> = ({ admin }) => {
  const owner_options = admin.members.map((member) => ({ id: member.id, label: member.name }));

  return (
    <div className="max-w-[640px]">
      <p className="mb-7 text-[13px] leading-relaxed text-[#9aa4a5]">
        All the settings below apply to automations, integrations and workflows.
      </p>

      <div className="mb-1.5 text-[15px] font-bold text-[#edf1f1]">
        Transfer ownership from one person to another
      </div>
      <p className="mb-[18px] text-[13px] leading-relaxed text-[#9aa4a5]">
        This is a one-time transfer of existing automations.
      </p>

      <OwnerTransferCard
        members={admin.members}
        current_owner_id={admin.auto_current_owner_id}
        onChangeCurrentOwner={admin.setAutoCurrentOwner}
        new_owner_id={admin.auto_new_owner_id}
        onChangeNewOwner={admin.setAutoNewOwner}
        can_transfer={admin.can_transfer_automations}
        onTransfer={admin.transferAutomations}
        transfer_label="Transfer ownership"
        show_arrow
      />
      {admin.auto_transfer_notice ? (
        <div className="mt-3 text-[12.5px] font-medium text-[#8fe3b8]">{admin.auto_transfer_notice}</div>
      ) : null}

      <div className="my-7 h-px bg-white/[0.07]" />

      <SettingsToggleRow
        label="Keep automations running when users are deactivated"
        description="When a user is deactivated, we'll transfer their automations to a default owner instead of pausing them."
        is_on={admin.keep_automations_running}
        onToggle={admin.toggleKeepAutomationsRunning}
        className="mb-[18px]"
      />

      {admin.keep_automations_running ? (
        <div className="max-w-[280px]">
          <div className="mb-[7px] text-[12.5px] font-semibold text-[#9aa4a5]">Default owner</div>
          <SettingsDropdown
            value={admin.auto_default_owner_id}
            options={owner_options}
            onChange={admin.setAutoDefaultOwner}
            className="w-full"
          />
        </div>
      ) : null}
    </div>
  );
};

export default AutomationsOwnershipSection;
