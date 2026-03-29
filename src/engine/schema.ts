/**
 * JSON Schema for AI-driven video generation.
 * The AI outputs JSON matching this schema; the composition engine renders it.
 */
import { z } from "zod";

// ── Color Palette ──
export const PaletteSchema = z.object({
  primary: z.string().default("#FFD700"),
  secondary: z.string().default("#1E90FF"),
  background: z.string().default("#0A0A0A"),
  text: z.string().default("#FFFFFF"),
  accent: z.string().default("#FF6B35"),
});
export type Palette = z.infer<typeof PaletteSchema>;

// ── Typography ──
export const TypographySchema = z.object({
  heading: z.string().default("Inter"),
  body: z.string().default("Inter"),
  mono: z.string().default("JetBrains Mono"),
});
export type Typography = z.infer<typeof TypographySchema>;

// ── Transition between scenes ──
const TransitionValues = [
  "crossfade",
  "wipe_left",
  "wipe_right",
  "slide_up",
  "slide_down",
  "zoom_in",
  "zoom_out",
  "none",
] as const;

const RawTransitionType = z.enum(TransitionValues);

/**
 * Map common AI-generated transition names to valid schema values.
 * Handles camelCase variants and non-standard names gracefully.
 */
const TRANSITION_NORMALIZE: Record<string, string> = {
  zoomIn: "zoom_in",
  zoomOut: "zoom_out",
  slideUp: "slide_up",
  slideDown: "slide_down",
  slideLeft: "wipe_left",
  slideRight: "wipe_right",
  wipeLeft: "wipe_left",
  wipeRight: "wipe_right",
  fadeToBlack: "crossfade",
  fadeIn: "crossfade",
  fadeOut: "crossfade",
  fade: "crossfade",
  cut: "none",
  dissolve: "crossfade",
  push_left: "wipe_left",
  push_right: "wipe_right",
};

export const TransitionType = z.preprocess((val) => {
  if (typeof val !== "string") return "crossfade";
  // Return as-is if already valid
  if (TransitionValues.includes(val as any)) return val;
  // Normalize known variants
  return TRANSITION_NORMALIZE[val] ?? "crossfade";
}, RawTransitionType);

export type TransitionType = z.infer<typeof RawTransitionType>;

// ── Camera config ──
export const CameraSchema = z.object({
  kenBurns: z.boolean().default(true),
  kenBurnsScale: z.number().default(1.06),
  punchZoom: z.boolean().default(true),
  punchInterval: z.number().default(4),
  punchScale: z.number().default(1.025),
  shake: z.boolean().default(false),
  shakeIntensity: z.number().default(2),
});
export type CameraConfig = z.infer<typeof CameraSchema>;

// ── Template names (must match registry keys) ──
export const TemplateName = z.enum([
  // Core 20
  "ImpactNumber",
  "TypewriterReveal",
  "QuoteHighlight",
  "TextFocusZoom",
  "ListReveal",
  "FloatingObjects",
  "GlassPanel",
  "IconGrid",
  "StackedBars",
  "ParallaxLayers",
  "TitleSlide",
  "SplitCompare",
  "Timeline",
  "CallToAction",
  "QuestionReveal",
  "TransitionWipe",
  "Atmosphere",
  "LogoReveal",
  "CountUp",
  "GlobeScene",
  // Phase 3 — Extended
  "AnimatedChart",
  "SvgMorph",
  "LottieScene",
  "ParticleField",
  // Phase 4 — Premium
  "ThreeScene",
  "VideoOverlay",
  "AudioWaveform",
  // Animated Search Bar
  "AnimatedSearchBar",
  // iOS Notification
  "IOSNotification",
  // Inflating Text
  "InflatingText",
  // Progress Bar
  "ProgressBar",
  // Blur Text Scroller
  "BlurTextScroller",
  "VaultAnimatedCards",
  // Color Blend Blocks
  "ColorBlendBlocks",
  // Tweet
  "Tweet",
  // Product Reveal Track
  "ProductRevealTrack",
  // White Social Handle
  "WhiteSocialHandle",
  // Showreel Grid
  "ShowreelGrid",
  // Mobile Showreel Frames
  "MobileShowreelFrames",
  // Stack Hiring
  "StackHiring",
  // Slideshow Social
  "SlideshowSocial",
  // Design Preview
  "DesignPreview",
  // Gen AI Features
  "GenAiFeatures",
  // Vault Card Features
  "VaultCardFeatures",
  // Showcase
  "Showcase",
  // Route Text
  "RouteText",
  // Kinetic Captions
  "KineticCaptions",
  // Animated Web Screens
  "AnimatedWebScreens",
  // Parallax Image Reveal
  "ParallaxImageReveal",
  // 3D Card Flip
  "ThreeDCardFlip",
  // 3D Cube Rotation
  "CubeRotation",
  // Gradient Wash
  "GradientWash",
  // Split Screen Morph
  "SplitScreenMorph",
  // Number Counter Scene
  "NumberCounterScene",
  // Text Reveal Wipe
  "TextRevealWipe",
  // Logo Stinger
  "LogoStinger",
  // Spiral Captions
  "SpiralCaptions",
  // 3d Captions
  "3dCaptions",
]);
export type TemplateName = z.infer<typeof TemplateName>;

// ── Single scene definition ──
export const SceneSchema = z.object({
  template: TemplateName,
  duration: z.number().min(1).max(30), // seconds
  params: z.record(z.any()),
  transition: TransitionType.default("crossfade"),
  transitionDuration: z.number().default(0.5), // seconds
});
export type SceneSpec = z.infer<typeof SceneSchema>;

// ── Full video specification ──
export const VideoSpecSchema = z.object({
  palette: PaletteSchema.default({}),
  typography: TypographySchema.default({}),
  duration: z.number().min(1).max(300), // total seconds
  fps: z.number().default(30),
  width: z.number().default(1080),
  height: z.number().default(1920),
  audio: z
    .object({
      src: z.string().optional(),
      reactive: z.boolean().default(false),
      reactiveIntensity: z.number().default(1),
    })
    .default({}),
  camera: CameraSchema.default({}),
  scenes: z.array(SceneSchema).min(1),
});
export type VideoSpec = z.infer<typeof VideoSpecSchema>;

// ── Props passed to every template component ──
export interface TemplateProps {
  params: Record<string, any>;
  palette: Palette;
  typography: Typography;
  sceneDurationFrames: number;
}
