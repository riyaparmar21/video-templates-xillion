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
import { TemplateProps } from "../engine/schema";
import {
  fadeIn,
  fadeOut,
  scaleIn,
  slideIn,
  rgba,
  hexToRgb,
  glowShadow,
  depthShadow,
  springIn,
  staggerDelay,
  float,
  breathe,
} from "../lib/animations";

export const VideoOverlay: React.FC<TemplateProps> = ({ params, sceneDurationFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Parameter extraction with defaults
  const preset = (params.preset as string) || "lower_third";
  const title = (params.title as string) || "";
  const subtitle = (params.subtitle as string) || "";
  const position = (params.position as string) || "bottom";
  const showBackground = params.showBackground !== false;
  const animateIn = (params.animateIn as string) || "slide";
  const animateOut = (params.animateOut as string) || "fade";
  const icon = (params.icon as string) || "";
  const tag = (params.tag as string) || "";

  // Color palette
  const palette = {
    primary: "#00D9FF",
    accent: "#FF006E",
    background: "#000000",
    text: "#FFFFFF",
    secondary: "#14213D",
  };

  // Timeline segments
  const entranceFrames = 20;
  const exitStartFrame = sceneDurationFrames - 15;
  const isEntrance = frame < entranceFrames;
  const isExit = frame >= exitStartFrame;
  const isHold = frame >= entranceFrames && frame < exitStartFrame;

  // Entrance animation helper
  const getEntranceProgress = (): number => {
    if (!isEntrance) return 1;
    return interpolate(frame, [0, entranceFrames], [0, 1], {
      easing: Easing.out(Easing.cubic),
    });
  };

  // Exit animation helper
  const getExitProgress = (): number => {
    if (!isExit) return 1;
    return interpolate(frame, [exitStartFrame, sceneDurationFrames], [1, 0], {
      easing: Easing.in(Easing.cubic),
    });
  };

  const entranceProgress = getEntranceProgress();
  const exitProgress = getExitProgress();
  const combinedOpacity = entranceProgress * exitProgress;

  // Render entrance animation based on animateIn type
  const renderEntranceTransform = (): React.CSSProperties => {
    if (animateIn === "slide") {
      return {
        transform: `translateX(${interpolate(entranceProgress, [0, 1], [-300, 0])}px)`,
        opacity: entranceProgress,
      };
    } else if (animateIn === "fade") {
      return {
        opacity: fadeIn(entranceProgress),
      };
    } else if (animateIn === "spring") {
      const s = spring({
        fps,
        frame: Math.min(frame, entranceFrames),
        config: {
          damping: 0.8,
          mass: 1,
          stiffness: 200,
        },
      });
      return {
        transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
        opacity: s,
      };
    }
    return { opacity: entranceProgress };
  };

  // Render exit animation based on animateOut type
  const renderExitTransform = (): React.CSSProperties => {
    if (animateOut === "slide") {
      return {
        transform: `translateX(${interpolate(exitProgress, [1, 0], [0, 300])}px)`,
        opacity: exitProgress,
      };
    } else if (animateOut === "fade") {
      return {
        opacity: exitProgress,
      };
    } else if (animateOut === "scale") {
      return {
        transform: `scale(${interpolate(exitProgress, [1, 0], [1, 0.7])})`,
        opacity: exitProgress,
      };
    }
    return { opacity: exitProgress };
  };

  // LOWER_THIRD PRESET
  const renderLowerThird = (): React.ReactElement => {
    const entranceTransform = renderEntranceTransform();
    const exitTransform = renderExitTransform();
    const barWidth = width * 0.6;
    const barHeight = 100;
    const bottomMargin = 60;

    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            bottom: bottomMargin,
            left: 50,
            opacity: combinedOpacity,
            ...entranceTransform,
            ...exitTransform,
          }}
        >
          {/* Accent line */}
          <div
            style={{
              position: "absolute",
              top: -8,
              left: 0,
              width: barWidth,
              height: 3,
              backgroundColor: palette.primary,
              boxShadow: glowShadow(palette.primary),
            }}
          />

          {/* Background bar */}
          {showBackground && (
            <div
              style={{
                width: barWidth,
                height: barHeight,
                backgroundColor: rgba(palette.secondary, 0.85),
                backdropFilter: "blur(10px)",
                borderRight: `3px solid ${palette.primary}`,
              }}
            />
          )}

          {/* Text content */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 24,
              color: palette.text,
            }}
          >
            {/* Title */}
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: -0.5,
                marginBottom: 6,
                opacity: fadeIn(Math.max(0, entranceProgress - 0.3)),
              }}
            >
              {title}
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: rgba(palette.text, 0.8),
                opacity: fadeIn(Math.max(0, entranceProgress - 0.5)),
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* Tag badge */}
          {tag && (
            <div
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                paddingLeft: 12,
                paddingRight: 12,
                paddingTop: 6,
                paddingBottom: 6,
                backgroundColor: palette.accent,
                color: palette.text,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                borderRadius: 3,
                opacity: fadeIn(Math.max(0, entranceProgress - 0.4)),
              }}
            >
              {tag}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  };

  // CAPTION PRESET
  const renderCaption = (): React.ReactElement => {
    const entranceTransform = renderEntranceTransform();
    const exitTransform = renderExitTransform();
    const maxWidth = width * 0.8;

    return (
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            opacity: combinedOpacity,
            ...entranceTransform,
            ...exitTransform,
          }}
        >
          {/* Background pill */}
          {showBackground && (
            <div
              style={{
                position: "absolute",
                top: -20,
                left: -40,
                width: maxWidth + 80,
                height: 140,
                backgroundColor: rgba(palette.secondary, 0.8),
                borderRadius: 70,
                backdropFilter: "blur(12px)",
                border: `1px solid ${rgba(palette.primary, 0.3)}`,
                zIndex: -1,
              }}
            />
          )}

          {/* Caption text with typewriter effect if enabled */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: palette.text,
              maxWidth: maxWidth,
              lineHeight: 1.4,
              opacity: animateIn === "typewriter" ? entranceProgress : 1,
            }}
          >
            {title}
          </div>

          {/* Secondary text */}
          {subtitle && (
            <div
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: rgba(palette.text, 0.75),
                marginTop: 12,
                maxWidth: maxWidth,
                opacity: fadeIn(Math.max(0, entranceProgress - 0.3)),
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  };

  // HUD PRESET
  const renderHud = (): React.ReactElement => {
    const cornerSize = 40;
    const centerX = width / 2;
    const centerY = height / 2;
    const scanLineProgress = interpolate(
      frame % (60 / fps),
      [0, 60 / fps],
      [0, height]
    );

    return (
      <AbsoluteFill style={{ opacity: combinedOpacity }}>
        {/* Corner brackets */}
        <svg
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            width: cornerSize,
            height: cornerSize,
          }}
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
        >
          <path
            d={`M 0 0 L ${cornerSize * 0.4} 0 M 0 0 L 0 ${cornerSize * 0.4}`}
            stroke={palette.primary}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* Top-right corner */}
        <svg
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: cornerSize,
            height: cornerSize,
          }}
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
        >
          <path
            d={`M ${cornerSize * 0.6} 0 L ${cornerSize} 0 M ${cornerSize} 0 L ${cornerSize} ${cornerSize * 0.4}`}
            stroke={palette.primary}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* Bottom-left corner */}
        <svg
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            width: cornerSize,
            height: cornerSize,
          }}
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
        >
          <path
            d={`M 0 ${cornerSize * 0.6} L 0 ${cornerSize} M 0 ${cornerSize} L ${cornerSize * 0.4} ${cornerSize}`}
            stroke={palette.primary}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* Bottom-right corner */}
        <svg
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            width: cornerSize,
            height: cornerSize,
          }}
          viewBox={`0 0 ${cornerSize} ${cornerSize}`}
        >
          <path
            d={`M ${cornerSize * 0.6} ${cornerSize} L ${cornerSize} ${cornerSize} M ${cornerSize} ${cornerSize * 0.6} L ${cornerSize} ${cornerSize}`}
            stroke={palette.primary}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>

        {/* Scan line */}
        <div
          style={{
            position: "absolute",
            top: scanLineProgress,
            left: 0,
            width: "100%",
            height: 2,
            backgroundColor: rgba(palette.primary, 0.5),
            boxShadow: glowShadow(palette.primary),
          }}
        />

        {/* Center crosshair */}
        <svg
          style={{
            position: "absolute",
            top: centerY - 20,
            left: centerX - 20,
            width: 40,
            height: 40,
          }}
          viewBox="0 0 40 40"
        >
          <line
            x1="20"
            y1="5"
            x2="20"
            y2="15"
            stroke={palette.primary}
            strokeWidth="1.5"
          />
          <line
            x1="20"
            y1="25"
            x2="20"
            y2="35"
            stroke={palette.primary}
            strokeWidth="1.5"
          />
          <line
            x1="5"
            y1="20"
            x2="15"
            y2="20"
            stroke={palette.primary}
            strokeWidth="1.5"
          />
          <line
            x1="25"
            y1="20"
            x2="35"
            y2="20"
            stroke={palette.primary}
            strokeWidth="1.5"
          />
          <circle cx="20" cy="20" r="3" fill={palette.primary} />
        </svg>

        {/* Data readouts */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 20,
            fontSize: 11,
            color: palette.primary,
            fontFamily: "monospace",
            opacity: 0.6,
          }}
        >
          SYS: ONLINE
        </div>
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 20,
            fontSize: 11,
            color: palette.primary,
            fontFamily: "monospace",
            opacity: 0.6,
            textAlign: "right",
          }}
        >
          F{Math.floor(frame / fps)}s
        </div>
      </AbsoluteFill>
    );
  };

  // NAMEPLATE PRESET
  const renderNameplate = (): React.ReactElement => {
    const entranceTransform = renderEntranceTransform();
    const exitTransform = renderExitTransform();
    const barHeight = 120;
    const accentWidth = 6;

    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 40,
            top: position === "top" ? 40 : "auto",
            bottom: position === "bottom" ? 40 : "auto",
            opacity: combinedOpacity,
            ...entranceTransform,
            ...exitTransform,
          }}
        >
          {/* Accent strip */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: accentWidth,
              height: barHeight,
              backgroundColor: palette.accent,
              boxShadow: glowShadow(palette.accent),
            }}
          />

          {/* Background */}
          {showBackground && (
            <div
              style={{
                marginLeft: accentWidth,
                paddingLeft: 24,
                paddingRight: 32,
                paddingTop: 16,
                paddingBottom: 16,
                backgroundColor: rgba(palette.secondary, 0.75),
                backdropFilter: "blur(8px)",
                minWidth: 280,
              }}
            >
              {/* Name */}
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: palette.text,
                  marginBottom: 8,
                  opacity: fadeIn(Math.max(0, entranceProgress - 0.2)),
                }}
              >
                {title}
              </div>

              {/* Role/Title */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: palette.primary,
                  opacity: fadeIn(Math.max(0, entranceProgress - 0.4)),
                }}
              >
                {subtitle}
              </div>
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  };

  // SPLIT_TEXT PRESET
  const renderSplitText = (): React.ReactElement => {
    const entranceProgressTop = slideIn(entranceProgress, 0, "left");
    const entranceProgressBottom = slideIn(entranceProgress, 0, "right");
    const exitProgressTop = slideIn(exitProgress, 0, "right");
    const exitProgressBottom = slideIn(exitProgress, 0, "left");

    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {/* Top text */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: 0,
            width: "100%",
            textAlign: "center",
            opacity: combinedOpacity,
            transform: `translateX(${
              interpolate(entranceProgressTop.x, [0, 1], [-width / 2, 0]) +
              interpolate(exitProgressTop.x, [1, 0], [0, -width / 2])
            }px)`,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: palette.text,
              letterSpacing: -1,
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom text */}
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: 0,
            width: "100%",
            textAlign: "center",
            opacity: combinedOpacity,
            transform: `translateX(${
              interpolate(entranceProgressBottom.x, [0, 1], [width / 2, 0]) +
              interpolate(exitProgressBottom.x, [1, 0], [0, width / 2])
            }px)`,
          }}
        >
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: palette.accent,
              letterSpacing: -1,
            }}
          >
            {subtitle}
          </div>
        </div>
      </AbsoluteFill>
    );
  };

  // CORNER_BUG PRESET
  const renderCornerBug = (): React.ReactElement => {
    const bugSize = 100;
    const entranceTransform = renderEntranceTransform();
    const exitTransform = renderExitTransform();
    const breatheAmount = breathe(frame, fps, 0.95, 1.05);
    const positionMap: Record<string, React.CSSProperties> = {
      top: { top: 20, right: 20 },
      bottom: { bottom: 20, right: 20 },
      left: { bottom: 20, left: 20 },
      right: { bottom: 20, right: 20 },
    };

    const positionStyle = positionMap[position] || positionMap.bottom;

    return (
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            ...positionStyle,
            width: bugSize,
            height: bugSize,
            opacity: combinedOpacity,
            transform: `scale(${breatheAmount})`,
            ...entranceTransform,
            ...exitTransform,
          }}
        >
          {/* Bug background */}
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: rgba(palette.primary, 0.15),
              border: `2px solid ${palette.primary}`,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              boxShadow: glowShadow(palette.primary),
            }}
          >
            {/* Icon or text */}
            <div
              style={{
                fontSize: icon ? 40 : 24,
                color: palette.primary,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {icon || tag || "•"}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  };

  // Render based on preset
  const renderPreset = (): React.ReactElement => {
    switch (preset) {
      case "lower_third":
        return renderLowerThird();
      case "caption":
        return renderCaption();
      case "hud":
        return renderHud();
      case "nameplate":
        return renderNameplate();
      case "split_text":
        return renderSplitText();
      case "corner_bug":
        return renderCornerBug();
      default:
        return renderLowerThird();
    }
  };

  return <>{renderPreset()}</>;
};
