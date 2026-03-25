import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  Img,
  staticFile,
} from "remotion";
import { AbsoluteFill } from "remotion";

/* ── Types ── */
interface CardItem {
  /** Image source — URL, data URI, or public/ path */
  image: string;
  /** Optional label shown below the card */
  label?: string;
}

interface ThreeDCardFlipData {
  fps: number;
  width: number;
  height: number;
  durationMs: number;
  durationFrames: number;

  /** Array of card images to showcase */
  cards?: CardItem[] | string[];

  /** Single image if only one card is needed */
  image?: string;

  /**
   * Animation style:
   * "flip" — cards flip 180° to reveal next (default)
   * "carousel" — cards rotate on a 3D carousel ring
   * "tilt" — single card tilts and floats (Apple keynote style)
   * "fan" — cards fan out from a stack
   */
  style?: string;

  /** Card corner radius in px. Default 20 */
  borderRadius?: number;

  /** Card width as % of canvas. Default 65 */
  cardWidthPercent?: number;

  /** Enable reflection below cards. Default true */
  reflection?: boolean;

  /** Enable floating shadow. Default true */
  shadow?: boolean;

  /** Optional headline above the card area */
  headline?: string;

  /** Background color */
  bgColor?: string;
  textColor?: string;
  accentColor?: string;

  /** Enable subtle ambient particles. Default false */
  particles?: boolean;
}

interface Props {
  data: ThreeDCardFlipData;
}

/* ── Helpers ── */
function resolveImg(src: string): string {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return staticFile(src);
}

function normalizeCards(data: ThreeDCardFlipData): CardItem[] {
  if (data.cards && data.cards.length > 0) {
    return data.cards.map((c) =>
      typeof c === "string" ? { image: c } : c
    );
  }
  if (data.image) return [{ image: data.image }];
  return [];
}

