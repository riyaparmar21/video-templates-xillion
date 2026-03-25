import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  random,
} from "remotion";
import { AbsoluteFill } from "remotion";
import type { TemplateProps } from "../engine/schema";
import {
  fadeIn,
  slideIn,
  scaleIn,
  blurIn,
  springIn,
  float,
  breathe,
  shimmer,
  rotate,
  pulseGlow,
  staggerDelay,
  staggerProgress,
  rgba,
  metallicGradient,
  glowShadow,
  depthShadow,
  glassStyle,
} from "../lib/animations";

export const ListReveal: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Params with defaults
  const items: string[] = params.items ?? ["Item 1", "Item 2", "Item 3"];
  const rawStyle = params.style ?? "bullets";
  const style =
    rawStyle === "bullet" || rawStyle === "bullets"
      ? "bullets"
      : rawStyle === "numbered" || rawStyle === "numbers"
        ? "numbers"
        : rawStyle === "cards"
          ? "bullets"
          : rawStyle; // "bullets", "numbers", "checkmarks", "arrows"
  const staggerDelayFrames = params.staggerDelay ?? 20;
  const title = params.title ?? undefined;
  const itemColor = params.itemColor ?? params.accentColor ?? palette.accent;

  const totalItems = Math.min(items.length, 8); // Max 8 items

  // Title animation
  const titleDelay = 0;
  const titleOpacity = fadeIn(frame, titleDelay, 20);
  const titleY = slideIn(frame, titleDelay, "down", 40, 25).y;

  // Calculate animation for each item
  const getItemStyle = (index: number) => {
    const itemDelay = (title ? 40 : 0) + index * staggerDelayFrames;
    const itemFrame = frame - itemDelay;

    if (itemFrame < 0) {
      return {
        opacity: 0,
        x: -60,
        blurVal: 8,
        scale: 0.9,
        accentWidth: 0,
      };
    }

    const progress = interpolate(itemFrame, [0, 20], [0, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    return {
      opacity: progress,
      x: -60 * (1 - progress),
      blurVal: 8 * (1 - progress),
      scale: 0.9 + progress * 0.1,
      accentWidth: progress * 4,
    };
  };

  // Render icon/bullet based on style
  const renderIcon = (index: number) => {
    const iconStyle = {
      width: "48px",
      height: "48px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginRight: "24px",
      flexShrink: 0,
      color: itemColor,
      fontSize: "36px",
      fontWeight: 600,
    };

    switch (style) {
      case "numbers":
        return (
          <div style={iconStyle}>
            {index + 1}
          </div>
        );
      case "checkmarks":
        return (
          <div style={iconStyle}>
            ✓
          </div>
        );
      case "arrows":
        return (
          <div style={iconStyle}>
            →
          </div>
        );
      case "bullets":
      default:
        return (
          <div
            style={{
              ...iconStyle,
              borderRadius: "50%",
              backgroundColor: itemColor,
              width: "8px",
              height: "8px",
              marginRight: "16px",
            }}
          />
        );
    }
  };

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "50px 100px",
      }}
    >
      {/* Full-screen ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `
          radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(itemColor, 0.12)} 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.primary, 0.07)} 0%, transparent 55%),
          radial-gradient(ellipse 50% 35% at 75% 25%, ${rgba(palette.secondary, 0.05)} 0%, transparent 55%)
        `,
        pointerEvents: "none",
      }} />

      {/* Vignette */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        background: `radial-gradient(ellipse 65% 55% at 50% 45%, transparent 30%, ${rgba(palette.background, 0.7)} 100%)`,
        pointerEvents: "none",
      }} />

      {/* Subtle gradient background */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(135deg, ${rgba(itemColor, 0.05)} 0%, transparent 50%, ${rgba(itemColor, 0.02)} 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: "64px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            marginBottom: "50px",
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {title}
        </div>
      )}

      {/* Items list */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {Array.from({ length: totalItems }).map((_, index) => {
          const itemStyle = getItemStyle(index);
          const item = items[index];

          // Breathing animation for items
          const breatheScale = frame > (title ? 40 : 0) + (index + 1) * staggerDelayFrames + 30
            ? breathe(frame - ((title ? 40 : 0) + (index + 1) * staggerDelayFrames + 30), 45, 0.02)
            : 1;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "36px",
                opacity: itemStyle.opacity,
                transform: `translateX(${itemStyle.x}px) scale(${itemStyle.scale * breatheScale})`,
                filter: `blur(${itemStyle.blurVal}px)`,
                transformOrigin: "left center",
              }}
            >
              {/* Left accent bar */}
              <div
                style={{
                  width: "4px",
                  height: "60px",
                  backgroundColor: itemColor,
                  borderRadius: "2px",
                  marginRight: "20px",
                  opacity: itemStyle.accentWidth > 0 ? 1 : 0,
                  transform: `scaleY(${itemStyle.accentWidth / 4})`,
                  transformOrigin: "center",
                }}
              />

              {/* Icon */}
              {renderIcon(index)}

              {/* Item text */}
              <div
                style={{
                  fontSize: "44px",
                  fontWeight: 500,
                  color: palette.text,
                  fontFamily: typography.body,
                  flex: 1,
                }}
              >
                {item}
              </div>

              {/* Subtle glow line */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  background: `linear-gradient(90deg, transparent, ${rgba(itemColor, 0.3)}, transparent)`,
                  opacity: itemStyle.opacity * 0.5,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Shimmer effect over list items */}
      <div
        style={{
          position: "absolute",
          top: title ? "140px" : "80px",
          left: "100px",
          right: "100px",
          height: `${totalItems * 50}px`,
          background: `linear-gradient(90deg, transparent ${shimmer(frame, 30, 0) - 20}%, ${rgba(itemColor, 0.15)} ${shimmer(frame, 30, 0)}%, transparent ${shimmer(frame, 30, 0) + 20}%)`,
          pointerEvents: "none",
          opacity: 0.3,
        }}
      />

      {/* Decorative corner accents */}
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "40px",
          width: "60px",
          height: "60px",
          border: `2px solid ${rgba(itemColor, fadeIn(frame, 30, 20) * 0.3)}`,
          borderRight: "none",
          borderBottom: "none",
          borderRadius: "8px 0 0 0",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "40px",
          width: "60px",
          height: "60px",
          border: `2px solid ${rgba(itemColor, fadeIn(frame, 35, 20) * 0.3)}`,
          borderLeft: "none",
          borderTop: "none",
          borderRadius: "0 0 0 8px",
        }}
      />

      {/* Pulsing glow effect around items area */}
      {frame > (title ? 40 : 0) + staggerDelayFrames && (
        <div
          style={{
            position: "absolute",
            top: title ? "130px" : "70px",
            left: "80px",
            width: "calc(100% - 160px)",
            height: `${totalItems * 50 + 40}px`,
            border: `2px solid ${rgba(itemColor, pulseGlow(frame, 35, 0.05, 0.2))}`,
            borderRadius: "12px",
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
