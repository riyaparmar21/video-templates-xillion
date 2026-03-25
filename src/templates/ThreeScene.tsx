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
  scaleIn,
  rgba,
  hexToRgb,
  glowShadow,
  depthShadow,
  float,
  breathe,
  rotate,
} from "../lib/animations";

type PresetType = "floating_cards" | "rotating_cube" | "tunnel" | "orbit" | "stack" | "room";

const PALETTE: Record<string, string> = {
  primary: "#00d9ff",
  secondary: "#ff006e",
  tertiary: "#8338ec",
  quaternary: "#ffbe0b",
  quinary: "#fb5607",
  senary: "#3a86ff",
};

const getColorFromPalette = (index: number): string => {
  const colors = Object.values(PALETTE);
  return colors[index % colors.length];
};

const hexToRgbString = (hex: string): string => {
  const rgb = hexToRgb(hex);
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
};

// Floating Cards Scene
const FloatingCardsScene: React.FC<{
  frame: number;
  fps: number;
  depth: number;
  rotationSpeed: number;
  items: string[];
  width: number;
  height: number;
}> = ({ frame, fps, depth, rotationSpeed, items, width, height }) => {
  const containerStyle: React.CSSProperties = {
    perspective: `${depth}px`,
    perspectiveOrigin: "center center",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  };

  const cardsToRender = items.slice(0, 6);

  return (
    <div style={containerStyle}>
      {cardsToRender.map((item: string, index: number) => {
        const angle = (index / cardsToRender.length) * 360;
        const zOffset = (index - cardsToRender.length / 2) * 150;
        const yRotation = rotate(frame, 30 * rotationSpeed, fps) + angle;
        const floatAmount = float(frame, fps, 2, index * 500);
        const color = getColorFromPalette(index);

        const cardStyle: React.CSSProperties = {
          position: "absolute",
          width: 200,
          height: 280,
          transformStyle: "preserve-3d",
          transform: `
            rotateY(${yRotation}deg)
            translateZ(${zOffset + floatAmount * 20}px)
            translateY(${floatAmount * 30}px)
          `,
          background: `rgba(255, 255, 255, 0.1)`,
          backdropFilter: "blur(10px)",
          border: `1px solid rgba(255, 255, 255, 0.2)`,
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          boxShadow: glowShadow(color, 0.6),
          transition: "none",
        };

        const textStyle: React.CSSProperties = {
          color: "#ffffff",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: "0.5px",
          pointerEvents: "none",
        };

        return (
          <div key={index} style={cardStyle}>
            <div style={textStyle}>{item}</div>
          </div>
        );
      })}
    </div>
  );
};

