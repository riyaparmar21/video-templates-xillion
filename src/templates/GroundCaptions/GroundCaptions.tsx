import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Img,
  staticFile,
  OffthreadVideo,
} from "remotion";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
const archivoBlack = loadArchivoBlack("normal", {
  weights: ["400"],
});

/**
 * Dynamically load a Google Font by family name.
 * Falls back to Archivo Black if not specified.
 */
function useGoogleFont(fontFamily?: string): string {
  const resolvedFamily = fontFamily || "Archivo Black";

  useMemo(() => {
    if (resolvedFamily === "Archivo Black") return; // already loaded above

    // Load via Google Fonts CSS (works in Remotion's browser renderer)
    const encoded = resolvedFamily.replace(/ /g, "+");
    const linkId = `gfont-${encoded}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;700;900&display=swap`;
      document.head.appendChild(link);
    }
  }, [resolvedFamily]);

  if (resolvedFamily === "Archivo Black") {
    return archivoBlack.fontFamily;
  }
  return `'${resolvedFamily}', ${archivoBlack.fontFamily}`;
}

export interface GroundCaptionLine {
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
}

export interface GroundCaptionsData {
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  durationMs: number;
  backgroundImage?: string | null;
  videoSrc?: string | null;
  showBackground?: boolean;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  enableShadow?: boolean;
  lineHeight?: number;
  animation?: string;
  blendMode?: string;
  textOpacity?: number;
  lines: GroundCaptionLine[];
  // 3D transform — rotateX tilts into ground, rotateZ matches floor direction
  perspective?: {
    distance?: number;
    rotateX?: number;
    rotateY?: number;
    rotateZ?: number;
    scaleY?: number;
  };
  position?: {
    x?: number;
    y?: number;
  };
}

const SPRING_CFG = { damping: 14, stiffness: 180, mass: 0.6 };

const FloorLine: React.FC<{
  line: GroundCaptionLine;
  frame: number;
  fps: number;
  fontSize: number;
  textColor: string;
  animation: string;
}> = React.memo(
  ({ line, frame, fps, fontSize, textColor, animation }) => {
    if (frame < line.startFrame) return null;

    const localFrame = Math.max(0, frame - line.startFrame);
    const progress = spring({ frame: localFrame, fps, config: SPRING_CFG });

    let animTransform = "";
    let animOpacity = 1;

    switch (animation) {
      case "slideForward": {
        const slideY = interpolate(progress, [0, 1], [80, 0]);
        animOpacity = interpolate(progress, [0, 1], [0, 1]);
        animTransform = `translateY(${slideY}px)`;
        break;
      }
      case "scaleUp": {
        const scale = interpolate(progress, [0, 1], [0.2, 1]);
        animOpacity = interpolate(progress, [0, 1], [0, 1]);
        animTransform = `scale(${scale})`;
        break;
      }
      case "fadeIn":
      default: {
        animOpacity = interpolate(progress, [0, 1], [0, 1]);
        break;
      }
    }

    return (
      <div
        style={{
          fontSize: line.fontSize ?? fontSize,
          color: line.color ?? textColor,
          opacity: animOpacity,
          transform: animTransform,
          transformOrigin: "center bottom",
        }}
      >
        {line.text}
      </div>
    );
  }
);

export const GroundCaptions: React.FC<{
  data: GroundCaptionsData;
}> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textColor = data.textColor ?? "#FFFFFF";
  const fontFamily = useGoogleFont(data.fontFamily);
  const fontSize = data.fontSize ?? 280;
  const lh = data.lineHeight ?? 0.85;
  const animation = data.animation ?? "slideForward";
  const blendMode = data.blendMode ?? "normal";
  const textOpacity = data.textOpacity ?? 0.95;
  const enableShadow = data.enableShadow !== false;

  // Simple 3D transform — just 3 rotations + stretch
  const perspDist = data.perspective?.distance ?? 300;
  const rotX = data.perspective?.rotateX ?? 70;
  const rotY = data.perspective?.rotateY ?? 0;
  const rotZ = data.perspective?.rotateZ ?? 0;
  const scY = data.perspective?.scaleY ?? 6.5;

  const posX = data.position?.x ?? 50;
  const posY = data.position?.y ?? 60;

  const bgImage = data.backgroundImage
    ? staticFile(data.backgroundImage)
    : null;

  // Build the full 3D transform matching the ground plane direction
  const transform3d = [
    `rotateX(${rotX}deg)`,
    rotY !== 0 ? `rotateY(${rotY}deg)` : "",
    rotZ !== 0 ? `rotateZ(${rotZ}deg)` : "",
    `scaleY(${scY})`,
  ].filter(Boolean).join(" ");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: data.showBackground !== false
          ? (data.backgroundColor ?? "#222")
          : "transparent",
      }}
    >
      {bgImage && (
        <AbsoluteFill>
          <Img
            src={bgImage}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}

      {data.videoSrc && (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(data.videoSrc)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      )}

      {/* Stage: position on ground, perspective container */}
      <div
        style={{
          position: "absolute",
          left: `${posX}%`,
          top: `${posY}%`,
          transform: "translate(-50%, -50%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          perspective: `${perspDist}px`,
          zIndex: 50,
        }}
      >
        {/* 3D ground text: rotateX tilts flat, rotateZ matches slope, scaleY stretches */}
        <div
          style={{
            textAlign: "center",
            lineHeight: lh,
            textTransform: "uppercase" as const,
            color: textColor,
            whiteSpace: "nowrap",
            fontFamily: fontFamily,
            fontWeight: 900,

            transform: transform3d,
            transformOrigin: "bottom center",

            filter: enableShadow
              ? "drop-shadow(0 10px 15px rgba(0,0,0,0.4))"
              : "none",

            mixBlendMode: blendMode as any,
            opacity: textOpacity,
          }}
        >
          {data.lines.map((line, i) => (
            <FloorLine
              key={i}
              line={line}
              frame={frame}
              fps={fps}
              fontSize={fontSize}
              textColor={textColor}
              animation={animation}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default GroundCaptions;
