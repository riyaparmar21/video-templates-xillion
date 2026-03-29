import type { SafeArea } from "./types";

export const DEFAULT_SAFE_AREA: SafeArea = {
  top: 0.06,
  right: 0.08,
  bottom: 0.08,
  left: 0.08,
};

export const DEFAULT_BG_COLOR = "#090A0F";
export const DEFAULT_TEXT_COLOR = "#FFFFFF";
export const DEFAULT_ACCENT_COLOR = "#F5B74E";
export const DEFAULT_SECONDARY_ACCENT_COLOR = "#9FD5FF";
export const DEFAULT_REAR_STROKE = "rgba(255,255,255,0.18)";
export const DEFAULT_SUPPORT_BG = "rgba(7, 11, 18, 0.68)";

export const HERO_SPRING = {
  damping: 14,
  stiffness: 180,
  mass: 0.7,
};

export const FRONT_TEXT_SPRING = {
  damping: 16,
  stiffness: 160,
  mass: 0.8,
};

export const REAR_TEXT_OPACITY = 0.92;
export const OBJECT_REAR_TEXT_OPACITY = 0.5;
export const FRONT_TEXT_MAX_WIDTH = 0.72;
export const REAR_TEXT_MAX_WIDTH = 0.86;
export const MAX_ACCENT_WORDS = 4;
