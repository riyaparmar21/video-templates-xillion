import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  AbsoluteFill,
  Img,
  staticFile,
} from "remotion";

// ── Types ──
export interface StackHiringData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor: string;
  textColor: string;
  brandName: string;
  brandUrl: string;
  footerLine1: string;
  footerLine2: string;
  titleText: string;
  titleFont: string;
  titleFontWeight: number;
  titleFontSize: number;
  roles: string[];
  roleFont: string;
  roleFontWeight: number;
  roleFontSize: number;
  roleLineHeight: number;
  scrollSpeedMs: number;
  ctaLine1: string;
  ctaLine2: string;
  ctaButton: string;
  ctaLine1Size: number;
  ctaLine2Size: number;
  ctaButtonSize: number;
  ctaBgImage: string;
  ctaFooterLine2: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonRadius: number;
}

// ── Helpers ──
function resolveImg(src: string): string {
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  return staticFile(src);
}

/** Clamp helper */
function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// ── Phase timing (ms) ──
const P1_END = 500;    // cyan fill done
const P2_END = 1400;   // header/footer + geometric shapes appear
const P3_END = 2400;   // "We're Hiring" hold
const P4_END = 3400;   // shapes expand, title fades → roles begin
const P5_END_OFFSET = 2000; // CTA transition starts this many ms before end
// Phase 6 runs until durationMs

// ── Geometric shapes ──
const SHAPE_COUNT = 4;

