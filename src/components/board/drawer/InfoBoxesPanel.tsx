import React from "react";
import { InfoBoxesTabIcon } from "@/icons/drawer-icons";
import type { DrawerInfoBox } from "./types";
import "./board-drawer.css";

export type InfoBoxesPanelProps = {
  info_boxes: DrawerInfoBox[];
};

/** Read only key/value summary cards (contract terms, key dates, products, ...) for the open item. */
const InfoBoxesPanel: React.FC<InfoBoxesPanelProps> = ({ info_boxes }) => {
  if (info_boxes.length === 0) {
    return (
      <div className="shell-scrollbar board-drawer__scroll">
        <div className="board-drawer__empty">
          <span className="board-drawer__empty-icon">
            <InfoBoxesTabIcon size={26} />
          </span>
          <h3 className="board-drawer__empty-title">No info boxes yet</h3>
          <p className="board-drawer__empty-text">Key details about this item, like contract terms or key dates, will show up here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell-scrollbar board-drawer__scroll flex flex-col gap-3.5 !pt-5">
      {info_boxes.map((box) => (
        <section key={box.id} className="drawer-info-box" aria-label={box.label}>
          <h3 className="drawer-info-box__title">
            <span className="drawer-info-box__swatch" style={{ background: box.accent_color }} aria-hidden="true" />
            {box.label}
          </h3>
          {box.rows.map((row) => (
            <div key={row.label} className="drawer-info-box__row">
              <span className="drawer-info-box__label">{row.label}</span>
              <span className="drawer-info-box__value">{row.value}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
};

export default InfoBoxesPanel;
