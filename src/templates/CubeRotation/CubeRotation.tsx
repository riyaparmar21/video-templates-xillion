import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* ── Types ── */
interface CubeImage {
  image: string;
  label?: string;
}

interface CubeRotationData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;
  images?: CubeImage[];
  /* Cube face size as % of canvas width (default 65) */
  cubeSizePercent?: number;
  /* Border radius on each face (default 16) */
  borderRadius?: number;
  /* Pause on each face before rotating (seconds, default 1.2) */
  holdSeconds?: number;
  /* Rotation duration in frames (default 24) */
  rotateDuration?: number;
  /* X-axis tilt for perspective depth (default 0) */
  tiltX?: number;
  /* Optional headline above cube */
  headline?: string;
  /* Colors */
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

interface Props {
  data: CubeRotationData;
}

/* ── Helpers ── */
const resolveImg = (src: string): string => {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return staticFile(src);
};

/* ── Component ── */
export const CubeRotation: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const images = data.images ?? [];
  const faceCount = images.length;
  if (faceCount < 2) {
    return (
      <AbsoluteFill style={{ backgroundColor: data.bgColor ?? "#0A0A0A" }} />
    );
  }

  const cubeSizePx = (width * (data.cubeSizePercent ?? 65)) / 100;
  const borderRadius = data.borderRadius ?? 16;
  const tiltX = data.tiltX ?? 0;
  const totalFrames =
    data.durationFrames ?? Math.round((data.durationMs / 1000) * fps);

  const bgColor = data.bgColor ?? "#0A0A0A";
  const textColor = data.textColor ?? "#FFFFFF";
  const accentColor = data.accentColor ?? "#029D50";
  const headline = data.headline ?? "";

  /* Half the cube face size — used for translateZ */
  const halfFace = cubeSizePx / 2;

  const totalRotations = faceCount - 1;
  const totalDegrees = totalRotations * 90;

  /*
   * Continuous rotation — no holds, no pauses.
   * The cube rotates smoothly from 0° to totalDegrees over the full scene.
   * Uses ease-in-out so it starts and ends gracefully.
   */
  // Rotation completes in 60% of the scene, last face stays visible for remaining 40%
  const rotationEnd = Math.floor(totalFrames * 0.6);
  const progress = interpolate(frame, [0, rotationEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Smooth ease-in-out curve
  const eased = 0.5 - 0.5 * Math.cos(progress * Math.PI);
  const rotationAngle = eased * totalDegrees;

  // Entrance: quick scale-in over first 12 frames
  const entranceScale = interpolate(frame, [0, 12], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const entranceOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Exit fade (last 15%)
  const exitStart = Math.floor(totalFrames * 0.85);
  const exitOpacity =
    frame >= exitStart
      ? interpolate(frame, [exitStart, totalFrames], [1, 0], {
          extrapolateRight: "clamp",
        })
      : 1;

  /* No float — keep images steady */
  const floatY = 0;

  /* No idle rotation — keep images straight */
  const idleRotation = 0;

  /* Cube face styles */
  const faceStyle = (faceIdx: number): React.CSSProperties => {
    const angle = faceIdx * 90;
    return {
      position: "absolute",
      width: cubeSizePx,
      height: cubeSizePx * 1.2,
      borderRadius,
      overflow: "hidden",
      backfaceVisibility: "hidden",
      transform: `rotateY(${angle}deg) translateZ(${halfFace}px)`,
      boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
    };
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        opacity: exitOpacity * entranceOpacity,
        perspective: 1200,
      }}
    >
      {/* Headline */}
      {headline && (
        <div
          style={{
            position: "absolute",
            top: "10%",
            width: "100%",
            textAlign: "center",
            color: (data as any).headlineColor ?? textColor,
            fontSize: (data as any).headlineFontSize ?? 52,
            fontWeight: 800,
            fontFamily: (data as any).headlineFontFamily
              ? `${(data as any).headlineFontFamily}, sans-serif`
              : "Inter, Helvetica Neue, Arial, sans-serif",
            letterSpacing: 2,
            textTransform: "uppercase" as const,
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
            zIndex: 10,
          }}
        >
          {headline}
        </div>
      )}

      {/* Ambient glow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: cubeSizePx * 1.5,
          height: cubeSizePx * 1.5,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}22 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          filter: "blur(40px)",
        }}
      />

      {/* Cube container */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: cubeSizePx,
          height: cubeSizePx * 1.2,
          transformStyle: "preserve-3d",
          transform: `
            translate(-50%, -50%)
            translateY(${floatY}px)
            scale(${entranceScale})
            rotateX(${tiltX}deg)
            rotateY(${-rotationAngle + idleRotation}deg)
          `,
        }}
      >
        {images.map((img, i) => (
          <div key={i} style={faceStyle(i)}>
            {img.image && (
              <Img
                src={resolveImg(img.image)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}
            {img.label && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "20px 16px 16px",
                  background:
                    "linear-gradient(transparent, rgba(0,0,0,0.7))",
                  color: textColor,
                  fontSize: 24,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  letterSpacing: 0.5,
                }}
              >
                {img.label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reflection */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "65%",
          width: cubeSizePx,
          height: cubeSizePx * 0.4,
          transformStyle: "preserve-3d",
          transform: `
            translate(-50%, 0)
            rotateX(${180 - tiltX}deg)
            rotateY(${-rotationAngle + idleRotation}deg)
            scaleY(0.3)
          `,
          opacity: 0.15,
          filter: "blur(4px)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
        }}
      >
        {images.map((img, i) => (
          <div key={`ref-${i}`} style={faceStyle(i)}>
            {img.image && (
              <Img
                src={resolveImg(img.image)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
