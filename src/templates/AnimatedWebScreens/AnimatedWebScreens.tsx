import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
} from "remotion";

// ── Types ──

interface DeviceScreen {
  id: string;
  /** Image source — either a URL or staticFile path */
  src: string;
}

interface AnimatedWebScreensData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  /** 9 device screens for the 3×3 grid (top-left → bottom-right) */
  screens: [
    DeviceScreen, DeviceScreen, DeviceScreen,
    DeviceScreen, DeviceScreen, DeviceScreen,
    DeviceScreen, DeviceScreen, DeviceScreen,
  ];
  /** Extra screens that cycle in the center device (slides 2-5) */
  centerSlides?: DeviceScreen[];
  /** Background start color */
  bgColorStart?: string;
  /** Background end color */
  bgColorEnd?: string;
}

// ── Constants matching the animation spec ──

const ARTBOARD = { w: 1600, h: 1200 };
const DEVICE = { w: 348, h: 224, radius: 12, border: 8 };
const GRID_ORIGIN = { x: 78, y: 104 };
const GRID_SIZE = { w: 1444, h: 992 };

// Device positions within the grid (3×3)
const DEVICE_POSITIONS = [
  { x: 0, y: 0 },      // 01 top-left
  { x: 548, y: 0 },    // 02 top-center
  { x: 1096, y: 0 },   // 03 top-right
  { x: 0, y: 384 },    // 04 mid-left
  { x: 548, y: 384 },  // 05 mid-center (slider)
  { x: 1096, y: 384 }, // 06 mid-right
  { x: 0, y: 768 },    // 07 bot-left
  { x: 548, y: 768 },  // 08 bot-center
  { x: 1096, y: 768 }, // 09 bot-right
];

// Timing (ms) — converted to frames at runtime
const TIMING = {
  // Intro zoom
  zoomIn1: { start: 0, end: 500, from: 3, to: 1.75 },
  zoomIn2: { start: 500, end: 1000, from: 1.75, to: 1 },
  zoomOut: { start: 1100, end: 2000, from: 1, to: 2.7 },
  // Background color transition
  bgTransition: { start: 1100, end: 2000 },
  // Center device slide transitions (maskSlide)
  slides: [
    { start: 1100, end: 2300 }, // screen01 → screen02
    { start: 2600, end: 3800 }, // screen02 → screen03
    { start: 3800, end: 5300 }, // screen03 → screen04  (adjusted for seamless)
    { start: 5600, end: 6800 }, // screen04 → screen05
  ],
};

// ── Shared utilities ──
import { msToFrame, lerpColor } from "../../lib";

// Use Remotion's built-in Easing
const easeOut = Easing.out(Easing.quad);

// ── Device Frame Component ──

const DeviceFrame: React.FC<{
  x: number;
  y: number;
  children: React.ReactNode;
}> = ({ x, y, children }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: DEVICE.w,
        height: DEVICE.h,
        borderRadius: DEVICE.radius,
        border: `${DEVICE.border}px solid #000000`,
        overflow: "hidden",
        background: "#1a1a2e",
      }}
    >
      {children}
    </div>
  );
};

// ── Static Device Screen ──

