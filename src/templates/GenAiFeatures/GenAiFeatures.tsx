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

interface TextLine {
  words: string[];
  color: string;
  trailingWord?: string;
  trailingColor?: string;
  trailingItalic?: boolean;
  italic?: boolean;
}

interface PromptBoxConfig {
  text: string;
  boldWords: string[];
  label: string;
  enterDelayMs: number;
  enterDurationMs: number;
  typeSpeedMs: number;
  bgColor: string;
  textColor: string;
  boldColor: string;
  width: number;
  height: number;
}

interface ButtonConfig {
  text: string;
  enterDelayMs: number;
  enterDurationMs: number;
  icon: string;
}

interface Scene1Data {
  startMs: number;
  endMs: number;
  cursorBlinkMs: number;
  textLines: TextLine[];
  wordIntervalMs: number;
  textStartMs: number;
  image: string;
  imageEnterMs: number;
  imageScaleDurationMs: number;
  exitStartMs: number;
  exitDurationMs: number;
  fontSize: number;
  fontFamily: string;
  imageSize: number;
  imageBorderRadius: number;
}

interface Scene2Data {
  startMs: number;
  endMs: number;
  textLines: TextLine[];
  image: string;
  imageSize: number;
  imageBorderRadius: number;
  imageEnterMs: number;
  imageEnterDurationMs: number;
  promptBox: PromptBoxConfig;
  buttons: ButtonConfig[];
  buttonBgColor: string;
  buttonTextColor: string;
  exitStartMs: number;
  exitDurationMs: number;
  fontSize: number;
  fontFamily: string;
}

interface Scene3Data {
  startMs: number;
  endMs: number;
  textLines: TextLine[];
  image: string;
  imageBorderRadius: number;
  imageEnterMs: number;
  imageEnterDurationMs: number;
  portraitWidth: number;
  portraitHeight: number;
  landscapeWidth: number;
  landscapeHeight: number;
  stretchStartMs: number;
  stretchToLandscapeMs: number;
  stretchHoldMs: number;
  stretchBackMs: number;
  exitStartMs: number;
  exitDurationMs: number;
  fontSize: number;
  fontFamily: string;
}

interface Scene4Data {
  startMs: number;
  endMs: number;
  logoText: string;
  logoSuperscript: string;
  logoColor: string;
  logoFontSize: number;
  logoFontFamily: string;
  enterDurationMs: number;
  holdMs: number;
  exitDurationMs: number;
}

export interface GenAiFeaturesData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  bgColor: string;
  scene1: Scene1Data;
  scene2: Scene2Data;
  scene3: Scene3Data;
  scene4: Scene4Data;
}

// ── Helpers ──

