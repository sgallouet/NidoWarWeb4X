export const TILE_STATE = {
  inactive: {
    filter: "none",
    tint: "rgba(255, 255, 255, 0.015)",
    stroke: "rgba(255, 255, 255, 0.08)",
  },
  move: {
    filter: "grayscale(0.35) saturate(1.16) brightness(1.16)",
    tint: "rgba(85, 181, 255, 0.28)",
    stroke: "rgba(164, 226, 255, 0.7)",
  },
  engage: {
    filter: "grayscale(0.2) saturate(1.08) brightness(1.1)",
    tint: "rgba(255, 209, 63, 0.36)",
    stroke: "rgba(255, 236, 139, 0.78)",
  },
  attack: {
    filter: "grayscale(0.1) saturate(1.32) brightness(1.08)",
    tint: "rgba(239, 69, 38, 0.48)",
    stroke: "rgba(255, 139, 84, 0.78)",
  },
  battleFog: {
    filter: "grayscale(1) brightness(0.56)",
    tint: null,
    stroke: "rgba(255, 255, 255, 0.04)",
  },
};
