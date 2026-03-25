/**
 * ColorBlendBlocks — Card-stack push transition.
 *
 * Always exactly 3 static cards visible. On transition, a NEW card slides in
 * from below (translateY), pushing the stack up. Only the incoming card
 * animates — the others are static. After animation completes the oldest
 * card drops off and the stack shifts.
 *
 * Each card = image + top-left color block + bottom-right color block +
 * clipped blend intersection regions. 4 layers max per card.
 *
 * No opacity animation on blend blocks. All positions snapped to int px.
 */
import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  staticFile,
} from "remotion";

// ── Types ──────────────────────────────────────────────────────────────────

interface SceneConfig {
  imageSrc: string;
  imageSrc2?: string;
  topLeftColor: string;
  bottomRightColor: string;
  blendMode: string;
  durationMs: number;
}

export interface ColorBlendBlocksData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor: string;
  headerLeftText: string;
  headerRightText: string;
  headerYFrac: number;
  blockA: { xFrac: number; yFrac: number; wFrac: number; hFrac: number };
  blockB: { xFrac: number; yFrac: number; wFrac: number; hFrac: number };
  blockC: { xFrac: number; yFrac: number; wFrac: number; hFrac: number };
  transitionMs?: number;
  scenes: SceneConfig[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const snap = (v: number) => Math.round(v);

function msToFrame(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

function getContrastColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum > 0.65) return "#2a2a2a";
  if (lum > 0.4) return "#0044cc";
  return "#ffffff";
}

// ── Rect helpers ──────────────────────────────────────────────────────────

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Compute the intersection rectangle of two rects (or null if none) */
function rectIntersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const r = Math.min(a.x + a.w, b.x + b.w);
  const bot = Math.min(a.y + a.h, b.y + b.h);
  if (r <= x || bot <= y) return null;
  return { x, y, w: r - x, h: bot - y };
}

// ── Single Card ───────────────────────────────────────────────────────────
// image + top-left block + bottom-right block + clipped blend intersections

