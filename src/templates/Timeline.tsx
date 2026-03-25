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

export const Timeline: React.FC<TemplateProps> = ({
  params,
  palette,
  typography,
  sceneDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Params with defaults
  const events = params.events ?? [
    { time: "2020", label: "Event 1", detail: "Description" },
    { time: "2021", label: "Event 2", detail: "Description" },
    { time: "2022", label: "Event 3", detail: "Description" },
  ];
  const orientation = params.orientation ?? "horizontal"; // "horizontal" | "vertical"
  const style = params.style ?? "dots"; // "dots" | "bars" | "cards"
  const progressStyle = params.progressStyle ?? "glow"; // "fill" | "glow" | "pulse"
  const title = params.title ?? undefined;

  const eventCount = events.length;
  const framesPerEvent = 25;
  const totalEventFrames = eventCount * framesPerEvent;

  // Timeline line drawing progress
  const lineProgress = interpolate(frame, [15, 15 + totalEventFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Calculate leading glow position
  const glowPosition = lineProgress * 100;

  // Title entrance
  const titleOpacity = fadeIn(frame, 0, 15);
  const titleSlide = slideIn(frame, 0, "down", 30, 20);

  return (
    <AbsoluteFill
      style={{
        background: palette.background,
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `
            radial-gradient(ellipse 80% 60% at 50% 45%, ${rgba(palette.primary, 0.12)} 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 30% 70%, ${rgba(palette.accent, 0.07)} 0%, transparent 55%),
            radial-gradient(ellipse 50% 35% at 75% 25%, ${rgba(palette.secondary, 0.05)} 0%, transparent 55%)
          `,
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `radial-gradient(ellipse 65% 55% at 50% 50%, transparent 30%, ${rgba(palette.background, 0.7)} 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Title */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: `translate(-50%, -50%) translateY(${titleSlide.y}px)`,
            fontSize: "64px",
            fontWeight: 700,
            color: palette.text,
            fontFamily: typography.heading,
            textAlign: "center",
            opacity: titleOpacity,
          }}
        >
          {title}
        </div>
      )}

      {orientation === "horizontal" && (
        <div
          style={{
            position: "absolute",
            top: title ? "35%" : "45%",
            left: "10%",
            width: "80%",
            height: "300px",
          }}
        >
          {/* Timeline background line */}
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {/* Base line */}
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke={rgba(palette.accent, 0.2)}
              strokeWidth="4"
            />

            {/* Progress line (fill) */}
            {progressStyle === "fill" && (
              <line
                x1="0"
                y1="50%"
                x2={`${lineProgress * 100}%`}
                y2="50%"
                stroke={palette.accent}
                strokeWidth="4"
              />
            )}

            {/* Progress line (glow) */}
            {progressStyle === "glow" && (
              <>
                <line
                  x1="0"
                  y1="50%"
                  x2={`${lineProgress * 100}%`}
                  y2="50%"
                  stroke={palette.accent}
                  strokeWidth="4"
                  opacity="0.5"
                />
                <circle
                  cx={`${glowPosition}%`}
                  cy="50%"
                  r={Math.max(4, 8 * pulseGlow(frame, 20, 0.5, 1))}
                  fill={palette.accent}
                  filter="url(#glow)"
                />
              </>
            )}

            {/* Pulse progress markers */}
            {progressStyle === "pulse" &&
              events.map((_: any, idx: number) => {
                const eventFrame = 15 + idx * framesPerEvent;
                const eventProgress = Math.max(0, frame - eventFrame);
                const pulseScale =
                  eventProgress > 0
                    ? 1 + (Math.sin(eventProgress / 5) * 0.3) / (idx + 1)
                    : 1;
                const x = ((idx + 1) / (eventCount + 1)) * 100;
                return (
                  <circle
                    key={idx}
                    cx={`${x}%`}
                    cy="50%"
                    r={4 * pulseScale}
                    fill={palette.accent}
                    opacity={eventProgress > 0 ? 0.8 : 0.3}
                  />
                );
              })}

            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          {/* Event markers */}
          {events.map((event: any, idx: number) => {
            const eventFrame = 15 + idx * framesPerEvent;
            const eventProgress = staggerProgress(
              frame,
              idx,
              eventCount,
              totalEventFrames,
              framesPerEvent
            );
            const eventOpacity = fadeIn(frame, eventFrame, 15);
            const xPercent = ((idx + 1) / (eventCount + 1)) * 100;
            const labelSlide = slideIn(frame, eventFrame, "down", 40, 15);

            return (
              <div key={idx} style={{ position: "relative", height: "100%" }}>
                {/* Marker dot/bar */}
                {style === "dots" && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${xPercent}%`,
                      top: "50%",
                      transform: `translate(-50%, -50%) scale(${scaleIn(frame, eventFrame, 0.5, 1, 15)})`,
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: palette.accent,
                      boxShadow: glowShadow(palette.accent, pulseGlow(frame, 25, 0.4, 0.9), 15),
                      opacity: eventOpacity,
                    }}
                  />
                )}

                {style === "bars" && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${xPercent}%`,
                      top: "35%",
                      transform: `translate(-50%, 0) scaleY(${scaleIn(frame, eventFrame, 0.3, 1, 15)})`,
                      width: "16px",
                      height: "40px",
                      background: palette.accent,
                      borderRadius: "4px",
                      boxShadow: glowShadow(palette.accent, pulseGlow(frame, 25, 0.4, 0.9), 15),
                      opacity: eventOpacity,
                    }}
                  />
                )}

                {style === "cards" && (
                  <div
                    style={{
                      position: "absolute",
                      left: `${xPercent}%`,
                      top: "30%",
                      transform: `translate(-50%, 0) scale(${scaleIn(frame, eventFrame, 0.6, 1, 15)})`,
                      ...glassStyle(0.1, 15, 0.2),
                      padding: "12px 16px",
                      minWidth: "80px",
                      opacity: eventOpacity,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "24px",
                        fontWeight: 600,
                        color: palette.accent,
                        textAlign: "center",
                      }}
                    >
                      {event.time}
                    </div>
                  </div>
                )}

                {/* Event label */}
                <div
                  style={{
                    position: "absolute",
                    left: `${xPercent}%`,
                    top: style === "cards" ? "70%" : "65%",
                    transform: `translate(-50%, 0) translateY(${labelSlide.y}px)`,
                    textAlign: "center",
                    minWidth: "160px",
                    opacity: eventOpacity,
                  }}
                >
                  <div
                    style={{
                      fontSize: "36px",
                      fontWeight: 600,
                      color: palette.text,
                      fontFamily: typography.heading,
                      marginBottom: "8px",
                    }}
                  >
                    {event.label}
                  </div>
                  {event.detail && (
                    <div
                      style={{
                        fontSize: "24px",
                        color: rgba(palette.text, 0.55),
                        fontFamily: typography.body,
                      }}
                    >
                      {event.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orientation === "vertical" && (
        <div
          style={{
            position: "absolute",
            left: title ? "7.5%" : "7.5%",
            top: title ? "25%" : "15%",
            width: "85%",
            height: "75%",
          }}
        >
          {/* Vertical timeline line */}
          <svg
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {/* Base line */}
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke={rgba(palette.accent, 0.2)}
              strokeWidth="4"
            />

            {/* Progress line */}
            {progressStyle === "fill" && (
              <line
                x1="50%"
                y1="0"
                x2="50%"
                y2={`${lineProgress * 100}%`}
                stroke={palette.accent}
                strokeWidth="4"
              />
            )}

            {progressStyle === "glow" && (
              <>
                <line
                  x1="50%"
                  y1="0"
                  x2="50%"
                  y2={`${lineProgress * 100}%`}
                  stroke={palette.accent}
                  strokeWidth="4"
                  opacity="0.5"
                />
                <circle
                  cx="50%"
                  cy={`${glowPosition}%`}
                  r={Math.max(4, 8 * pulseGlow(frame, 20, 0.5, 1))}
                  fill={palette.accent}
                  filter="url(#glowV)"
                />
              </>
            )}

            <defs>
              <filter id="glowV">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          {/* Vertical event markers — alternating left/right sides */}
          {events.map((event: any, idx: number) => {
            const eventFrame = 15 + idx * framesPerEvent;
            const eventProgress = staggerProgress(
              frame,
              idx,
              eventCount,
              totalEventFrames,
              framesPerEvent
            );
            const eventOpacity = fadeIn(frame, eventFrame, 15);
            const yPercent = ((idx + 1) / (eventCount + 1)) * 100;

            // Alternate sides: even=left, odd=right
            const isLeft = idx % 2 === 0;
            const slideDir = isLeft ? "left" : "right";
            const labelSlide = slideIn(frame, eventFrame, slideDir as any, 50, 15);

            return (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: `${yPercent}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Center dot marker */}
                <div
                  style={{
                    position: "absolute",
                    left: "-12px",
                    top: "-12px",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: palette.accent,
                    boxShadow: glowShadow(palette.accent, pulseGlow(frame, 25, 0.4, 0.9), 15),
                    opacity: eventOpacity,
                    transform: `scale(${scaleIn(frame, eventFrame, 0.5, 1, 15)})`,
                    zIndex: 2,
                  }}
                />

                {/* Horizontal connector line from dot to label */}
                <div
                  style={{
                    position: "absolute",
                    top: "-1px",
                    ...(isLeft
                      ? { right: "20px", width: "60px" }
                      : { left: "20px", width: "60px" }),
                    height: "3px",
                    background: `linear-gradient(${isLeft ? "to left" : "to right"}, ${palette.accent}, transparent)`,
                    opacity: eventOpacity,
                    transform: `scaleX(${scaleIn(frame, eventFrame, 0, 1, 15)})`,
                    transformOrigin: isLeft ? "right" : "left",
                  }}
                />

                {/* Label — alternating side */}
                <div
                  style={{
                    position: "absolute",
                    ...(isLeft
                      ? { right: "50px", textAlign: "right" as const }
                      : { left: "50px", textAlign: "left" as const }),
                    top: "-40px",
                    opacity: eventOpacity,
                    transform: `translateX(${labelSlide.x}px)`,
                    width: `${Math.min(380, width * 0.38)}px`,
                  }}
                >
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      color: palette.text,
                      fontFamily: typography.heading,
                      marginBottom: "6px",
                      letterSpacing: "1px",
                    }}
                  >
                    {event.time}
                  </div>
                  <div
                    style={{
                      fontSize: "30px",
                      fontWeight: 600,
                      color: palette.accent,
                      fontFamily: typography.body,
                      marginBottom: "4px",
                      lineHeight: 1.3,
                    }}
                  >
                    {event.label}
                  </div>
                  {event.detail && (
                    <div
                      style={{
                        fontSize: "24px",
                        color: rgba(palette.text, 0.5),
                        lineHeight: 1.4,
                      }}
                    >
                      {event.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