/* ── Main Component ── */
export const ThreeDCardFlip: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    width = 1080,
    height = 1920,
    durationFrames = 150,
    style = "tilt",
    borderRadius = 20,
    cardWidthPercent = 65,
    reflection = true,
    shadow = true,
    headline,
    bgColor = "#0A0A0A",
    textColor = "#FFFFFF",
    accentColor = "#FF6B35",
    particles = false,
  } = data;

  const totalFrames = durationFrames || 150;
  const cards = useMemo(() => normalizeCards(data), [data]);
  const cardCount = Math.max(1, cards.length);
  const cardW = (width * cardWidthPercent) / 100;
  const cardH = cardW * 1.4; // 5:7 aspect ratio for cards

  // ── Global entrance ──
  const entranceProgress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 60, mass: 0.8 },
  });

  // ── Exit fade ──
  const exitStart = Math.floor(totalFrames * 0.85);
  const exitOpacity = interpolate(frame, [exitStart, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        overflow: "hidden",
        opacity: exitOpacity,
        perspective: "1200px",
        perspectiveOrigin: "50% 45%",
      }}
    >
      {/* Subtle gradient backdrop */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${accentColor}15 0%, transparent 60%)`,
        }}
      />

      {/* Ambient particles */}
      {particles && <Particles frame={frame} accentColor={accentColor} />}

      {/* Headline */}
      {headline && (
        <HeadlineOverlay
          text={headline}
          textColor={textColor}
          frame={frame}
          fps={fps}
        />
      )}

      {/* Card area — pushed down so cards sit below the headline */}
      <div
        style={{
          position: "absolute",
          top: headline ? "22%" : 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transformStyle: "preserve-3d",
        }}
      >
        {style === "tilt" && (
          <TiltShowcase
            cards={cards}
            frame={frame}
            fps={fps}
            totalFrames={totalFrames}
            cardW={cardW}
            cardH={cardH}
            borderRadius={borderRadius}
            reflection={reflection}
            shadow={shadow}
            entranceProgress={entranceProgress}
            bgColor={bgColor}
            accentColor={accentColor}
            textColor={textColor}
          />
        )}
        {style === "flip" && (
          <FlipShowcase
            cards={cards}
            frame={frame}
            fps={fps}
            totalFrames={totalFrames}
            cardW={cardW}
            cardH={cardH}
            borderRadius={borderRadius}
            reflection={reflection}
            shadow={shadow}
            entranceProgress={entranceProgress}
            bgColor={bgColor}
            accentColor={accentColor}
            textColor={textColor}
          />
        )}
        {style === "carousel" && (
          <CarouselShowcase
            cards={cards}
            frame={frame}
            fps={fps}
            totalFrames={totalFrames}
            cardW={cardW}
            cardH={cardH}
            borderRadius={borderRadius}
            reflection={reflection}
            shadow={shadow}
            entranceProgress={entranceProgress}
            bgColor={bgColor}
            accentColor={accentColor}
            textColor={textColor}
          />
        )}
        {style === "fan" && (
          <FanShowcase
            cards={cards}
            frame={frame}
            fps={fps}
            totalFrames={totalFrames}
            cardW={cardW}
            cardH={cardH}
            borderRadius={borderRadius}
            reflection={reflection}
            shadow={shadow}
            entranceProgress={entranceProgress}
            bgColor={bgColor}
            accentColor={accentColor}
            textColor={textColor}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};

/* ── Shared card props ── */
interface ShowcaseProps {
  cards: CardItem[];
  frame: number;
  fps: number;
  totalFrames: number;
  cardW: number;
  cardH: number;
  borderRadius: number;
  reflection: boolean;
  shadow: boolean;
  entranceProgress: number;
  bgColor: string;
  accentColor: string;
  textColor: string;
}

/* ── TILT: Card that floats and tilts, with 3D flip transitions between cards ── */
const TiltShowcase: React.FC<ShowcaseProps> = ({
  cards,
  frame,
  fps,
  totalFrames,
  cardW,
  cardH,
  borderRadius,
  reflection,
  shadow,
  entranceProgress,
  bgColor,
  accentColor,
  textColor,
}) => {
  const cardCount = cards.length;

  // Timing: entrance (20 frames) → hold+tilt → flip (20 frames) → hold+tilt → flip → ...
  const entranceDur = 20;
  const flipDur = 20;
  const exitBuffer = Math.floor(totalFrames * 0.15);
  const usableFrames = totalFrames - exitBuffer;

  // For single card: gentle orbit tilt
  if (cardCount <= 1) {
    const orbitPhase = (frame / 120) * Math.PI * 2;
    const tiltX = Math.sin(orbitPhase) * 5;
    const tiltY = Math.cos(orbitPhase) * 4;
    const floatY = Math.sin(orbitPhase * 0.5) * 8;
    const card = cards[0];
    const resolved = card ? resolveImg(card.image) : "";

    return (
      <div
        style={{
          transformStyle: "preserve-3d",
          transform: `
            translateY(${floatY - 40}px)
            scale(${entranceProgress})
            rotateX(${tiltX}deg)
            rotateY(${tiltY}deg)
          `,
        }}
      >
        <CardRenderer
          image={resolved}
          label={card?.label}
          cardW={cardW}
          cardH={cardH}
          borderRadius={borderRadius}
          shadow={shadow}
          reflection={reflection}
          bgColor={bgColor}
          accentColor={accentColor}
          textColor={textColor}
          glowIntensity={0.3 + Math.sin(frame / 25) * 0.15}
        />
      </div>
    );
  }

  // Multi-card: build a timeline of [hold, flip, hold, flip, hold...]
  // Each flip adds 180° cumulatively — no angle resets, no snapping.
  const totalFlips = cardCount - 1;
  const holdPerCard = Math.floor((usableFrames - flipDur * totalFlips) / cardCount);

  // Build flip schedule: [{startFrame, endFrame}, ...]
  const flipSchedule: { flipStart: number; flipEnd: number }[] = [];
  let cursor = holdPerCard; // first hold, then first flip
  for (let i = 0; i < totalFlips; i++) {
    flipSchedule.push({ flipStart: cursor, flipEnd: cursor + flipDur });
    cursor += flipDur + holdPerCard;
  }

  // Calculate cumulative rotation
  let cumulativeAngle = 0;
  let currentFlipProgress = 0; // 0→1 if mid-flip
  let isFlipping = false;

  for (let i = 0; i < flipSchedule.length; i++) {
    const { flipStart, flipEnd } = flipSchedule[i];
    if (frame >= flipEnd) {
      // This flip is fully completed
      cumulativeAngle += 180;
    } else if (frame >= flipStart) {
      // Currently in this flip
      isFlipping = true;
      currentFlipProgress = interpolate(frame, [flipStart, flipEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      });
      cumulativeAngle += currentFlipProgress * 180;
      break;
    } else {
      break;
    }
  }

  // Determine which cards are on which face based on completed flips.
  // Key insight: after each 180° flip, which physical face is visible alternates.
  // - After 0 flips (0°): FRONT face visible → front=card[0], back=card[1]
  // - After 1 flip (180°): BACK face visible → back=card[1], front=card[2]
  // - After 2 flips (360°): FRONT face visible → front=card[2], back=card[3]
  const completedFlips = Math.floor(cumulativeAngle / 180);
  const isEvenFlips = completedFlips % 2 === 0;
  const currentCardIdx = Math.min(completedFlips, cardCount - 1);
  const nextCardIdx = Math.min(completedFlips + 1, cardCount - 1);

  // On even completed flips: front face is visible → front=current, back=next
  // On odd completed flips: back face is visible → back=current, front=next
  const frontIdx = isEvenFlips ? currentCardIdx : nextCardIdx;
  const backIdx = isEvenFlips ? nextCardIdx : currentCardIdx;
  const frontCard = cards[frontIdx];
  const backCard = cards[backIdx];
  const frontResolved = frontCard ? resolveImg(frontCard.image) : "";
  const backResolved = backCard ? resolveImg(backCard.image) : "";

  // Single smooth slow-orbit motion — one cycle over ~4 seconds at 30fps
  // Using a single phase variable keeps X and Y locked together = no jitter
  const orbitPhase = (frame / 120) * Math.PI * 2;
  const tiltX = Math.sin(orbitPhase) * 4;
  const tiltY = Math.cos(orbitPhase) * 3;
  const floatY = Math.sin(orbitPhase * 0.5) * 8;

  return (
    <div
      style={{
        transformStyle: "preserve-3d",
        transform: `
          translateY(${floatY - 40}px)
          scale(${entranceProgress})
          rotateX(${tiltX}deg)
          rotateY(${cumulativeAngle + tiltY}deg)
        `,
        position: "relative",
      }}
    >
      {/* Front face (0°) — always rendered */}
      <div style={{ backfaceVisibility: "hidden" }}>
        <CardRenderer
          image={frontResolved}
          label={frontCard?.label}
          cardW={cardW}
          cardH={cardH}
          borderRadius={borderRadius}
          shadow={shadow}
          reflection={reflection}
          bgColor={bgColor}
          accentColor={accentColor}
          textColor={textColor}
          glowIntensity={0.3}
        />
      </div>

      {/* Back face (180°) — always rendered */}
      <div
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <CardRenderer
          image={backResolved}
          label={backCard?.label}
          cardW={cardW}
          cardH={cardH}
          borderRadius={borderRadius}
          shadow={shadow}
          reflection={reflection}
          bgColor={bgColor}
          accentColor={accentColor}
          textColor={textColor}
          glowIntensity={0.3}
        />
      </div>
    </div>
  );
};

/* ── FLIP: Cards flip 180° to reveal next card ── */
const FlipShowcase: React.FC<ShowcaseProps> = ({
  cards,
  frame,
  fps,
  totalFrames,
  cardW,
  cardH,
  borderRadius,
  reflection,
  shadow,
  entranceProgress,
  bgColor,
  accentColor,
  textColor,
}) => {
  if (cards.length < 2) {
    return (
      <TiltShowcase
        cards={cards}
        frame={frame}
        fps={fps}
        totalFrames={totalFrames}
        cardW={cardW}
        cardH={cardH}
        borderRadius={borderRadius}
        reflection={reflection}
        shadow={shadow}
        entranceProgress={entranceProgress}
        bgColor={bgColor}
        accentColor={accentColor}
        textColor={textColor}
      />
    );
  }

  // Cumulative rotation approach — same as TiltShowcase
  const flipDuration = 25;
  const cardCount = cards.length;
  const totalFlips = cardCount - 1;
  const holdPerCard = Math.floor((totalFrames - flipDuration * totalFlips) / cardCount);

  // Build flip schedule
  const flipSchedule: { flipStart: number; flipEnd: number }[] = [];
  let cursor = holdPerCard;
  for (let i = 0; i < totalFlips; i++) {
    flipSchedule.push({ flipStart: cursor, flipEnd: cursor + flipDuration });
    cursor += flipDuration + holdPerCard;
  }

  // Calculate cumulative rotation
  let cumulativeAngle = 0;
  let isCurrentlyFlipping = false;
  let flipProgress = 0;

  for (let i = 0; i < flipSchedule.length; i++) {
    const { flipStart, flipEnd } = flipSchedule[i];
    if (frame >= flipEnd) {
      cumulativeAngle += 180;
    } else if (frame >= flipStart) {
      isCurrentlyFlipping = true;
      flipProgress = interpolate(frame, [flipStart, flipEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      });
      cumulativeAngle += flipProgress * 180;
      break;
    } else {
      break;
    }
  }

  const completedFlips = Math.floor(cumulativeAngle / 180);
  const isEvenFlips = completedFlips % 2 === 0;
  const currentCardIdx = Math.min(completedFlips, cardCount - 1);
  const nextCardIdx = Math.min(completedFlips + 1, cardCount - 1);
  const frontIdx = isEvenFlips ? currentCardIdx : nextCardIdx;
  const backIdx = isEvenFlips ? nextCardIdx : currentCardIdx;
  const frontCard = cards[frontIdx];
  const backCard = cards[backIdx];
  const frontResolved = frontCard ? resolveImg(frontCard.image) : "";
  const backResolved = backCard ? resolveImg(backCard.image) : "";

  const floatY = Math.sin(frame / 35) * 8;

  return (
    <div
      style={{
        transformStyle: "preserve-3d",
        transform: `
          translateY(${floatY - 40}px)
          scale(${entranceProgress})
          rotateY(${cumulativeAngle}deg)
        `,
        position: "relative",
      }}
    >
      {/* Front face */}
      <div style={{ backfaceVisibility: "hidden" }}>
        <CardRenderer
          image={frontResolved}
          label={frontCard?.label}
          cardW={cardW}
          cardH={cardH}
          borderRadius={borderRadius}
          shadow={shadow}
          reflection={reflection}
          bgColor={bgColor}
          accentColor={accentColor}
          textColor={textColor}
          glowIntensity={0.25}
        />
      </div>

      {/* Back face — always present, pre-rotated 180° */}
      <div
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <CardRenderer
          image={backResolved}
          label={backCard?.label}
          cardW={cardW}
          cardH={cardH}
          borderRadius={borderRadius}
          shadow={shadow}
          reflection={reflection}
          bgColor={bgColor}
          accentColor={accentColor}
          textColor={textColor}
          glowIntensity={0.25}
        />
      </div>
    </div>
  );
};

/* ── CAROUSEL: Cards arranged in a 3D ring ── */
const CarouselShowcase: React.FC<ShowcaseProps> = ({
  cards,
  frame,
  fps,
  totalFrames,
  cardW,
  cardH,
  borderRadius,
  reflection,
  shadow,
  entranceProgress,
  bgColor,
  accentColor,
  textColor,
}) => {
  const count = cards.length || 1;
  const angleStep = 360 / count;
  const radius = cardW * 0.9;

  // Slow continuous rotation
  const rotation = interpolate(frame, [0, totalFrames], [0, 360], {
    extrapolateRight: "clamp",
    easing: Easing.linear,
  });

  return (
    <div
      style={{
        transformStyle: "preserve-3d",
        transform: `
          translateY(-40px)
          scale(${entranceProgress * 0.75})
          rotateY(${rotation}deg)
        `,
        width: cardW,
        height: cardH,
        position: "relative",
      }}
    >
      {cards.map((card, i) => {
        const angle = i * angleStep;
        const resolved = resolveImg(card.image);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transformStyle: "preserve-3d",
              transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
              backfaceVisibility: "hidden",
            }}
          >
            <CardRenderer
              image={resolved}
              label={card.label}
              cardW={cardW}
              cardH={cardH}
              borderRadius={borderRadius}
              shadow={shadow}
              reflection={false}
              bgColor={bgColor}
              accentColor={accentColor}
              textColor={textColor}
              glowIntensity={0.2}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ── FAN: Cards fan out from a stacked position ── */
const FanShowcase: React.FC<ShowcaseProps> = ({
  cards,
  frame,
  fps,
  totalFrames,
  cardW,
  cardH,
  borderRadius,
  reflection,
  shadow,
  entranceProgress,
  bgColor,
  accentColor,
  textColor,
}) => {
  const count = cards.length || 1;
  const fanSpread = 12; // degrees between each card

  // Fan unfolds over first 40% of scene
  const fanProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 50, mass: 1 },
  });

  const floatY = Math.sin(frame / 35) * 6;

  return (
    <div
      style={{
        transformStyle: "preserve-3d",
        transform: `translateY(${floatY - 40}px) scale(${entranceProgress})`,
        position: "relative",
        width: cardW,
        height: cardH,
      }}
    >
      {cards.map((card, i) => {
        const resolved = resolveImg(card.image);
        const centerIdx = (count - 1) / 2;
        const offsetFromCenter = i - centerIdx;
        const targetAngle = offsetFromCenter * fanSpread;
        const angle = targetAngle * fanProgress;
        const translateX = offsetFromCenter * 30 * fanProgress;
        const zIndex = count - Math.abs(Math.round(offsetFromCenter));

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              transformOrigin: "50% 100%",
              transform: `rotate(${angle}deg) translateX(${translateX}px)`,
              zIndex,
            }}
          >
            <CardRenderer
              image={resolved}
              label={card.label}
              cardW={cardW}
              cardH={cardH}
              borderRadius={borderRadius}
              shadow={shadow}
              reflection={i === Math.round(centerIdx)}
              bgColor={bgColor}
              accentColor={accentColor}
              textColor={textColor}
              glowIntensity={i === Math.round(centerIdx) ? 0.35 : 0.1}
            />
          </div>
        );
      })}
    </div>
  );
};

/* ── Card Renderer — the actual card visual ── */
const CardRenderer: React.FC<{
  image: string;
  label?: string;
  cardW: number;
  cardH: number;
  borderRadius: number;
  shadow: boolean;
  reflection: boolean;
  bgColor: string;
  accentColor: string;
  textColor: string;
  mirrorX?: boolean;
  glowIntensity?: number;
}> = ({
  image,
  label,
  cardW,
  cardH,
  borderRadius,
  shadow,
  reflection,
  bgColor,
  accentColor,
  textColor,
  mirrorX = false,
  glowIntensity = 0.25,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Main card */}
      <div
        style={{
          width: cardW,
          height: cardH,
          borderRadius,
          overflow: "hidden",
          position: "relative",
          boxShadow: shadow
            ? `0 20px 60px rgba(0,0,0,0.5), 0 0 80px ${accentColor}${Math.round(glowIntensity * 255).toString(16).padStart(2, "0")}`
            : "none",
          border: `1px solid rgba(255,255,255,0.1)`,
          transform: mirrorX ? "scaleX(-1)" : "none",
        }}
      >
        {image ? (
          <Img
            src={image}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: mirrorX ? "scaleX(-1)" : "none",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${accentColor}44 0%, ${bgColor} 100%)`,
            }}
          />
        )}

        {/* Glass highlight overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Label */}
      {label && (
        <div
          style={{
            marginTop: 20,
            fontSize: 28,
            fontWeight: 600,
            color: textColor,
            textAlign: "center",
            opacity: 0.85,
            letterSpacing: "1px",
          }}
        >
          {label}
        </div>
      )}

      {/* Reflection */}
      {reflection && image && (
        <div
          style={{
            width: cardW,
            height: cardH * 0.35,
            borderRadius: `0 0 ${borderRadius}px ${borderRadius}px`,
            overflow: "hidden",
            marginTop: 4,
            opacity: 0.15,
            transform: "scaleY(-1)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
            filter: "blur(3px)",
          }}
        >
          <Img
            src={image}
            style={{
              width: "100%",
              height: cardH,
              objectFit: "cover",
            }}
          />
        </div>
      )}
    </div>
  );
};