const Card: React.FC<{
  scene: SceneConfig;
  bA: Rect;
  bB: Rect;
  bC: Rect;
  translateY?: number;
  zIndex: number;
}> = ({ scene, bA, bB, bC, translateY = 0, zIndex }) => {
  const blendMode = scene.blendMode as any;

  // Intersection regions (for clipped blend overlays)
  const isect1 = rectIntersection(bA, bB); // top-left block ∩ image
  const isect2 = rectIntersection(bB, bC); // image ∩ bottom-right block

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: translateY !== 0 ? `translate3d(0,${snap(translateY)}px,0)` : undefined,
        zIndex,
        willChange: translateY !== 0 ? "transform" : undefined,
        isolation: "isolate",
      }}
    >
      {/* Layer 1: Color blocks — BELOW image so blend overlays work against image */}
      <div
        style={{
          position: "absolute",
          left: bA.x,
          top: bA.y,
          width: bA.w,
          height: bA.h,
          backgroundColor: scene.topLeftColor,
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: bC.x,
          top: bC.y,
          width: bC.w,
          height: bC.h,
          backgroundColor: scene.bottomRightColor,
          zIndex: 1,
        }}
      />

      {/* Layer 2: Center image — above blocks */}
      <div
        style={{
          position: "absolute",
          left: bB.x,
          top: bB.y,
          width: bB.w,
          height: bB.h,
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <Img
          src={staticFile(scene.imageSrc)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      {/* Optional second image (collage scene) */}
      {scene.imageSrc2 && (
        <div
          style={{
            position: "absolute",
            left: snap(bB.x + bB.w * 0.2),
            top: snap(bB.y + bB.h * 0.25),
            width: snap(bB.w * 0.9),
            height: snap(bB.h * 0.8),
            overflow: "hidden",
            zIndex: 2,
          }}
        >
          <Img
            src={staticFile(scene.imageSrc2)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Layer 3a: Clipped blend at intersection 1 (top-left block ∩ image) */}
      {isect1 && (
        <div
          style={{
            position: "absolute",
            left: isect1.x,
            top: isect1.y,
            width: isect1.w,
            height: isect1.h,
            backgroundColor: scene.topLeftColor,
            mixBlendMode: blendMode,
            zIndex: 3,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Layer 3b: Clipped blend at intersection 2 (image ∩ bottom-right block) */}
      {isect2 && (
        <div
          style={{
            position: "absolute",
            left: isect2.x,
            top: isect2.y,
            width: isect2.w,
            height: isect2.h,
            backgroundColor: scene.bottomRightColor,
            mixBlendMode: blendMode,
            zIndex: 3,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};

// ── Header bar ────────────────────────────────────────────────────────────

const HeaderBar: React.FC<{
  leftText: string;
  rightText: string;
  yFrac: number;
  canvasW: number;
  canvasH: number;
  blockColorBehindLeft?: string;
}> = ({ leftText, rightText, yFrac, canvasW, canvasH, blockColorBehindLeft }) => {
  const lineY = snap(yFrac * canvasH);
  const fontSize = snap(canvasW * 0.028);
  const sidePad = snap(canvasW * 0.055);
  const leftTextColor = getContrastColor(blockColorBehindLeft || "#cccccc");
  return (
    <>
      <div style={{ position: "absolute", top: lineY, left: sidePad, right: sidePad, height: 1.5, backgroundColor: "#2a2a2a", zIndex: 50 }} />
      <div style={{ position: "absolute", top: lineY - fontSize - 4, left: sidePad, fontSize, fontFamily: "Inter, Helvetica, Arial, sans-serif", fontWeight: 500, color: leftTextColor, zIndex: 51, letterSpacing: "-0.01em", textDecoration: "underline", textUnderlineOffset: "3px", textDecorationThickness: "1px" }}>{leftText}</div>
      <div style={{ position: "absolute", top: lineY - fontSize - 4, right: sidePad, fontSize, fontFamily: "Inter, Helvetica, Arial, sans-serif", fontWeight: 500, color: "#2a2a2a", zIndex: 51, letterSpacing: "-0.01em" }}>{rightText}</div>
    </>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const ColorBlendBlocks: React.FC<{ data: ColorBlendBlocksData }> = ({
  data,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const transitionMs = data.transitionMs ?? 200;
  const transitionFrames = Math.max(1, msToFrame(transitionMs, fps));

  // Scene timing
  const sceneFrameCounts = useMemo(
    () => data.scenes.map((s) => msToFrame(s.durationMs, fps)),
    [data.scenes, fps]
  );
  const sceneStarts = useMemo(() => {
    const arr: number[] = [];
    let acc = 0;
    for (const f of sceneFrameCounts) {
      arr.push(acc);
      acc += f;
    }
    return arr;
  }, [sceneFrameCounts]);

  // Current scene index
  const sceneIndex = sceneStarts.reduce(
    (acc, start, idx) => (frame >= start ? idx : acc),
    0
  );
  const localFrame = frame - sceneStarts[sceneIndex];
  const sceneLen = sceneFrameCounts[sceneIndex];

  // Block rects — snapped to int px
  const bA: Rect = {
    x: snap(data.blockA.xFrac * width),
    y: snap(data.blockA.yFrac * height),
    w: snap(data.blockA.wFrac * width),
    h: snap(data.blockA.hFrac * height),
  };
  const bB: Rect = {
    x: snap(data.blockB.xFrac * width),
    y: snap(data.blockB.yFrac * height),
    w: snap(data.blockB.wFrac * width),
    h: snap(data.blockB.hFrac * height),
  };
  const bC: Rect = {
    x: snap(data.blockC.xFrac * width),
    y: snap(data.blockC.yFrac * height),
    w: snap(data.blockC.wFrac * width),
    h: snap(data.blockC.hFrac * height),
  };

  // ── Card stack ──
  // Always show up to 3 static cards from the current scene's history.
  // The "top" card = current scene. Below it are the 1-2 previous scenes.
  const stackScenes: SceneConfig[] = [];
  for (let i = Math.max(0, sceneIndex - 2); i <= sceneIndex; i++) {
    stackScenes.push(data.scenes[i]);
  }

  // ── Incoming card animation ──
  const nextScene =
    sceneIndex < data.scenes.length - 1 ? data.scenes[sceneIndex + 1] : null;
  const exitZoneStart = sceneLen - transitionFrames;
  const isTransitioning = localFrame >= exitZoneStart && nextScene !== null;

  // Incoming card slides from +height to 0
  let incomingY = height; // off-screen below
  if (isTransitioning) {
    const transLocal = localFrame - exitZoneStart;
    incomingY = snap(
      interpolate(transLocal, [0, transitionFrames], [height, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      })
    );
  }

  // Top card = top of the visible stack
  const topScene = stackScenes[stackScenes.length - 1];

  return (
    <AbsoluteFill style={{ backgroundColor: data.bgColor, overflow: "hidden" }}>
      {/* Static card stack — oldest at bottom, newest on top */}
      {stackScenes.map((s, i) => (
        <Card
          key={`stack-${sceneIndex - (stackScenes.length - 1 - i)}`}
          scene={s}
          bA={bA}
          bB={bB}
          bC={bC}
          zIndex={i + 1}
        />
      ))}

      {/* Incoming card — only this one animates */}
      {isTransitioning && nextScene && (
        <Card
          key={`incoming-${sceneIndex + 1}`}
          scene={nextScene}
          bA={bA}
          bB={bB}
          bC={bC}
          translateY={incomingY}
          zIndex={stackScenes.length + 1}
        />
      )}

      {/* Header */}
      <HeaderBar
        leftText={data.headerLeftText}
        rightText={data.headerRightText}
        yFrac={data.headerYFrac}
        canvasW={width}
        canvasH={height}
        blockColorBehindLeft={topScene.topLeftColor}
      />
    </AbsoluteFill>
  );
};
