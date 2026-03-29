export type LayoutMode =
  | "rear-word"
  | "rear-word-front-line"
  | "front-only"
  | "orbit"
  | "object-anchored";

export type HorizontalAlign = "left" | "center" | "right";
export type RearTextVariant = "solid" | "split" | "stack" | "orbit";
export type FrontTextVariant = "italic-line" | "stacked" | "capsule";

export interface NormalizedAnchor {
  x: number;
  y: number;
}

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SubjectTrackFrameRange {
  startFrame: number;
  endFrame: number;
}

export interface SpatialPlanBlock {
  id: string;
  startFrame: number;
  endFrame: number;
  layoutMode: LayoutMode;
  heroText: string;
  heroTextAlt?: string;
  tagText?: string;
  supportText: string;
  rearAnchor: NormalizedAnchor;
  frontAnchor: NormalizedAnchor;
  align: HorizontalAlign;
  allowRearOcclusion: boolean;
  subjectTrackFrameRange: SubjectTrackFrameRange | null;
  rearVariant?: RearTextVariant;
  frontVariant?: FrontTextVariant;
  rearScale?: number;
  rearRotation?: number;
  rearSkew?: number;
  rearOpacity?: number;
  frontWidth?: number;
  emphasisWords?: string[];
  accentWords?: string[];
  orbitRadius?: number;
}

export interface SpatialPlan {
  jobId: string;
  fps: number;
  frameCount: number;
  blocks: SpatialPlanBlock[];
}

export interface MaskFrameMeta {
  frame: number;
  hasSubject: boolean;
  bbox?: NormalizedRect | null;
  faceSafe?: NormalizedRect | null;
  maskSrc?: string;
}

export interface MaskSubjectTrack {
  startFrame: number;
  endFrame: number;
  hasSubject: boolean;
  bbox?: NormalizedRect | null;
  faceSafe?: NormalizedRect | null;
}

export interface MaskManifest {
  jobId: string;
  fps: number;
  width: number;
  height: number;
  frameCount: number;
  maskPattern: string;
  maskStartIndex: number;
  frames?: MaskFrameMeta[];
  subjectTrack?: MaskSubjectTrack | null;
}

export interface Template3dCaptionsData {
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  durationMs: number;
  videoSrc: string;
  planSrc: string;
  maskManifestSrc: string;
  backgroundMode?: "video" | "solid";
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  safeArea?: SafeArea;
}

/**
 * Props for the main 3dCaptions component.
 * `resolvedPlan` and `resolvedMaskManifest` are pre-loaded data passed from Root.tsx
 * to avoid async fetch race conditions during headless rendering.
 */
export interface Template3dCaptionsProps {
  data: Template3dCaptionsData;
  resolvedPlan?: SpatialPlan;
  resolvedMaskManifest?: MaskManifest;
}