/* ── Headline overlay ── */
const HeadlineOverlay: React.FC<{
  text: string;
  textColor: string;
  frame: number;
  fps: number;
}> = ({ text, textColor, frame, fps }) => {
  const progress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80, mass: 0.7 },
  });
  const y = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: "12%",
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 52,
        fontWeight: 700,
        color: textColor,
        opacity: progress,
        transform: `translateY(${y}px)`,
        zIndex: 10,
        textShadow: "0 4px 20px rgba(0,0,0,0.4)",
        letterSpacing: "-0.5px",
        padding: "0 40px",
      }}
    >
      {text}
    </div>
  );
};

/* ── Ambient particles ── */
const Particles: React.FC<{ frame: number; accentColor: string }> = ({
  frame,
  accentColor,
}) => {
  const dots = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        x: (i * 137.5) % 100,
        y: (i * 89.3) % 100,
        size: 2 + (i % 3) * 1.5,
        speed: 0.3 + (i % 4) * 0.15,
        phase: i * 1.2,
      })),
    []
  );

  return (
    <>
      {dots.map((dot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${dot.x}%`,
            top: `${(dot.y + frame * dot.speed * 0.3) % 110 - 5}%`,
            width: dot.size,
            height: dot.size,
            borderRadius: "50%",
            background: accentColor,
            opacity: 0.15 + Math.sin(frame / 20 + dot.phase) * 0.1,
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
};