// Rotating Cube Scene
const RotatingCubeScene: React.FC<{
  frame: number;
  fps: number;
  depth: number;
  rotationSpeed: number;
  items: string[];
  width: number;
  height: number;
}> = ({ frame, fps, depth, rotationSpeed, items, width, height }) => {
  const cubeSize = 200;
  const rotY = rotate(frame, 45 * rotationSpeed, fps);
  const rotX = rotate(frame, 15 * rotationSpeed, fps) * 0.5;

  const containerStyle: React.CSSProperties = {
    perspective: `${depth}px`,
    perspectiveOrigin: "center center",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const cubeStyle: React.CSSProperties = {
    position: "relative",
    width: cubeSize,
    height: cubeSize,
    transformStyle: "preserve-3d",
    transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
    transition: "none",
  };

  const faces: Array<{
    name: string;
    rotX: number;
    rotY: number;
    rotZ: number;
    transZ: number;
    colorIndex: number;
  }> = [
    { name: "front", rotX: 0, rotY: 0, rotZ: 0, transZ: cubeSize / 2, colorIndex: 0 },
    { name: "back", rotX: 0, rotY: 180, rotZ: 0, transZ: cubeSize / 2, colorIndex: 1 },
    { name: "right", rotX: 0, rotY: 90, rotZ: 0, transZ: cubeSize / 2, colorIndex: 2 },
    { name: "left", rotX: 0, rotY: -90, rotZ: 0, transZ: cubeSize / 2, colorIndex: 3 },
    { name: "top", rotX: 90, rotY: 0, rotZ: 0, transZ: cubeSize / 2, colorIndex: 4 },
    { name: "bottom", rotX: -90, rotY: 0, rotZ: 0, transZ: cubeSize / 2, colorIndex: 5 },
  ];

  return (
    <div style={containerStyle}>
      <div style={cubeStyle}>
        {faces.map((face, index) => {
          const color = getColorFromPalette(face.colorIndex);
          const faceStyle: React.CSSProperties = {
            position: "absolute",
            width: cubeSize,
            height: cubeSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backfaceVisibility: "hidden",
            transform: `
              rotateX(${face.rotX}deg)
              rotateY(${face.rotY}deg)
              rotateZ(${face.rotZ}deg)
              translateZ(${face.transZ}px)
            `,
            background: `rgba(255, 255, 255, 0.08)`,
            border: `2px solid ${color}`,
            boxShadow: glowShadow(color, 0.8),
            fontSize: 14,
            fontWeight: 600,
            color: "#ffffff",
            textAlign: "center",
            padding: "20px",
          };

          return (
            <div key={face.name} style={faceStyle}>
              {items[index] || face.name}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Tunnel Scene
const TunnelScene: React.FC<{
  frame: number;
  fps: number;
  depth: number;
  rotationSpeed: number;
  items: string[];
  width: number;
  height: number;
}> = ({ frame, fps, depth, rotationSpeed, items, width, height }) => {
  const frameCount = 10;
  const tunnelDuration = fps * 3;
  const progress = (frame % tunnelDuration) / tunnelDuration;

  const containerStyle: React.CSSProperties = {
    perspective: `${depth * 1.5}px`,
    perspectiveOrigin: "center center",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const tunnelStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transformStyle: "preserve-3d",
  };

  return (
    <div style={containerStyle}>
      <div style={tunnelStyle}>
        {Array.from({ length: frameCount }).map((_, index) => {
          const zStart = 2000;
          const zEnd = -1000;
          const frameZ = interpolate(
            progress + index / frameCount,
            [0, 1],
            [zStart, zEnd],
            { extrapolateLeft: "extend", extrapolateRight: "clamp" }
          );

          const scale = 1 - (frameZ - zEnd) / (zStart - zEnd) * 0.8;
          const color = getColorFromPalette(index);

          const boxStyle: React.CSSProperties = {
            position: "absolute",
            width: 300 * scale,
            height: 200 * scale,
            left: "50%",
            top: "50%",
            marginLeft: -(300 * scale) / 2,
            marginTop: -(200 * scale) / 2,
            border: `2px solid ${color}`,
            transform: `translateZ(${frameZ}px)`,
            boxShadow: glowShadow(color, 0.5),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#ffffff",
            fontWeight: 500,
          };

          return (
            <div key={index} style={boxStyle}>
              {items[index % items.length]}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Orbit Scene
const OrbitScene: React.FC<{
  frame: number;
  fps: number;
  depth: number;
  rotationSpeed: number;
  items: string[];
  width: number;
  height: number;
}> = ({ frame, fps, depth, rotationSpeed, items, width, height }) => {
  const orbitCount = Math.min(items.length, 6);
  const orbitRadius = 250;
  const orbitDuration = fps * 4;
  const orbitProgress = (frame % orbitDuration) / orbitDuration;
  const orbitAngle = orbitProgress * 360;
  const tiltAngle = rotate(frame, 20 * rotationSpeed, fps) * 0.3;

  const containerStyle: React.CSSProperties = {
    perspective: `${depth}px`,
    perspectiveOrigin: "center center",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const orbitStyle: React.CSSProperties = {
    position: "relative",
    width: 600,
    height: 600,
    transformStyle: "preserve-3d",
    transform: `rotateX(${tiltAngle}deg)`,
  };

  return (
    <div style={containerStyle}>
      <div style={orbitStyle}>
        {/* Center element */}
        <div
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            left: "50%",
            top: "50%",
            marginLeft: -50,
            marginTop: -50,
            background: `rgba(255, 255, 255, 0.1)`,
            border: "2px solid #00d9ff",
            borderRadius: "50%",
            transformStyle: "preserve-3d",
            boxShadow: glowShadow("#00d9ff", 1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#ffffff",
            fontWeight: 600,
          }}
        >
          CENTER
        </div>

        {/* Orbiting objects */}
        {Array.from({ length: orbitCount }).map((_, index) => {
          const itemAngle = (index / orbitCount) * 360 + orbitAngle;
          const angleRad = (itemAngle * Math.PI) / 180;
          const x = Math.cos(angleRad) * orbitRadius;
          const z = Math.sin(angleRad) * orbitRadius;
          const color = getColorFromPalette(index);

          const orbitItemStyle: React.CSSProperties = {
            position: "absolute",
            width: 80,
            height: 80,
            left: "50%",
            top: "50%",
            marginLeft: -40,
            marginTop: -40,
            transformStyle: "preserve-3d",
            transform: `translateX(${x}px) translateZ(${z}px)`,
            background: `rgba(255, 255, 255, 0.08)`,
            border: `2px solid ${color}`,
            borderRadius: "8px",
            boxShadow: glowShadow(color, 0.7),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            color: "#ffffff",
            fontWeight: 500,
            textAlign: "center",
            padding: "8px",
          };

          return (
            <div key={index} style={orbitItemStyle}>
              {items[index]}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Stack Scene
const StackScene: React.FC<{
  frame: number;
  fps: number;
  depth: number;
  rotationSpeed: number;
  items: string[];
  width: number;
  height: number;
}> = ({ frame, fps, depth, rotationSpeed, items, width, height }) => {
  const cardsToRender = items.slice(0, 6);
  const stackDuration = fps * 2;
  const progress = spring({
    frame: frame % stackDuration,
    fps,
    config: { damping: 0.8, mass: 1, stiffness: 100 },
  });

  const containerStyle: React.CSSProperties = {
    perspective: `${depth}px`,
    perspectiveOrigin: "center center",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={containerStyle}>
      {cardsToRender.map((item: string, index: number) => {
        const angle = progress * ((index - cardsToRender.length / 2) * 15);
        const zOffset = progress * (index * 30 - (cardsToRender.length / 2) * 30);
        const yOffset = progress * (index * 10 - (cardsToRender.length / 2) * 10);
        const color = getColorFromPalette(index);

        const cardStyle: React.CSSProperties = {
          position: "absolute",
          width: 220,
          height: 300,
          transformStyle: "preserve-3d",
          transform: `
            rotateY(${angle}deg)
            rotateZ(${angle * 0.5}deg)
            translateZ(${zOffset}px)
            translateY(${yOffset}px)
          `,
          background: `rgba(255, 255, 255, 0.09)`,
          backdropFilter: "blur(10px)",
          border: `1.5px solid rgba(255, 255, 255, 0.2)`,
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          boxShadow: glowShadow(color, 0.7),
          color: "#ffffff",
          fontSize: 18,
          fontWeight: 600,
        };

        return (
          <div key={index} style={cardStyle}>
            {item}
          </div>
        );
      })}
    </div>
  );
};

// Room Scene
const RoomScene: React.FC<{
  frame: number;
  fps: number;
  depth: number;
  rotationSpeed: number;
  items: string[];
  width: number;
  height: number;
}> = ({ frame, fps, depth, rotationSpeed, items, width, height }) => {
  const floatSpeed = 0.5;

  const containerStyle: React.CSSProperties = {
    perspective: `${depth * 2}px`,
    perspectiveOrigin: "center 40%",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const roomStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transformStyle: "preserve-3d",
    transform: "rotateX(-45deg) rotateZ(5deg)",
  };

  // Floor
  const floorStyle: React.CSSProperties = {
    position: "absolute",
    width: "200%",
    height: "100%",
    top: "50%",
    left: "-50%",
    background:
      "linear-gradient(90deg, rgba(51, 134, 255, 0.1) 0%, rgba(255, 0, 110, 0.1) 100%)",
    border: "2px solid rgba(51, 134, 255, 0.3)",
    transform: "rotateX(90deg) translateZ(-400px)",
    transformStyle: "preserve-3d",
  };

  // Back wall
  const backWallStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    background: "rgba(131, 56, 236, 0.05)",
    border: "2px solid rgba(131, 56, 236, 0.3)",
    transform: "translateZ(-800px)",
    transformStyle: "preserve-3d",
  };

  return (
    <div style={containerStyle}>
      <div style={roomStyle}>
        {/* Walls */}
        <div style={floorStyle} />
        <div style={backWallStyle} />

        {/* Floating objects */}
        {items.slice(0, 4).map((item: string, index: number) => {
          const floatY = float(frame, fps, floatSpeed, index * 800);
          const rotZ = rotate(frame, 30 * rotationSpeed, fps) + index * 45;
          const color = getColorFromPalette(index);
          const xPos = -300 + index * 200;
          const zPos = -300 + (index % 2) * 200;

          const floatingObjectStyle: React.CSSProperties = {
            position: "absolute",
            width: 120,
            height: 120,
            left: "50%",
            top: "50%",
            marginLeft: -60 + xPos,
            marginTop: -60 + floatY * 40,
            transformStyle: "preserve-3d",
            transform: `rotateZ(${rotZ}deg) translateZ(${zPos}px)`,
            background: `rgba(255, 255, 255, 0.08)`,
            border: `2px solid ${color}`,
            borderRadius: "12px",
            boxShadow: glowShadow(color, 0.6),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#ffffff",
            fontWeight: 600,
            textAlign: "center",
            padding: "16px",
          };

          return (
            <div key={index} style={floatingObjectStyle}>
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ThreeScene: React.FC<TemplateProps> = ({ params }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Extract parameters with defaults
  const preset = (params.preset as string) || "floating_cards";
  const title = (params.title as string) || "";
  const subtitle = (params.subtitle as string) || "";
  const items = (params.items as string[]) || ["Item 1", "Item 2", "Item 3", "Item 4"];
  const depth = (params.depth as number) || 800;
  const rotationSpeed = (params.rotationSpeed as number) || 1;

  const containerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: "radial-gradient(circle at 50% 50%, rgba(0, 217, 255, 0.05) 0%, rgba(0, 0, 0, 0.9) 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  };

  // Render the appropriate scene based on preset
  const renderScene = (): React.ReactNode => {
    switch (preset as PresetType) {
      case "floating_cards":
        return (
          <FloatingCardsScene
            frame={frame}
            fps={fps}
            depth={depth}
            rotationSpeed={rotationSpeed}
            items={items}
            width={width}
            height={height}
          />
        );
      case "rotating_cube":
        return (
          <RotatingCubeScene
            frame={frame}
            fps={fps}
            depth={depth}
            rotationSpeed={rotationSpeed}
            items={items}
            width={width}
            height={height}
          />
        );
      case "tunnel":
        return (
          <TunnelScene
            frame={frame}
            fps={fps}
            depth={depth}
            rotationSpeed={rotationSpeed}
            items={items}
            width={width}
            height={height}
          />
        );
      case "orbit":
        return (
          <OrbitScene
            frame={frame}
            fps={fps}
            depth={depth}
            rotationSpeed={rotationSpeed}
            items={items}
            width={width}
            height={height}
          />
        );
      case "stack":
        return (
          <StackScene
            frame={frame}
            fps={fps}
            depth={depth}
            rotationSpeed={rotationSpeed}
            items={items}
            width={width}
            height={height}
          />
        );
      case "room":
        return (
          <RoomScene
            frame={frame}
            fps={fps}
            depth={depth}
            rotationSpeed={rotationSpeed}
            items={items}
            width={width}
            height={height}
          />
        );
      default:
        return (
          <FloatingCardsScene
            frame={frame}
            fps={fps}
            depth={depth}
            rotationSpeed={rotationSpeed}
            items={items}
            width={width}
            height={height}
          />
        );
    }
  };

  return (
    <AbsoluteFill style={containerStyle}>
      {/* Title overlay */}
      {title && (
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 10,
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
            opacity: fadeIn(frame, fps, 30),
          }}
        >
          {title}
        </div>
      )}

      {/* Main scene */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {renderScene()}
      </div>

      {/* Subtitle overlay */}
      {subtitle && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 10,
            color: "#ffffff",
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: "0.5px",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
            opacity: fadeIn(frame, fps, 60),
          }}
        >
          {subtitle}
        </div>
      )}
    </AbsoluteFill>
  );
};
