"use client";

import { Tooltip } from "react-tooltip";

// This component is used to render a global tooltip that can be used across the application
// It should be included once at the root level of the application
export default function AppTooltip() {
  return (
    <Tooltip
      id="global-tooltip"
      place="top"
      className="z-50 py-1 px-2 max-w-xs"
      style={{
        backgroundColor: "#1a1a1a",
        color: "#ffffff",
        borderRadius: "4px",
        opacity: 1,
        fontSize: "12px",
      }}
      opacity={1}
      arrowColor="#1a1a1a"
      clickable={true}
      positionStrategy="fixed"
    />
  );
}