export const StackHiring: React.FC<{ data: StackHiringData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  const {
    bgColor,
    textColor,
    brandName,
    brandUrl,
    footerLine1,
    footerLine2,
    titleText,
    titleFont,
    titleFontWeight,
    titleFontSize,
    roles,
    roleFont,
    roleFontWeight,
    roleFontSize,
    roleLineHeight,
    scrollSpeedMs,
    ctaLine1,
    ctaLine2,
    ctaButton,
    ctaLine1Size,
    ctaLine2Size,
    ctaButtonSize,
    ctaBgImage,
    ctaFooterLine2,
    buttonColor,
    buttonTextColor,
    buttonRadius,
    width,
    height,
  } = data;

  const ctaStartMs = data.durationMs - P5_END_OFFSET;
  const roleScrollStartMs = P4_END;
  const roleScrollEndMs = ctaStartMs;

  // ── Phase progress helpers ──
  const headerOpacity = interpolate(timeMs, [P1_END, P1_END + 400], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const footerOpacity = headerOpacity;

  // ── Geometric shapes ──
  const shapeOpacity = interpolate(
    timeMs,
    [P1_END + 200, P2_END, P3_END, P4_END],
    [0, 0.15, 0.15, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const shapeScale = interpolate(
    timeMs,
    [P1_END + 200, P2_END, P3_END, P4_END],
    [0.3, 1, 1, 1.8],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // ── Title "We're Hiring" ──
  const titleOpacity = interpolate(
    timeMs,
    [P1_END + 400, P2_END, P3_END, P3_END + 400],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleScale = interpolate(
    timeMs,
    [P1_END + 400, P2_END],
    [0.8, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // ── Role scroll ──
  const roleCount = roles.length;
  const scrollDurationMs = roleScrollEndMs - roleScrollStartMs;
  // How many full cycles we want to show
  const totalRoleSlots = roleCount * 3; // 3 full cycles
  const msPerRole = scrollSpeedMs;

  // Current scroll position (in role-units)
  const scrollProgress =
    timeMs >= roleScrollStartMs && timeMs <= roleScrollEndMs
      ? (timeMs - roleScrollStartMs) / msPerRole
      : timeMs > roleScrollEndMs
        ? (roleScrollEndMs - roleScrollStartMs) / msPerRole
        : 0;

  // Role list opacity (fade in at start, fade out at transition to CTA)
  const roleListOpacity = interpolate(
    timeMs,
    [P3_END + 200, P4_END, ctaStartMs - 400, ctaStartMs],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── CTA scene ──
  const ctaProgress = interpolate(
    timeMs,
    [ctaStartMs, ctaStartMs + 800],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const ctaTextOpacity = interpolate(
    timeMs,
    [ctaStartMs + 400, ctaStartMs + 1000],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const ctaButtonOpacity = interpolate(
    timeMs,
    [ctaStartMs + 800, ctaStartMs + 1400],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── Visible role count for the list ──
  const visibleRoles = 9; // how many role lines to render (odd for center highlight)
  const centerIndex = Math.floor(visibleRoles / 2);

  // Build extended roles array for wrapping
  const extendedRoles: string[] = [];
  for (let i = 0; i < totalRoleSlots; i++) {
    extendedRoles.push(roles[i % roleCount]);
  }

  // Calculate which roles are visible
  const scrollOffset = scrollProgress;
  const startIdx = Math.floor(scrollOffset);

  // Sub-pixel offset for smooth scrolling
  const subPixelOffset = scrollOffset - startIdx;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor, overflow: "hidden" }}>
      {/* ── Geometric shapes (concentric rectangles + ellipses) ── */}
      {shapeOpacity > 0.001 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${shapeScale})`,
            opacity: shapeOpacity,
            width: width * 0.6,
            height: width * 0.6,
          }}
        >
          {Array.from({ length: SHAPE_COUNT }).map((_, i) => {
            const size = 100 - i * 20;
            const isCircle = i % 2 === 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: `${(100 - size) / 2}%`,
                  left: `${(100 - size) / 2}%`,
                  width: `${size}%`,
                  height: `${size}%`,
                  borderRadius: isCircle ? "50%" : "12%",
                  border: `3px solid ${textColor}`,
                  opacity: 0.3 - i * 0.05,
                  transform: `rotate(${i * 15}deg)`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Header bar ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          opacity: headerOpacity,
          zIndex: 10,
        }}
      >
        {/* Brand name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: ctaProgress > 0.5 ? "#ffffff" : textColor,
          }}
        >
          {/* Simple flower icon */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="8" r="4" fill="currentColor" opacity="0.8" />
            <circle cx="8" cy="14" r="4" fill="currentColor" opacity="0.8" />
            <circle cx="20" cy="14" r="4" fill="currentColor" opacity="0.8" />
            <circle cx="14" cy="20" r="4" fill="currentColor" opacity="0.8" />
            <circle cx="14" cy="14" r="3" fill="currentColor" />
          </svg>
          <span
            style={{
              fontFamily: roleFont,
              fontWeight: 700,
              fontSize: 32,
            }}
          >
            {brandName}
          </span>
        </div>
        {/* Brand URL */}
        <span
          style={{
            fontFamily: roleFont,
            fontWeight: 500,
            fontSize: 27,
            color: ctaProgress > 0.5 ? "#ffffff" : textColor,
          }}
        >
          {brandUrl}
        </span>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: footerOpacity,
          zIndex: 10,
        }}
      >
        <span
          style={{
            fontFamily: roleFont,
            fontWeight: 500,
            fontSize: 20,
            color: ctaProgress > 0.5 ? "#ffffff" : textColor,
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          {footerLine1}
        </span>
        <span
          style={{
            fontFamily: roleFont,
            fontWeight: 500,
            fontSize: 20,
            color: ctaProgress > 0.5 ? "#ffffff" : textColor,
            textAlign: "center",
          }}
        >
          {ctaProgress > 0.5 ? ctaFooterLine2 : footerLine2}
        </span>
      </div>

      {/* ── Title: "We're Hiring" ── */}
      {titleOpacity > 0.001 && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${titleScale})`,
            opacity: titleOpacity,
            zIndex: 5,
          }}
        >
          <span
            style={{
              fontFamily: titleFont,
              fontWeight: titleFontWeight,
              fontSize: titleFontSize,
              color: textColor,
              whiteSpace: "nowrap",
              letterSpacing: -1,
            }}
          >
            {titleText}
          </span>
        </div>
      )}

      {/* ── Role scroll list ── */}
      {roleListOpacity > 0.001 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: roleListOpacity,
            zIndex: 5,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: visibleRoles * roleLineHeight,
              overflow: "hidden",
            }}
          >
            {/* Render visible role lines */}
            {Array.from({ length: visibleRoles + 2 }).map((_, i) => {
              const roleIdx = startIdx + i;
              const roleName =
                extendedRoles[
                  ((roleIdx % extendedRoles.length) + extendedRoles.length) %
                    extendedRoles.length
                ];

              // Distance from center (in role-units)
              const distFromCenter = i - centerIndex - subPixelOffset;
              const absDistFromCenter = Math.abs(distFromCenter);

              // Opacity: center is full, fades toward edges
              const lineOpacity = interpolate(
                absDistFromCenter,
                [0, 1, 3, 5],
                [1, 0.5, 0.2, 0.05],
                { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
              );

              // Scale: center is slightly larger
              const lineScale = interpolate(
                absDistFromCenter,
                [0, 1.5],
                [1.1, 0.95],
                { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
              );

              // Font weight: center is bolder
              const isCenter = absDistFromCenter < 0.7;

              const yPos =
                (i - subPixelOffset) * roleLineHeight -
                roleLineHeight; // offset to account for extra top entry

              return (
                <div
                  key={`role-${i}-${roleIdx}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${yPos}px) scale(${lineScale})`,
                    opacity: lineOpacity,
                    height: roleLineHeight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: roleFont,
                      fontWeight: isCenter ? 900 : roleFontWeight,
                      fontSize: roleFontSize,
                      color: textColor,
                      letterSpacing: -1,
                      fontStyle: isCenter ? "italic" : "normal",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {roleName}
                  </span>
                </div>
              );
            })}

            {/* Top fade gradient */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: roleLineHeight * 2,
                background: `linear-gradient(to bottom, ${bgColor}, ${bgColor}00)`,
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
            {/* Bottom fade gradient */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: roleLineHeight * 2,
                background: `linear-gradient(to top, ${bgColor}, ${bgColor}00)`,
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
          </div>
        </div>
      )}

      {/* ── CTA scene overlay ── */}
      {ctaProgress > 0.001 && (
        <>
          {/* Background image (or dark gradient fallback) with overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: ctaProgress,
              zIndex: 4,
            }}
          >
            {ctaBgImage ? (
              <Img
                src={resolveImg(ctaBgImage)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: `linear-gradient(135deg, ${bgColor} 0%, #1a1a3e 50%, ${bgColor} 100%)`,
                }}
              />
            )}
            {/* Dark gradient overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 100%)",
              }}
            />
          </div>

          {/* CTA text content */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -60%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              zIndex: 8,
              opacity: ctaTextOpacity,
            }}
          >
            <span
              style={{
                fontFamily: roleFont,
                fontWeight: 500,
                fontSize: ctaLine1Size,
                color: "#ffffff",
                letterSpacing: -1,
                lineHeight: 1.1,
                textAlign: "center",
              }}
            >
              {ctaLine1}
            </span>
            <span
              style={{
                fontFamily: titleFont,
                fontWeight: 500,
                fontSize: ctaLine2Size,
                color: "#ffffff",
                letterSpacing: -1,
                lineHeight: 1.1,
                textAlign: "center",
              }}
            >
              {ctaLine2}
            </span>
          </div>

          {/* CTA button */}
          <div
            style={{
              position: "absolute",
              top: "65%",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 8,
              opacity: ctaButtonOpacity,
            }}
          >
            <div
              style={{
                backgroundColor: `${buttonColor}2e`,
                borderRadius: buttonRadius,
                padding: "24px 64px",
                backdropFilter: "blur(20px)",
                border: `1px solid ${buttonColor}44`,
              }}
            >
              <span
                style={{
                  fontFamily: roleFont,
                  fontWeight: 500,
                  fontSize: ctaButtonSize,
                  color: "#ffffff",
                  letterSpacing: 0,
                }}
              >
                {ctaButton}
              </span>
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};
