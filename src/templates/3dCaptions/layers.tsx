import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
} from "remotion";
// Img is used by SubjectCutoutLayer to preload mask PNGs (triggers delayRender internally)
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_BG_COLOR,
  DEFAULT_SECONDARY_ACCENT_COLOR,
  DEFAULT_SUPPORT_BG,
  DEFAULT_TEXT_COLOR,
  FRONT_TEXT_MAX_WIDTH,
  FRONT_TEXT_SPRING,
  HERO_SPRING,
  OBJECT_REAR_TEXT_OPACITY,
  REAR_TEXT_OPACITY,
} from "./defaults";
import {
  CLAMP_STYLE,
  anchorToStyle,
  estimateHeroFontSize,
  estimateSupportFontSize,
  getBlockProgress,
  getHeroLines,
  getRearTransform,
  resolveLayoutMode,
  sanitizeText,
  splitSupportText,
} from "./layout";
import type {
  MaskFrameMeta,
  SpatialPlanBlock,
  Template3dCaptionsData,
} from "./types";

const resolveMediaSrc = (src: string): string => {
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) {
    return src;
  }
  return staticFile(src);
};

const SHADOW =
  "0 16px 70px rgba(0, 0, 0, 0.46), 0 6px 22px rgba(0, 0, 0, 0.34)";
const ACCENT_GRADIENT = `linear-gradient(135deg, ${DEFAULT_ACCENT_COLOR} 0%, ${DEFAULT_SECONDARY_ACCENT_COLOR} 100%)`;

// ── Background Layer ──

export const BackgroundLayer: React.FC<{
  data: Template3dCaptionsData;
}> = ({ data }) => {
  const backgroundColor = data.bgColor ?? DEFAULT_BG_COLOR;

  if (data.backgroundMode === "solid" || !data.videoSrc) {
    return (
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 10%, rgba(255,255,255,0.12), transparent 42%), linear-gradient(180deg, rgba(9,10,15,1) 0%, rgba(6,8,14,1) 100%)",
          backgroundColor,
        }}
      />
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      <OffthreadVideo
        src={resolveMediaSrc(data.videoSrc)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "saturate(0.96) contrast(1.02) brightness(0.96)",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 18%, rgba(255,255,255,0.12), transparent 26%), linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0.06) 30%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

// ── Rear Hero Text Layer ──
// Renders the large word(s) BEHIND the person.
// DOM order places this BEFORE SubjectCutoutLayer — no z-index needed.

