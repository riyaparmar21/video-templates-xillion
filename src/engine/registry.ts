/**
 * Template Registry — maps template names to React components.
 * Import all templates here; the composition engine uses this lookup.
 *
 * PRIMARY templates (folder-based with SKILL.md) use adapter wrappers
 * that convert DynamicVideo's TemplateProps → each template's native props.
 * DynamicVideo passes: { params, palette, typography, sceneDurationFrames }
 * PRIMARY templates expect: { data: {...} } or { captionData: {...} }
 * The adapter maps params → data/captionData so both systems work together.
 */
import React from "react";
import type { TemplateProps, TemplateName } from "./schema";

// ── Template imports ──
import { ImpactNumber } from "../templates/ImpactNumber";
import { TypewriterReveal } from "../templates/TypewriterReveal";
import { QuoteHighlight } from "../templates/QuoteHighlight";
import { TextFocusZoom } from "../templates/TextFocusZoom";
import { ListReveal } from "../templates/ListReveal";
import { FloatingObjects } from "../templates/FloatingObjects";
import { GlassPanel } from "../templates/GlassPanel";
import { IconGrid } from "../templates/IconGrid";
import { StackedBars } from "../templates/StackedBars";
import { ParallaxLayers } from "../templates/ParallaxLayers";
import { TitleSlide } from "../templates/TitleSlide";
import { SplitCompare } from "../templates/SplitCompare";
import { Timeline } from "../templates/Timeline";
import { CallToAction } from "../templates/CallToAction";
import { QuestionReveal } from "../templates/QuestionReveal";
import { TransitionWipe } from "../templates/TransitionWipe";
import { Atmosphere } from "../templates/Atmosphere";
import { LogoReveal } from "../templates/LogoReveal";
import { CountUp } from "../templates/CountUp";
import { GlobeScene } from "../templates/GlobeScene";
// Phase 3 — Extended
import { AnimatedChart } from "../templates/AnimatedChart";
import { SvgMorph } from "../templates/SvgMorph";
import { LottieScene } from "../templates/LottieScene";
import { ParticleField } from "../templates/ParticleField";
// Phase 4 — Premium
import { ThreeScene } from "../templates/ThreeScene";
import { VideoOverlay } from "../templates/VideoOverlay";
import { AudioWaveform } from "../templates/AudioWaveform";

// ── PRIMARY template imports (folder-based with SKILL.md) ──
import { AnimatedSearchBar as _AnimatedSearchBar } from "../templates/AnimatedSearchBar";
import { IOSNotification as _IOSNotification } from "../templates/IOSNotification";
import { InflatingText as _InflatingText } from "../templates/InflatingText";
import { ProgressBar as _ProgressBar } from "../templates/ProgressBar";
import { BlurTextScroller as _BlurTextScroller } from "../templates/BlurTextScroller";
import { VaultAnimatedCards as _VaultAnimatedCards } from "../templates/VaultAnimatedCards";
import { ColorBlendBlocks as _ColorBlendBlocks } from "../templates/ColorBlendBlocks";
import { Tweet as _Tweet } from "../templates/Tweet";
import { ProductRevealTrack as _ProductRevealTrack } from "../templates/ProductRevealTrack";
import { WhiteSocialHandle as _WhiteSocialHandle } from "../templates/WhiteSocialHandle";
import { ShowreelGrid as _ShowreelGrid } from "../templates/ShowreelGrid";
import { MobileShowreelFrames as _MobileShowreelFrames } from "../templates/MobileShowreelFrames";
import { StackHiring as _StackHiring } from "../templates/StackHiring";
import { SlideshowSocial as _SlideshowSocial } from "../templates/SlideshowSocial";
import { DesignPreview as _DesignPreview } from "../templates/DesignPreview";
import { GenAiFeatures as _GenAiFeatures } from "../templates/GenAiFeatures";
import { VaultCardFeatures as _VaultCardFeatures } from "../templates/VaultCardFeatures";
import { Showcase as _Showcase } from "../templates/Showcase";
import { RouteText as _RouteText } from "../templates/RouteText";
import { KineticCaptions as _KineticCaptions } from "../templates/KineticCaptions";
import { AnimatedWebScreens as _AnimatedWebScreens } from "../templates/AnimatedWebScreens";
import { ParallaxImageReveal as _ParallaxImageReveal } from "../templates/ParallaxImageReveal";
import { ThreeDCardFlip as _ThreeDCardFlip } from "../templates/ThreeDCardFlip";
import { CubeRotation as _CubeRotation } from "../templates/CubeRotation";
import { GradientWash as _GradientWash } from "../templates/GradientWash";
import { SplitScreenMorph as _SplitScreenMorph } from "../templates/SplitScreenMorph";
import { NumberCounterScene as _NumberCounterScene } from "../templates/NumberCounterScene";
import { TextRevealWipe as _TextRevealWipe } from "../templates/TextRevealWipe";
import { LogoStinger as _LogoStinger } from "../templates/LogoStinger";
import { SpiralCaptions as _SpiralCaptions } from "../templates/SpiralCaptions";
import { Template3dCaptions as _Template3dCaptions } from "../templates/3dCaptions";