const StaticScreen: React.FC<{ src: string }> = ({ src }) => (
  <Img
    src={src}
    style={{
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />
);

// ── Sliding Center Device (horizontal mask transitions) ──

const SlidingCenterDevice: React.FC<{
  screens: DeviceScreen[];
  fps: number;
}> = ({ screens, fps }) => {
  const frame = useCurrentFrame();

  // Calculate which screen is visible and the slide offset
  let currentIndex = 0;
  let slideOffset = 0;

  for (let i = 0; i < TIMING.slides.length && i < screens.length - 1; i++) {
    const slide = TIMING.slides[i];
    const startFrame = msToFrame(slide.start, fps);
    const endFrame = msToFrame(slide.end, fps);

    if (frame >= endFrame) {
      // This transition is complete
      currentIndex = i + 1;
      slideOffset = 0;
    } else if (frame >= startFrame) {
      // Currently transitioning
      currentIndex = i;
      const rawProgress = (frame - startFrame) / (endFrame - startFrame);
      const progress = easeOut(Math.min(1, Math.max(0, rawProgress)));
      slideOffset = progress * DEVICE.w;
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: DEVICE.w,
        height: DEVICE.h,
        overflow: "hidden",
      }}
    >
      {/* Current screen (slides out left) */}
      {screens[currentIndex] && (
        <div
          style={{
            position: "absolute",
            left: -slideOffset,
            top: 0,
            width: DEVICE.w,
            height: DEVICE.h,
          }}
        >
          <StaticScreen src={screens[currentIndex].src} />
        </div>
      )}
      {/* Next screen (slides in from right) */}
      {slideOffset > 0 && screens[currentIndex + 1] && (
        <div
          style={{
            position: "absolute",
            left: DEVICE.w - slideOffset,
            top: 0,
            width: DEVICE.w,
            height: DEVICE.h,
          }}
        >
          <StaticScreen src={screens[currentIndex + 1].src} />
        </div>
      )}
    </div>
  );
};

// ── Main Component ──

export const AnimatedWebScreens: React.FC<{
  data: AnimatedWebScreensData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgStart = data.bgColorStart || "#F0F9FF";
  const bgEnd = data.bgColorEnd || "#17082C";

  // ── Background color ──
  const bgTransStart = msToFrame(TIMING.bgTransition.start, fps);
  const bgTransEnd = msToFrame(TIMING.bgTransition.end, fps);
  const bgProgress = Math.min(1, Math.max(0,
    (frame - bgTransStart) / (bgTransEnd - bgTransStart)
  ));
  const bgColor = frame < bgTransStart
    ? bgStart
    : lerpColor(bgStart, bgEnd, easeOut(bgProgress));

  // ── Grid scale (intro zoom) ──
  let gridScale = 3; // start zoomed in

  // Phase 1: 3 → 1.75 (0-500ms, slowDown)
  const z1Start = msToFrame(TIMING.zoomIn1.start, fps);
  const z1End = msToFrame(TIMING.zoomIn1.end, fps);
  if (frame >= z1Start && frame < z1End) {
    const t = easeOut((frame - z1Start) / (z1End - z1Start));
    gridScale = interpolate(t, [0, 1], [3, 1.75]);
  } else if (frame >= z1End) {
    gridScale = 1.75;
  }

  // Phase 2: 1.75 → 1 (500-1000ms, slowDown)
  const z2Start = msToFrame(TIMING.zoomIn2.start, fps);
  const z2End = msToFrame(TIMING.zoomIn2.end, fps);
  if (frame >= z2Start && frame < z2End) {
    const t = easeOut((frame - z2Start) / (z2End - z2Start));
    gridScale = interpolate(t, [0, 1], [1.75, 1]);
  } else if (frame >= z2End) {
    gridScale = 1;
  }

  // Phase 3: 1 → 2.7 (1100-2000ms, natural/linear)
  const z3Start = msToFrame(TIMING.zoomOut.start, fps);
  const z3End = msToFrame(TIMING.zoomOut.end, fps);
  if (frame >= z3Start && frame < z3End) {
    const t = (frame - z3Start) / (z3End - z3Start);
    gridScale = interpolate(t, [0, 1], [1, 2.7]);
  } else if (frame >= z3End) {
    gridScale = 2.7;
  }

  // Build center device slides array
  const centerSlides: DeviceScreen[] = [
    data.screens[4], // center device initial screen
    ...(data.centerSlides || []),
  ];

  // Scale factor to fit artboard into composition
  const scaleX = data.width / ARTBOARD.w;
  const scaleY = data.height / ARTBOARD.h;
  const fitScale = Math.min(scaleX, scaleY);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Artboard container — scaled to fit composition */}
      <div
        style={{
          width: ARTBOARD.w,
          height: ARTBOARD.h,
          position: "relative",
          transform: `scale(${fitScale})`,
          transformOrigin: "center center",
        }}
      >
        {/* Grid container — with zoom animation */}
        <div
          style={{
            position: "absolute",
            left: GRID_ORIGIN.x,
            top: GRID_ORIGIN.y,
            width: GRID_SIZE.w,
            height: GRID_SIZE.h,
            transform: `scale(${gridScale})`,
            transformOrigin: "center center",
          }}
        >
          {/* Render all 9 devices */}
          {DEVICE_POSITIONS.map((pos, i) => {
            const isCenterDevice = i === 4;

            return (
              <DeviceFrame key={i} x={pos.x} y={pos.y}>
                {isCenterDevice ? (
                  <SlidingCenterDevice
                    screens={centerSlides}
                    fps={fps}
                  />
                ) : (
                  data.screens[i] && (
                    <StaticScreen src={data.screens[i].src} />
                  )
                )}
              </DeviceFrame>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default AnimatedWebScreens;