export const RearHeroTextLayer: React.FC<{
  block: SpatialPlanBlock;
  maskMeta: MaskFrameMeta | null;
  data: Template3dCaptionsData;
  frame: number;
}> = ({ block, maskMeta, data, frame }) => {
  const mode = resolveLayoutMode(block, maskMeta);
  const heroText = sanitizeText(block.heroText);

  if (mode === "front-only" || !heroText) {
    return null;
  }

  const opacityBase =
    block.rearOpacity ??
    (mode === "object-anchored" ? OBJECT_REAR_TEXT_OPACITY : REAR_TEXT_OPACITY);

  const localFrame = Math.max(0, frame - block.startFrame);
  const entry = spring({ frame: localFrame, fps: data.fps, config: HERO_SPRING });
  const opacity = interpolate(entry, [0, 1], [0, opacityBase], CLAMP_STYLE);

  const color = data.textColor ?? DEFAULT_TEXT_COLOR;
  const accent = data.accentColor ?? DEFAULT_ACCENT_COLOR;
  const heroFontSize = estimateHeroFontSize(
    [block.heroText, block.heroTextAlt ?? ""].join(" "),
    data.width,
    data.height,
    block.rearScale ?? 1,
  );

  const posStyle = anchorToStyle(block.rearAnchor, "center", data.width, data.height);
  const rearTransform = getRearTransform(block, frame);
  const lines = getHeroLines(block);
  const progress = getBlockProgress(block, frame);
  const lineGap = Math.max(heroFontSize * 0.02, 10);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Rear hero text container — no mask needed here.
          The SubjectCutoutLayer (rendered after this in DOM order) paints the
          masked person ON TOP of this text, creating the depth illusion. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        {/* Warm radial glow behind text anchor */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 60% 50% at ${block.rearAnchor.x * 100}% ${block.rearAnchor.y * 100}%, ${accent}33, transparent 70%)`,
            opacity: opacity * 0.65,
            mixBlendMode: "screen",
          }}
        />

        {/* Hero text */}
        <div
          style={{
            position: "absolute",
            left: posStyle.left,
            top: posStyle.top,
            transform: `${posStyle.transform} ${rearTransform}`,
            width: `${data.width * 1.02}px`,
            maxWidth: `${data.width * 1.02}px`,
            transformOrigin: "center center",
            textAlign: "center",
            pointerEvents: "none",
            fontFamily: "var(--caption-display-font), sans-serif",
            fontWeight: 900,
            display: "flex",
            flexDirection: "column",
            gap: `${lineGap}px`,
            textTransform: "uppercase",
            whiteSpace: "pre-wrap",
          }}
        >
          {lines.map((line, index) => {
            const drift = interpolate(
              progress,
              [0, 1],
              [-20 + index * 6, 12 - index * 4],
              CLAMP_STYLE,
            );
            return (
              <div
                key={`hero-${line}-${index}`}
                style={{
                  fontSize: heroFontSize * (index === 0 ? 1 : 0.78),
                  lineHeight: 0.9,
                  letterSpacing: index === 0 ? "-0.065em" : "-0.035em",
                  opacity,
                  color,
                  textShadow: SHADOW,
                  transform: `translateX(${drift}px)`,
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Subject Cutout Layer ──
// Renders the person on top of the rear text using a CSS mask.
// CRITICAL: No transform, filter, or z-index — these break mask-image in headless Chrome.
// The original DepthCaptions template uses this exact bare pattern and it works.

export const SubjectCutoutLayer: React.FC<{
  data: Template3dCaptionsData;
  maskMeta: MaskFrameMeta | null;
}> = ({ data, maskMeta }) => {
  if (!maskMeta?.hasSubject || !maskMeta.maskSrc || !data.videoSrc) {
    return null;
  }

  const maskUrl = resolveMediaSrc(maskMeta.maskSrc);

  return (
    <>
      {/* Preload the mask PNG so it's cached before CSS mask-image uses it.
          Remotion's <Img> calls delayRender internally — without this, the
          headless Chrome captures the frame before the mask loads, making
          this layer fully opaque and burying the rear hero text. */}
      <Img
        src={maskUrl}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          WebkitMaskImage: `url("${maskUrl}")`,
          maskImage: `url("${maskUrl}")`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center center",
          maskPosition: "center center",
        }}
      >
        <OffthreadVideo
          src={resolveMediaSrc(data.videoSrc)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>
    </>
  );
};

// ── Tag Text Layer ──

export const TagTextLayer: React.FC<{
  block: SpatialPlanBlock;
  data: Template3dCaptionsData;
  frame: number;
}> = ({ block, data, frame }) => {
  const tagText = sanitizeText(block.tagText ?? "");
  if (!tagText) return null;

  const entry = spring({
    frame: Math.max(0, frame - block.startFrame),
    fps: data.fps,
    config: FRONT_TEXT_SPRING,
  });
  const color = data.textColor ?? DEFAULT_TEXT_COLOR;
  const opacity = interpolate(entry, [0, 1], [0, 0.88], CLAMP_STYLE);
  const translateY = interpolate(entry, [0, 1], [-16, 0], CLAMP_STYLE);
  const tagY = Math.max(0.04, block.rearAnchor.y - 0.14);
  const fontSize = Math.max(22, data.width * 0.032);

  return (
    <div
      style={{
        position: "absolute",
        left: `${block.rearAnchor.x * data.width}px`,
        top: `${tagY * data.height}px`,
        transform: `translate(-50%, -50%) translateY(${translateY}px)`,
        fontFamily: "var(--caption-support-font), sans-serif",
        fontWeight: 600,
        fontSize,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color,
        opacity,
        textShadow: SHADOW,
        pointerEvents: "none",
      }}
    >
      {tagText}
    </div>
  );
};

// ── Front Support Text Layer ──
// Rendered AFTER SubjectCutoutLayer in DOM order = paints on top of everything.

export const FrontSupportTextLayer: React.FC<{
  block: SpatialPlanBlock;
  maskMeta: MaskFrameMeta | null;
  data: Template3dCaptionsData;
  frame: number;
}> = ({ block, maskMeta, data, frame }) => {
  const mode = resolveLayoutMode(block, maskMeta);
  const supportText = sanitizeText(block.supportText);

  if (!supportText) return null;

  const posStyle = anchorToStyle(block.frontAnchor, block.align, data.width, data.height);
  const entry = spring({
    frame: Math.max(0, frame - block.startFrame),
    fps: data.fps,
    config: FRONT_TEXT_SPRING,
  });
  const color = data.textColor ?? DEFAULT_TEXT_COLOR;
  const accent = data.accentColor ?? DEFAULT_ACCENT_COLOR;
  const large = mode === "front-only";
  const fontSize = estimateSupportFontSize(supportText, data.width, data.height, large);
  const opacity = interpolate(entry, [0, 1], [0, 1], CLAMP_STYLE);
  const translateY = interpolate(entry, [0, 1], [28, 0], CLAMP_STYLE);
  const widthRatio = block.frontWidth ?? FRONT_TEXT_MAX_WIDTH;
  const lines = splitSupportText(
    supportText,
    block.frontVariant === "stacked" ? 3 : 4,
  );
  const capsule = block.frontVariant === "capsule" || mode === "front-only";

  return (
    <div
      style={{
        position: "absolute",
        left: posStyle.left,
        top: posStyle.top,
        transform: `${posStyle.transform} translateY(${translateY}px)`,
        width: `${data.width * widthRatio}px`,
        maxWidth: `${data.width * widthRatio}px`,
        padding: capsule ? "20px 24px 18px" : "0",
        borderRadius: capsule ? "26px" : "0",
        background: capsule ? DEFAULT_SUPPORT_BG : "transparent",
        border: capsule ? "1px solid rgba(255,255,255,0.12)" : "none",
        boxShadow: capsule ? SHADOW : "none",
        opacity,
        pointerEvents: "none",
      }}
    >
      {lines.map((line, index) => {
        const wordDelay = interpolate(entry, [0, 1], [18, 0], CLAMP_STYLE);
        return (
          <div
            key={`${block.id}-support-${index}`}
            style={{
              fontFamily: "var(--caption-support-font), serif",
              fontWeight: large ? 800 : 700,
              fontStyle: capsule ? "normal" : "italic",
              fontSize: fontSize * (index === 0 ? 1.05 : 0.96),
              lineHeight: 0.98,
              letterSpacing: capsule ? "-0.03em" : "-0.02em",
              color: capsule ? color : DEFAULT_TEXT_COLOR,
              textAlign: block.align,
              textShadow: SHADOW,
              transform: `translateY(${wordDelay + index * 4}px)`,
              marginBottom: index === lines.length - 1 ? 0 : fontSize * 0.08,
            }}
          >
            {line}
          </div>
        );
      })}

      {!capsule ? (
        <div
          style={{
            marginTop: `${fontSize * 0.18}px`,
            width: `${Math.max(68, fontSize * 1.8)}px`,
            height: "4px",
            backgroundImage: ACCENT_GRADIENT,
            borderRadius: "999px",
            marginLeft:
              block.align === "left"
                ? "0"
                : block.align === "center"
                  ? "auto"
                  : undefined,
            marginRight:
              block.align === "right"
                ? "0"
                : block.align === "center"
                  ? "auto"
                  : undefined,
            boxShadow: "0 0 18px rgba(245,183,78,0.35)",
          }}
        />
      ) : null}
    </div>
  );
};