export type TemplateComponent = React.FC<TemplateProps>;

/**
 * Adapter factory: wraps a PRIMARY template that expects { data: ... }
 * so it can be called with DynamicVideo's { params, palette, typography, sceneDurationFrames }.
 * Maps: params → data, merging palette/typography into the data object.
 */
function wrapDataTemplate(
  Component: React.FC<any>,
  dataProp: string = "data"
): TemplateComponent {
  const Wrapper: TemplateComponent = ({ params, palette, typography, sceneDurationFrames }) => {
    // Merge pipeline context into the data object so templates can access colors/fonts
    const fps = 30;
    const durationMs = Math.round((sceneDurationFrames / fps) * 1000);
    const data = {
      // Provide required base fields that all PRIMARY templates expect
      fps,
      width: 1080,
      height: 1920,
      durationMs,
      durationFrames: sceneDurationFrames,
      bgColor: palette?.background || "#0A0A0A",
      textColor: palette?.text || "#FFFFFF",
      accentColor: palette?.accent || "#FF6B35",
      // Spread agent-provided params on top (overrides defaults above)
      ...params,
      // Ensure fps/durationMs can't be accidentally overridden with bad values
      ...((!params?.fps) ? { fps } : {}),
      ...((!params?.durationMs) ? { durationMs } : {}),
    };
    const props = { [dataProp]: data };
    return React.createElement(Component, props);
  };
  return Wrapper;
}

