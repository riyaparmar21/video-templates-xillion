/**
 * Video Template Types
 */

export interface PresetColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface BlueprintColors extends PresetColors {
  deepNavy: string;
  cyanLines: string;
  white: string;
}

export interface VideoPresetProps {
  inputVideoUrl: string;
  musicUrl?: string;
}

export interface BlueprintPresetProps extends VideoPresetProps {}

export interface GridAnimationConfig {
  gridSize: number;
  animationSpeed: number;
  opacity: number;
}

export interface LineDrawConfig {
  interval: number;
  duration: number;
  color: string;
  strokeWidth: number;
}

export interface ZoomConfig {
  startScale: number;
  endScale: number;
  microZoomScale: number;
  microZoomInterval: number;
  microZoomDuration: number;
}