function resolveImg(src: string): string {
  if (/^https?:\/\//.test(src) || src.startsWith("data:")) return src;
  return staticFile(src);
}

const CL = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// ── Scene 1: The Hook ──

const Scene1: React.FC<{
  localMs: number;
  data: GenAiFeaturesData;
}> = ({ localMs, data }) => {
  const s = data.scene1;
  const sceneDur = s.endMs - s.startMs;

  // Cursor blink
  const cursorVisible =
    localMs < s.textStartMs ||
    Math.floor(localMs / s.cursorBlinkMs) % 2 === 0;

  // Typewriter: letter by letter across all lines
  const fullText: string[] = [];
  s.textLines.forEach((line) => {
    const lineStr = line.words.join(" ") + (line.trailingWord ? " " + line.trailingWord : "");
    fullText.push(lineStr);
  });
  const totalChars = fullText.reduce((sum, l) => sum + l.length, 0);
  const elapsed = Math.max(0, localMs - s.textStartMs);
  const charsRevealed = Math.min(
    totalChars,
    Math.floor(elapsed / (s.wordIntervalMs / 4))
  );
  const textFullyTyped = charsRevealed >= totalChars;

  // Image enter (scale from 0 to 1)
  const imageScale =
    localMs < s.imageEnterMs
      ? 0
      : interpolate(
          localMs,
          [s.imageEnterMs, s.imageEnterMs + s.imageScaleDurationMs],
          [0, 1],
          { ...CL, easing: Easing.out(Easing.back(1.2)) }
        );

  // Slow zoom on image while visible
  const imageZoom =
    imageScale > 0
      ? interpolate(
          localMs,
          [s.imageEnterMs, s.exitStartMs],
          [1, 1.15],
          { ...CL, easing: Easing.inOut(Easing.ease) }
        )
      : 1;

  // Exit: blur + scale down
  const isExiting = localMs >= s.exitStartMs;
  const exitProgress = isExiting
    ? interpolate(
        localMs,
        [s.exitStartMs, s.exitStartMs + s.exitDurationMs],
        [0, 1],
        { ...CL, easing: Easing.in(Easing.cubic) }
      )
    : 0;
  const exitScale = 1 - exitProgress * 0.6;
  const exitBlur = exitProgress * 20;
  const exitOpacity = 1 - exitProgress;

  // Build rendered lines — letter by letter
  const renderedLines: React.ReactNode[] = [];
  let charBudget = charsRevealed;
  s.textLines.forEach((line, li) => {
    const normalPart = line.words.join(" ");
    const trailingPart = line.trailingWord ? " " + line.trailingWord : "";
    const lineFull = normalPart + trailingPart;

    const lineChars = Math.min(lineFull.length, charBudget);
    charBudget -= lineChars;
    if (lineChars <= 0) {
      renderedLines.push(<div key={`line${li}`} style={{ lineHeight: 1.15 }}>&nbsp;</div>);
      return;
    }

    const visibleStr = lineFull.slice(0, lineChars);
    const normalVisible = visibleStr.slice(0, Math.min(normalPart.length, lineChars));
    const trailingVisible = lineChars > normalPart.length
      ? visibleStr.slice(normalPart.length).trimStart()
      : "";

    renderedLines.push(
      <div key={`line${li}`} style={{ lineHeight: 1.15 }}>
        <span style={{ color: line.color }}>{normalVisible}</span>
        {trailingVisible && (
          <span
            style={{
              color: line.trailingColor || line.color,
              fontStyle: line.trailingItalic ? "italic" : "normal",
            }}
          >
            {" "}{trailingVisible}
          </span>
        )}
      </div>
    );
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${exitScale})`,
        filter: `blur(${exitBlur}px)`,
        opacity: exitOpacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "60px 40px",
      }}
    >
      {/* Text above image */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: 300,
          letterSpacing: -1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {renderedLines}

        {/* Cursor */}
        {!textFullyTyped && cursorVisible && (
          <div
            style={{
              position: "absolute",
              right: "10%",
              bottom: 0,
              width: 3,
              height: s.fontSize * 0.8,
              backgroundColor: "#ffffff",
              borderRadius: 2,
            }}
          />
        )}
      </div>

      {/* Image below text */}
      {imageScale > 0 && (
        <div
          style={{
            width: s.imageSize,
            height: s.imageSize * 1.0,
            borderRadius: s.imageBorderRadius,
            overflow: "hidden",
            transform: `scale(${imageScale * imageZoom})`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <Img
            src={resolveImg(s.image)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* Dark gradient overlay to blend light images with dark theme */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `linear-gradient(180deg, ${data.bgColor}44 0%, ${data.bgColor}22 40%, ${data.bgColor}66 100%)`,
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── Scene 2: The Interface ──

const Scene2: React.FC<{
  localMs: number;
  data: GenAiFeaturesData;
}> = ({ localMs, data }) => {
  const s = data.scene2;
  const sceneDur = s.endMs - s.startMs;

  // Typewriter for text lines (letter by letter, matching Scene 1 style)
  const fullText: string[] = [];
  s.textLines.forEach((line) => {
    fullText.push(line.words.join(" "));
  });
  const totalChars = fullText.reduce((sum, l) => sum + l.length, 0);
  const typeElapsed = Math.max(0, localMs - 200);
  const charsRevealed = Math.min(totalChars, Math.floor(typeElapsed / 25));
  const cursorVisible = Math.floor(localMs / 500) % 2 === 0;
  const textFullyTyped = charsRevealed >= totalChars;

  // Image scale in (delayed until text starts appearing)
  const imageScale = interpolate(
    localMs,
    [s.imageEnterMs, s.imageEnterMs + s.imageEnterDurationMs],
    [0, 1],
    { ...CL, easing: Easing.out(Easing.back(1.2)) }
  );

  // Slow zoom on image
  const imageZoom = imageScale > 0
    ? interpolate(localMs, [s.imageEnterMs, s.exitStartMs], [1, 1.08], CL)
    : 1;

  // Prompt box slide in
  const pb = s.promptBox;
  const pbProgress = interpolate(
    localMs,
    [pb.enterDelayMs, pb.enterDelayMs + pb.enterDurationMs],
    [0, 1],
    { ...CL, easing: Easing.out(Easing.cubic) }
  );
  const pbY = interpolate(pbProgress, [0, 1], [60, 0], CL);
  const pbOpacity = pbProgress;

  // Prompt typewriter
  const promptTypeElapsed = Math.max(0, localMs - pb.enterDelayMs - pb.enterDurationMs);
  const promptCharsShown = Math.min(
    pb.text.length,
    Math.floor(promptTypeElapsed / pb.typeSpeedMs)
  );

  // Buttons
  const renderButton = (btn: ButtonConfig, idx: number) => {
    const btnProgress = interpolate(
      localMs,
      [btn.enterDelayMs, btn.enterDelayMs + btn.enterDurationMs],
      [0, 1],
      { ...CL, easing: Easing.out(Easing.back(1.5)) }
    );
    const btnX = idx === 0 ? interpolate(btnProgress, [0, 1], [80, 0], CL) : 0;
    const btnY = idx === 1 ? interpolate(btnProgress, [0, 1], [40, 0], CL) : 0;

    return (
      <div
        key={btn.text}
        style={{
          opacity: btnProgress,
          transform: `translate(${btnX}px, ${btnY}px) scale(${0.8 + 0.2 * btnProgress})`,
          backgroundColor: s.buttonBgColor,
          color: s.buttonTextColor,
          padding: "18px 36px",
          borderRadius: 30,
          fontSize: 30,
          fontFamily: s.fontFamily,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 10,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {btn.icon === "color" && (
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#fffbe7" }} />
            <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#937a69" }} />
          </div>
        )}
        {btn.text}
        {btn.icon === "arrow" && <span style={{ fontSize: 16 }}>→</span>}
      </div>
    );
  };

  // Exit: blur + scale down
  const exitProgress = interpolate(
    localMs,
    [s.exitStartMs, s.exitStartMs + s.exitDurationMs],
    [0, 1],
    { ...CL, easing: Easing.in(Easing.cubic) }
  );
  const exitScale = 1 - exitProgress * 0.6;
  const exitBlur = exitProgress * 20;
  const exitOpacity = 1 - exitProgress;

  // Render prompt text with bold keywords
  const renderPromptText = () => {
    if (promptCharsShown === 0) return null;
    const parts: React.ReactNode[] = [];
    let key = 0;
    const boldPositions: { start: number; end: number; word: string }[] = [];
    pb.boldWords.forEach((bw) => {
      let searchFrom = 0;
      while (true) {
        const idx = pb.text.indexOf(bw, searchFrom);
        if (idx === -1) break;
        boldPositions.push({ start: idx, end: idx + bw.length, word: bw });
        searchFrom = idx + bw.length;
      }
    });
    boldPositions.sort((a, b) => a.start - b.start);
    let pos = 0;
    boldPositions.forEach((bp) => {
      if (bp.start >= promptCharsShown) return;
      if (pos < bp.start) {
        parts.push(<span key={key++} style={{ color: pb.textColor }}>{pb.text.slice(pos, Math.min(bp.start, promptCharsShown))}</span>);
      }
      const boldEnd = Math.min(bp.end, promptCharsShown);
      if (boldEnd > bp.start) {
        parts.push(<span key={key++} style={{ color: pb.boldColor, fontWeight: 700 }}>{pb.text.slice(bp.start, boldEnd)}</span>);
      }
      pos = bp.end;
    });
    if (pos < promptCharsShown) {
      parts.push(<span key={key++} style={{ color: pb.textColor }}>{pb.text.slice(pos, promptCharsShown)}</span>);
    }
    return parts;
  };

  // Build typewriter text lines (letter by letter like Scene 1)
  const renderedLines: React.ReactNode[] = [];
  let charBudget = charsRevealed;
  s.textLines.forEach((line, li) => {
    const lineStr = line.words.join(" ");
    const lineChars = Math.min(lineStr.length, charBudget);
    charBudget -= lineChars;
    if (lineChars <= 0) {
      renderedLines.push(<div key={`line${li}`} style={{ lineHeight: 1.2 }}>&nbsp;</div>);
      return;
    }
    const visibleStr = lineStr.slice(0, lineChars);
    renderedLines.push(
      <div key={`line${li}`} style={{ lineHeight: 1.2 }}>
        <span style={{ color: line.color }}>{visibleStr}</span>
      </div>
    );
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${exitScale})`,
        filter: `blur(${exitBlur}px)`,
        opacity: exitOpacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        padding: "60px 40px",
      }}
    >
      {/* Text ABOVE image — typewriter with cursor */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: 700,
          letterSpacing: -1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {renderedLines}
        {!textFullyTyped && cursorVisible && (
          <div
            style={{
              position: "absolute",
              right: "10%",
              bottom: 0,
              width: 3,
              height: s.fontSize * 0.8,
              backgroundColor: "#ffffff",
              borderRadius: 2,
            }}
          />
        )}
      </div>

      {/* Image + overlapping UI elements */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div
          style={{
            width: s.imageSize,
            height: s.imageSize * 1.2,
            borderRadius: s.imageBorderRadius,
            overflow: "hidden",
            transform: `scale(${imageScale * imageZoom})`,
            transformOrigin: "center center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <Img
            src={resolveImg(s.image)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* Buttons — overlapping image edges */}
        {s.buttons.length > 0 && (
          <div style={{ position: "absolute", top: 20, right: -100, zIndex: 10 }}>
            {renderButton(s.buttons[0], 0)}
          </div>
        )}
        {s.buttons.length > 1 && (
          <div style={{ position: "absolute", top: "55%", right: -90, zIndex: 10 }}>
            {renderButton(s.buttons[1], 1)}
          </div>
        )}

        {/* Prompt box — overlapping bottom-left of image */}
        {pb.text && (
          <div
            style={{
              position: "absolute",
              bottom: -60,
              left: -40,
              width: pb.width,
              opacity: pbOpacity,
              transform: `translateY(${pbY}px)`,
              backgroundColor: pb.bgColor,
              borderRadius: 16,
              padding: 20,
              backdropFilter: "blur(12px)",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: 28, fontFamily: s.fontFamily, lineHeight: 1.5, minHeight: 80 }}>
              {renderPromptText()}
            </div>
            <div style={{ marginTop: 8, fontSize: 18, color: "rgba(255,255,255,0.5)", fontFamily: s.fontFamily }}>
              {pb.label}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3: Transformation ──

const Scene3: React.FC<{
  localMs: number;
  data: GenAiFeaturesData;
}> = ({ localMs, data }) => {
  const s = data.scene3;

  // Typewriter for text lines (letter by letter, matching Scene 1 & 2)
  const fullText: string[] = [];
  s.textLines.forEach((line) => {
    fullText.push(line.words.join(" "));
  });
  const totalChars = fullText.reduce((sum, l) => sum + l.length, 0);
  const typeElapsed = Math.max(0, localMs - 200);
  const charsRevealed = Math.min(totalChars, Math.floor(typeElapsed / 25));
  const cursorVisible = Math.floor(localMs / 500) % 2 === 0;
  const textFullyTyped = charsRevealed >= totalChars;

  // Image enter
  const enterProgress = interpolate(
    localMs,
    [s.imageEnterMs, s.imageEnterMs + s.imageEnterDurationMs],
    [0, 1],
    { ...CL, easing: Easing.out(Easing.back(1.3)) }
  );

  // Aspect ratio stretch animation
  const stretchEnd1 = s.stretchStartMs + s.stretchToLandscapeMs;
  const holdEnd = stretchEnd1 + s.stretchHoldMs;
  const stretchEnd2 = holdEnd + s.stretchBackMs;

  let imgW = s.portraitWidth;
  let imgH = s.portraitHeight;

  if (localMs >= s.stretchStartMs && localMs < stretchEnd1) {
    const t = interpolate(localMs, [s.stretchStartMs, stretchEnd1], [0, 1], { ...CL, easing: Easing.inOut(Easing.cubic) });
    imgW = s.portraitWidth + (s.landscapeWidth - s.portraitWidth) * t;
    imgH = s.portraitHeight + (s.landscapeHeight - s.portraitHeight) * t;
  } else if (localMs >= stretchEnd1 && localMs < holdEnd) {
    imgW = s.landscapeWidth;
    imgH = s.landscapeHeight;
  } else if (localMs >= holdEnd && localMs < stretchEnd2) {
    const t = interpolate(localMs, [holdEnd, stretchEnd2], [0, 1], { ...CL, easing: Easing.inOut(Easing.cubic) });
    imgW = s.landscapeWidth + (s.portraitWidth - s.landscapeWidth) * t;
    imgH = s.landscapeHeight + (s.portraitHeight - s.landscapeHeight) * t;
  } else if (localMs >= stretchEnd2) {
    imgW = s.portraitWidth;
    imgH = s.portraitHeight;
  }

  // Exit
  const exitProgress = interpolate(
    localMs,
    [s.exitStartMs, s.exitStartMs + s.exitDurationMs],
    [0, 1],
    { ...CL, easing: Easing.in(Easing.cubic) }
  );
  const exitScale = 1 - exitProgress * 0.6;
  const exitBlur = exitProgress * 20;
  const exitOpacity = 1 - exitProgress;

  // Build typewriter text lines
  const renderedLines: React.ReactNode[] = [];
  let charBudget = charsRevealed;
  s.textLines.forEach((line, li) => {
    const lineStr = line.words.join(" ");
    const lineChars = Math.min(lineStr.length, charBudget);
    charBudget -= lineChars;
    if (lineChars <= 0) {
      renderedLines.push(<div key={`line${li}`} style={{ lineHeight: 1.2 }}>&nbsp;</div>);
      return;
    }
    const visibleStr = lineStr.slice(0, lineChars);
    renderedLines.push(
      <div key={`line${li}`} style={{ lineHeight: 1.2 }}>
        <span style={{ color: line.color, fontStyle: line.italic ? "italic" : "normal" }}>{visibleStr}</span>
      </div>
    );
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${exitScale})`,
        filter: `blur(${exitBlur}px)`,
        opacity: exitOpacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        padding: "60px 40px",
      }}
    >
      {/* Text ABOVE image — typewriter with cursor (consistent with Scene 1 & 2) */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          fontWeight: 700,
          letterSpacing: -1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {renderedLines}
        {!textFullyTyped && cursorVisible && (
          <div
            style={{
              position: "absolute",
              right: "10%",
              bottom: 0,
              width: 3,
              height: s.fontSize * 0.8,
              backgroundColor: "#ffffff",
              borderRadius: 2,
            }}
          />
        )}
      </div>

      {/* Image with morphing aspect ratio */}
      <div
        style={{
          width: imgW,
          height: imgH,
          borderRadius: s.imageBorderRadius,
          overflow: "hidden",
          transform: `scale(${enterProgress})`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          flexShrink: 0,
        }}
      >
        <Img
          src={resolveImg(s.image)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4: Outro ──

const Scene4: React.FC<{
  localMs: number;
  data: GenAiFeaturesData;
}> = ({ localMs, data }) => {
  const s = data.scene4;

  // Enter: slide from right + fade
  const enterProgress = interpolate(
    localMs,
    [0, s.enterDurationMs],
    [0, 1],
    { ...CL, easing: Easing.out(Easing.cubic) }
  );
  const enterX = interpolate(enterProgress, [0, 1], [120, 0], CL);

  // Exit: fade out
  const exitStart = s.enterDurationMs + s.holdMs;
  const exitProgress = interpolate(
    localMs,
    [exitStart, exitStart + s.exitDurationMs],
    [0, 1],
    { ...CL, easing: Easing.in(Easing.cubic) }
  );

  const opacity = enterProgress * (1 - exitProgress);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateX(${enterX}px)`,
      }}
    >
      <div
        style={{
          fontFamily: s.logoFontFamily,
          fontSize: s.logoFontSize,
          color: s.logoColor,
          fontWeight: 800,
          letterSpacing: 2,
          display: "flex",
          alignItems: "flex-start",
          textShadow: `0 0 40px ${s.logoColor}44, 0 0 80px ${s.logoColor}22`,
        }}
      >
        <span>{s.logoText}</span>
        {s.logoSuperscript && (
          <span
            style={{
              fontSize: s.logoFontSize * 0.35,
              fontWeight: 600,
              marginLeft: 8,
              marginTop: -4,
              opacity: 0.7,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {s.logoSuperscript}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Main Component ──

export const GenAiFeatures: React.FC<{ data: GenAiFeaturesData }> = ({
  data,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  // Determine which scene is active
  const s1 = data.scene1;
  const s2 = data.scene2;
  const s3 = data.scene3;
  const s4 = data.scene4;

  return (
    <AbsoluteFill style={{ backgroundColor: data.bgColor }}>
      {timeMs >= s1.startMs && timeMs < s1.endMs && (
        <Scene1 localMs={timeMs - s1.startMs} data={data} />
      )}
      {timeMs >= s2.startMs && timeMs < s2.endMs && (
        <Scene2 localMs={timeMs - s2.startMs} data={data} />
      )}
      {timeMs >= s3.startMs && timeMs < s3.endMs && (
        <Scene3 localMs={timeMs - s3.startMs} data={data} />
      )}
      {timeMs >= s4.startMs && timeMs < s4.endMs && (
        <Scene4 localMs={timeMs - s4.startMs} data={data} />
      )}
    </AbsoluteFill>
  );
};