export const templateRegistry: Record<TemplateName, TemplateComponent> = {
  // ── Core 20 (native TemplateProps — no adapter needed) ──
  ImpactNumber,
  TypewriterReveal,
  QuoteHighlight,
  TextFocusZoom,
  ListReveal,
  FloatingObjects,
  GlassPanel,
  IconGrid,
  StackedBars,
  ParallaxLayers,
  TitleSlide,
  SplitCompare,
  Timeline,
  CallToAction,
  QuestionReveal,
  TransitionWipe,
  Atmosphere,
  LogoReveal,
  CountUp,
  GlobeScene,
  // Phase 3 — Extended
  AnimatedChart,
  SvgMorph,
  LottieScene,
  ParticleField,
  // Phase 4 — Premium
  ThreeScene,
  VideoOverlay,
  AudioWaveform,

  // ── PRIMARY templates (adapted: params → data) ──
  AnimatedSearchBar: wrapDataTemplate(_AnimatedSearchBar),
  IOSNotification: wrapDataTemplate(_IOSNotification),
  InflatingText: wrapDataTemplate(_InflatingText),
  ProgressBar: wrapDataTemplate(_ProgressBar),
  // BlurTextScroller: normalize words, pad to minimum 8 to prevent repetitive loops
  BlurTextScroller: (({ params, palette, typography, sceneDurationFrames }: TemplateProps) => {
    const fps = 30;
    const durationMs = Math.round((sceneDurationFrames / fps) * 1000);
    let words: string[] = params.words || [];
    if (words.length > 0 && typeof words[0] === "object") {
      words = words.map((w: any) => w.text || w.label || String(w));
    }
    // Pad to minimum 8 words — shuffle copies to reduce obvious repetition
    if (words.length > 0 && words.length < 8) {
      const original = [...words];
      const reversed = [...original].reverse();
      // Build: original → reversed → original, then de-dupe consecutive
      words = [...original, ...reversed, ...original];
      words = words.filter((w, i) => i === 0 || w !== words[i - 1]);
      // Ensure at least 8 unique-feeling entries
      while (words.length < 8) {
        words.push(...original);
      }
      words = words.slice(0, Math.max(8, original.length * 2));
    }
    const data = {
      fps, width: 1080, height: 1920, durationMs,
      words,
      bgColor: params.bgColor || palette?.background || "#000000",
      textColor: params.textColor || palette?.text || "#FFFFFF",
      fontSize: params.fontSize || 68,
      fontWeight: params.fontWeight || 800,
      angle: params.angle ?? -18,
      msPerWord: params.msPerWord || 600,
    };
    return React.createElement(_BlurTextScroller, { data });
  }) as TemplateComponent,
  VaultAnimatedCards: wrapDataTemplate(_VaultAnimatedCards),
  ColorBlendBlocks: wrapDataTemplate(_ColorBlendBlocks),
  Tweet: wrapDataTemplate(_Tweet),
  ProductRevealTrack: wrapDataTemplate(_ProductRevealTrack),
  WhiteSocialHandle: wrapDataTemplate(_WhiteSocialHandle),
  ShowreelGrid: wrapDataTemplate(_ShowreelGrid),
  MobileShowreelFrames: wrapDataTemplate(_MobileShowreelFrames),
  // StackHiring needs defaults and roles normalization
  StackHiring: (({ params, palette, typography, sceneDurationFrames }: TemplateProps) => {
    const fps = 30;
    // StackHiring has fixed phase boundaries up to 3400ms + 2000ms CTA = 5400ms minimum
    // Enforce minimum to prevent overlapping interpolation ranges
    const rawMs = Math.round((sceneDurationFrames / fps) * 1000);
    const durationMs = Math.max(rawMs, 6000);
    // Normalize roles: agent may send [{name: "..."}, ...] or ["..."]
    let roles = params.roles || ["Role 1", "Role 2", "Role 3"];
    if (roles.length > 0 && typeof roles[0] === "object") {
      roles = roles.map((r: any) => r.name || r.text || r.label || String(r));
    }
    const data = {
      fps, width: 1080, height: 1350, durationMs,
      bgColor: params.bgColor || palette?.accent || "#00D0FF",
      textColor: params.textColor || palette?.text || "#FFFFFF",
      brandName: params.brandName || "Brand",
      brandUrl: params.brandUrl || "",
      footerLine1: params.footerLine1 || "",
      footerLine2: params.footerLine2 || "",
      titleText: params.titleText || "We're Hiring",
      titleFont: params.titleFont || "Georgia, serif",
      titleFontWeight: params.titleFontWeight || 800,
      titleFontSize: params.titleFontSize || 90,
      roles,
      roleFont: params.roleFont || "Helvetica Neue, Arial, sans-serif",
      roleFontWeight: params.roleFontWeight || 800,
      roleFontSize: params.roleFontSize || 86,
      roleLineHeight: params.roleLineHeight || 107,
      scrollSpeedMs: params.scrollSpeedMs || 600,
      ctaLine1: params.ctaLine1 || "Start",
      ctaLine2: params.ctaLine2 || "Today",
      ctaButton: params.ctaButton || "Get Started",
      ctaLine1Size: params.ctaLine1Size || 114,
      ctaLine2Size: params.ctaLine2Size || 108,
      ctaButtonSize: params.ctaButtonSize || 39,
      ctaBgImage: params.ctaBgImage || "",
      ctaFooterLine2: params.ctaFooterLine2 || "",
      buttonColor: params.buttonColor || "#ffffff",
      buttonTextColor: params.buttonTextColor || palette?.background || "#0A0A0A",
      buttonRadius: params.buttonRadius || 103,
    };
    return React.createElement(_StackHiring, { data });
  }) as TemplateComponent,
  SlideshowSocial: wrapDataTemplate(_SlideshowSocial),
  DesignPreview: wrapDataTemplate(_DesignPreview),
  // GenAiFeatures: 4-scene cinematic template with internal timing phases.
  // Agent sends simplified params; adapter fills in all required timing fields.
  // TextLine = { words: string[], color: string }, PromptBoxConfig needs all fields.
  GenAiFeatures: (({ params, palette, typography, sceneDurationFrames }: TemplateProps) => {
    const fps = 30;
    const durationMs = Math.round((sceneDurationFrames / fps) * 1000);
    const textColor = palette?.text || "#FFFFFF";
    const accentColor = palette?.accent || "#FF6B35";
    const bgColor = params.bgColor || palette?.background || "#0A0A0A";

    // Divide duration into 4 phases
    const phaseMs = Math.floor(durationMs / 4);
    const p1End = phaseMs;
    const p2End = phaseMs * 2;
    const p3End = phaseMs * 3;
    const p4End = durationMs;

    const scene1Raw = params.scene1 || {};
    const scene2Raw = params.scene2 || {};
    const scene3Raw = params.scene3 || {};
    const scene4Raw = params.scene4 || {};

    // Convert agent textLines (string | string[] | TextLine[]) → TextLine[]
    const toTextLines = (raw: any, fallback: string): Array<{ words: string[]; color: string }> => {
      if (!raw) return [{ words: fallback.split(" "), color: textColor }];
      if (typeof raw === "string") return [{ words: raw.split(" "), color: textColor }];
      if (Array.isArray(raw)) {
        return raw.map((item: any) => {
          if (typeof item === "string") return { words: item.split(" "), color: textColor };
          if (item.words) return { words: item.words, color: item.color || textColor };
          return { words: [String(item)], color: textColor };
        });
      }
      return [{ words: fallback.split(" "), color: textColor }];
    };

    // Build full PromptBoxConfig from agent's simplified input
    const toPromptBox = (raw: any) => {
      const text = typeof raw === "string" ? raw : raw?.text || "";
      return {
        text,
        boldWords: raw?.boldWords || [],
        label: raw?.label || "AI",
        enterDelayMs: raw?.enterDelayMs ?? 600, // relative to scene2 start
        enterDurationMs: raw?.enterDurationMs ?? 400,
        typeSpeedMs: raw?.typeSpeedMs ?? 40,
        bgColor: raw?.bgColor || "#1A1A2E",
        textColor: raw?.textColor || textColor,
        boldColor: raw?.boldColor || accentColor,
        width: raw?.width || 800,
        height: raw?.height || 120,
      };
    };

    const data = {
      fps,
      width: 1080,
      height: 1920,
      durationMs,
      bgColor,
      scene1: {
        startMs: 0,
        endMs: p1End,
        cursorBlinkMs: 500,
        textLines: toTextLines(scene1Raw.textLines, scene1Raw.text || "Feature showcase"),
        wordIntervalMs: 120,
        textStartMs: 200,
        image: scene1Raw.image || "",
        imageEnterMs: Math.floor(phaseMs * 0.3),
        imageScaleDurationMs: Math.floor(phaseMs * 0.4),
        exitStartMs: Math.floor(p1End - 400),
        exitDurationMs: 400,
        fontSize: scene1Raw.fontSize || 56,
        fontFamily: scene1Raw.fontFamily || typography?.body || "Inter, sans-serif",
        imageSize: scene1Raw.imageSize || 580,
        imageBorderRadius: scene1Raw.imageBorderRadius || 20,
      },
      // NOTE: All timing values below are RELATIVE to each scene's own start (localMs = 0..phaseMs)
      // because the main component passes localMs = timeMs - scene.startMs to each sub-scene.
      scene2: {
        startMs: p1End,
        endMs: p2End,
        textLines: toTextLines(scene2Raw.textLines, ""),
        image: scene2Raw.image || "",
        imageSize: scene2Raw.imageSize || 500,
        imageBorderRadius: scene2Raw.imageBorderRadius || 20,
        imageEnterMs: 400,              // relative: image enters 400ms into scene2
        imageEnterDurationMs: 500,
        promptBox: toPromptBox(scene2Raw.promptBox),
        buttons: Array.isArray(scene2Raw.buttons)
          ? scene2Raw.buttons.map((b: any, i: number) =>
              typeof b === "string"
                ? { text: b, enterDelayMs: 800 + i * 250, enterDurationMs: 350, icon: "" }
                : { text: b.text || "", enterDelayMs: b.enterDelayMs ?? 800 + i * 250, enterDurationMs: b.enterDurationMs ?? 350, icon: b.icon || "" }
            )
          : [],
        buttonBgColor: palette?.accent || "#4A90D9",
        buttonTextColor: "#FFFFFF",
        exitStartMs: phaseMs - 500,     // relative: exit starts 500ms before scene2 ends
        exitDurationMs: 500,
        fontSize: scene2Raw.fontSize || 56,
        fontFamily: scene2Raw.fontFamily || typography?.body || "Inter, sans-serif",
      },
      scene3: {
        startMs: p2End,
        endMs: p3End,
        textLines: toTextLines(scene3Raw.textLines, ""),
        image: scene3Raw.image || scene2Raw.image || "",
        imageBorderRadius: scene3Raw.imageBorderRadius || 20,
        imageEnterMs: 300,              // relative: image enters 300ms into scene3
        imageEnterDurationMs: 500,
        portraitWidth: 450,
        portraitHeight: 650,
        landscapeWidth: 750,
        landscapeHeight: 420,
        stretchStartMs: 800,            // relative: morph starts 800ms into scene3
        stretchToLandscapeMs: 600,
        stretchHoldMs: Math.floor(phaseMs * 0.25),
        stretchBackMs: 500,
        exitStartMs: phaseMs - 500,     // relative: exit starts 500ms before scene3 ends
        exitDurationMs: 500,
        fontSize: scene3Raw.fontSize || 56,
        fontFamily: scene3Raw.fontFamily || typography?.body || "Inter, sans-serif",
      },
      scene4: {
        startMs: p3End,
        endMs: p4End,
        logoText: scene4Raw.logoText || "Brand",
        logoSuperscript: scene4Raw.logoSuperscript || "",
        logoColor: scene4Raw.logoColor || textColor,
        logoFontSize: scene4Raw.logoFontSize || 72,
        logoFontFamily: scene4Raw.logoFontFamily || typography?.heading || "Inter, sans-serif",
        enterDurationMs: 400,
        holdMs: Math.floor(phaseMs * 0.5),
        exitDurationMs: 400,
      },
    };
    return React.createElement(_GenAiFeatures, { data });
  }) as TemplateComponent,
  VaultCardFeatures: wrapDataTemplate(_VaultCardFeatures),
  Showcase: wrapDataTemplate(_Showcase),
  RouteText: wrapDataTemplate(_RouteText),
  // KineticCaptions needs special adapter — agent output uses "type" not "style",
  // may combine tokens ("emphasis-gold big"), and lacks startFrame/durationFrames
  KineticCaptions: (({ params, palette, typography, sceneDurationFrames }: TemplateProps) => {
    const fps = 30;
    const VALID_STYLES = new Set(["normal","filler","big","emphasis-blue","emphasis-gold","accent-blue","big-blue"]);

    // Sanitize a style token: agent may send "emphasis-gold big" or "type" field
    const sanitizeStyle = (raw: string): string => {
      if (!raw) return "normal";
      // Direct match
      if (VALID_STYLES.has(raw)) return raw;
      // Try splitting compound tokens and pick first valid one
      const parts = raw.split(/\s+/);
      for (const part of parts) {
        if (VALID_STYLES.has(part)) return part;
      }
      // Try common aliases
      if (raw.includes("gold")) return "emphasis-gold";
      if (raw.includes("blue") && raw.includes("big")) return "big-blue";
      if (raw.includes("blue")) return "emphasis-blue";
      if (raw.includes("big")) return "big";
      if (raw.includes("filler") || raw.includes("connector")) return "filler";
      if (raw.includes("accent")) return "accent-blue";
      return "normal";
    };

    // Preserve the agent's original group/line structure, just sanitize styles
    const rawGroups = params.groups || [];
    const totalGroups = rawGroups.length || 1;

    // Weight group durations by word count so dense groups get more time
    const groupWordCounts = rawGroups.map((g: any) => {
      let count = 0;
      (g.lines || []).forEach((line: any) => {
        (line.words || []).forEach((w: any) => {
          const text = w.text || "";
          count += text.trim().split(/\s+/).length;
        });
      });
      return Math.max(count, 1); // at least 1 to avoid division by zero
    });
    const totalWords = groupWordCounts.reduce((a: number, b: number) => a + b, 0) || 1;

    // Compute weighted start/duration for each group
    let runningFrame = 0;
    const groupTimings = groupWordCounts.map((wc: number) => {
      const dur = Math.max(
        Math.round(sceneDurationFrames * (wc / totalWords)),
        fps // minimum 1 second per group
      );
      const start = runningFrame;
      runningFrame += dur;
      return { start, dur };
    });
    // Adjust last group to fill remaining frames exactly
    if (groupTimings.length > 0) {
      groupTimings[groupTimings.length - 1].dur =
        sceneDurationFrames - groupTimings[groupTimings.length - 1].start;
    }

    const groups = rawGroups.map((g: any, gi: number) => ({
      id: gi + 1,
      startFrame: g.startFrame ?? groupTimings[gi].start,
      durationFrames: g.durationFrames ?? groupTimings[gi].dur,
      lines: (g.lines || []).map((line: any) => ({
        words: (line.words || []).flatMap((w: any) => {
          const text = w.text || "";
          const style = sanitizeStyle(w.style || w.type || "normal");
          // Safety: if agent sent a full sentence as one "word", auto-split it
          const parts = text.trim().split(/\s+/);
          if (parts.length > 1) {
            return parts.map((part: string) => ({ text: part, style }));
          }
          return [{ text, style }];
        }),
      })),
    }));

    const captionData = {
      fps,
      width: 1080,
      height: 1920,
      durationFrames: sceneDurationFrames,
      showBackground: params.showBackground !== false,
      videoSrc: params.videoSrc || null,
      groups,
    };
    return React.createElement(_KineticCaptions, { captionData });
  }) as TemplateComponent,
  AnimatedWebScreens: wrapDataTemplate(_AnimatedWebScreens),
  ParallaxImageReveal: wrapDataTemplate(_ParallaxImageReveal),
  ThreeDCardFlip: wrapDataTemplate(_ThreeDCardFlip),
  CubeRotation: wrapDataTemplate(_CubeRotation),
  GradientWash: wrapDataTemplate(_GradientWash),
  SplitScreenMorph: wrapDataTemplate(_SplitScreenMorph),
  NumberCounterScene: wrapDataTemplate(_NumberCounterScene),
  TextRevealWipe: wrapDataTemplate(_TextRevealWipe),
  LogoStinger: wrapDataTemplate(_LogoStinger),
  SpiralCaptions: wrapDataTemplate(_SpiralCaptions),
  "3dCaptions": wrapDataTemplate(_Template3dCaptions),

};

/** Get a template component by name. Throws if not found. */
export function getTemplate(name: string): TemplateComponent {
  const component = templateRegistry[name as TemplateName];
  if (!component) {
    throw new Error(
      `Template "${name}" not found. Available: ${Object.keys(templateRegistry).join(", ")}`
    );
  }
  return component;
}
