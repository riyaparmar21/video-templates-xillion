/**
 * DynamicVideo — the composition engine.
 * Reads a VideoSpec JSON and assembles templates into a full Remotion video.
 *
 * Responsibilities:
 * - Maps scene specs to template components via registry
 * - Wraps each scene in a Sequence with proper timing
 * - Applies global Camera effects (ken burns, punch zoom, shake)
 * - Handles transitions between scenes (TransitionWrapper is sole fading authority)
 * - Manages intro/outro master fades
 * - Conditionally renders audio
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { z } from "zod";
import { VideoSpecSchema } from "./schema";
import type { VideoSpec, Palette, Typography } from "./schema";
import { Camera } from "./Camera";
import { TransitionWrapper } from "./Transitions";
import { getTemplate } from "./registry";
import assetMap from "../asset-map.json";

// ── Asset role resolver ──
// Replaces @role tokens (e.g. "@kanban", "@dashboard") with actual file paths
// from the auto-generated asset-map.json. Supports @project:role or just @role.
function resolveAssetRoles(json: string): string {
  const map = assetMap as Record<string, any>;
  const latestProject = map._latest as string | undefined;

  return json.replace(/@([a-zA-Z0-9_-]+(?::[a-zA-Z0-9_-]+)?)/g, (match, token) => {
    let project: string | undefined;
    let role: string;

    if (token.includes(":")) {
      [project, role] = token.split(":");
    } else {
      role = token;
      // Search all projects for this role, prefer _latest
      if (latestProject && map[latestProject]?.[role]) {
        project = latestProject;
      } else {
        for (const p of Object.keys(map)) {
          if (p.startsWith("_")) continue;
          if (map[p]?.[role]) {
            project = p;
            break;
          }
        }
      }
    }

    if (project && map[project]?.[role]?.path) {
      return map[project][role].path;
    }
    // Not a valid asset role — return original string unchanged
    return match;
  });
}

// ── Remotion composition schema (props come as JSON string) ──
export const DynamicVideoSchema = z.object({
  specJson: z.string(), // JSON string of VideoSpec
  audioSrc: z.string().optional(),
});

/**
 * Compute scene frame positions from a VideoSpec.
 * Overlaps occur only between adjacent scenes — last scene plays to full duration.
 */
function computeSceneFrames(
  scenes: VideoSpec["scenes"],
  fps: number
): { start: number; duration: number }[] {
  const result: { start: number; duration: number }[] = [];
  let currentFrame = 0;

  for (let i = 0; i < scenes.length; i++) {
    const sceneDur = Math.round(scenes[i].duration * fps);
    result.push({ start: currentFrame, duration: sceneDur });

    // Only subtract overlap if there IS a next scene to overlap with
    if (i < scenes.length - 1) {
      const transitionType = scenes[i].transition;
      const rawOverlap = Math.round((scenes[i].transitionDuration ?? 0) * fps);
      const maxOverlap = Math.max(0, sceneDur - 1);
      const overlapFrames =
        transitionType === "none"
          ? 0
          : Math.min(rawOverlap, maxOverlap);
      currentFrame += sceneDur - overlapFrames;
    } else {
      // Last scene: no overlap, full duration
      currentFrame += sceneDur;
    }
  }

  return result;
}

/**
 * Compute the actual total frames of the timeline.
 * Used by Root.tsx calculateMetadata so the composition length matches content.
 */
export function computeTotalFrames(
  scenes: VideoSpec["scenes"],
  fps: number
): number {
  const frames = computeSceneFrames(scenes, fps);
  if (frames.length === 0) return 0;
  const last = frames[frames.length - 1];
  return last.start + last.duration;
}

export const DynamicVideo: React.FC<z.infer<typeof DynamicVideoSchema>> = ({
  specJson,
  audioSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Parse and validate spec ──
  let spec: VideoSpec;
  try {
    // Resolve @role asset tokens before parsing
    const resolvedJson = resolveAssetRoles(specJson);
    const raw = JSON.parse(resolvedJson);
    spec = VideoSpecSchema.parse(raw);
  } catch (err) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#1a0000",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
        }}
      >
        <div
          style={{
            color: "#ff4444",
            fontSize: 28,
            fontFamily: "monospace",
            textAlign: "center",
          }}
        >
          Invalid VideoSpec JSON
          <br />
          <span style={{ fontSize: 16, color: "#888" }}>
            {err instanceof Error ? err.message : "Unknown parse error"}
          </span>
        </div>
      </AbsoluteFill>
    );
  }

  const palette: Palette = spec.palette;
  const typography: Typography = spec.typography;

  // ── Calculate scene frame positions ──
  const sceneFrames = computeSceneFrames(spec.scenes, fps);

  // ── Intro/outro master fades (very short — just smooths hard cuts) ──
  const introFrames = Math.round(fps * 0.4);
  const outroFrames = Math.round(fps * 0.4);
  const introOpacity = interpolate(frame, [0, introFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const outroOpacity = interpolate(
    frame,
    [durationInFrames - outroFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const masterOpacity = Math.min(introOpacity, outroOpacity);

  // ── Resolve audio source ──
  const finalAudioSrc = audioSrc || spec.audio.src;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.background,
      }}
    >
    <AbsoluteFill
      style={{
        opacity: masterOpacity,
      }}
    >
      <Camera config={spec.camera}>
        {spec.scenes.map((scene, i) => {
          const { start, duration } = sceneFrames[i];
          const TemplateComponent = getTemplate(scene.template);
          const transitionFrames = Math.round(
            scene.transitionDuration * fps
          );
          const isFirst = i === 0;
          const isLast = i === spec.scenes.length - 1;

          return (
            <Sequence
              key={`scene-${i}`}
              from={start}
              durationInFrames={duration}
              name={`${scene.template}-${i}`}
            >
              <TransitionWrapper
                type={scene.transition}
                durationFrames={transitionFrames}
                sceneDurationFrames={duration}
                isFirst={isFirst}
                isLast={isLast}
              >
                <TemplateComponent
                  params={scene.params}
                  palette={palette}
                  typography={typography}
                  sceneDurationFrames={duration}
                />
              </TransitionWrapper>
            </Sequence>
          );
        })}
      </Camera>

      {/* Audio layer */}
      {finalAudioSrc && <Audio src={finalAudioSrc} />}
    </AbsoluteFill>
    </AbsoluteFill>
  );
};
