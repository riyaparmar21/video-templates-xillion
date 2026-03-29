import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadRaleway } from "@remotion/google-fonts/Raleway";
import { BackgroundLayer, FrontSupportTextLayer, RearHeroTextLayer, SubjectCutoutLayer, TagTextLayer } from "./layers";
import { DEFAULT_BG_COLOR, DEFAULT_SAFE_AREA, DEFAULT_TEXT_COLOR } from "./defaults";
import { getBlockForFrame, getEffectiveSafeArea, getMaskMetaForFrame } from "./layout";
import type { MaskManifest, SpatialPlan, Template3dCaptionsProps } from "./types";

const montserrat = loadMontserrat("normal", {
  weights: ["700", "900"],
});

const raleway = loadRaleway("normal", {
  weights: ["600", "700", "800"],
});

const loadJson = async <T,>(src: string): Promise<T> => {
  const response = await fetch(staticFile(src));
  if (!response.ok) {
    throw new Error(`Failed to load ${src}: ${response.status}`);
  }

  return (await response.json()) as T;
};

/* useMaskDataUrl removed — the SubjectCutoutLayer now handles mask
   preloading via Remotion's <Img> component which natively calls
   delayRender/continueRender per src change, avoiding the race condition
   where CSS mask-image loads after the frame is captured. */

export const Template3dCaptions: React.FC<Template3dCaptionsProps> = ({
  data,
  resolvedPlan,
  resolvedMaskManifest,
}) => {
  const frame = useCurrentFrame();

  // ── Use pre-resolved data when available (reliable), fall back to async fetch ──
  const planRef = useRef<SpatialPlan | null>(resolvedPlan ?? null);
  const maskManifestRef = useRef<MaskManifest | null>(resolvedMaskManifest ?? null);
  const alreadyResolved = !!(resolvedPlan && resolvedMaskManifest);
  const [loaded, setLoaded] = useState(alreadyResolved);
  const [handle] = useState(() =>
    alreadyResolved ? null : delayRender("3dCaptions assets"),
  );

  useEffect(() => {
    // Skip async loading if data was passed as props
    if (alreadyResolved) {
      return;
    }

    let cancelled = false;

    const loadAssets = async () => {
      try {
        const [planJson, maskJson] = await Promise.all([
          loadJson<SpatialPlan>(data.planSrc),
          loadJson<MaskManifest>(data.maskManifestSrc),
        ]);

        if (cancelled) {
          return;
        }

        // Set refs synchronously so data is available immediately
        planRef.current = planJson;
        maskManifestRef.current = maskJson;
        setLoaded(true);

        if (handle !== null) {
          continueRender(handle);
        }
      } catch (error) {
        if (!cancelled) {
          cancelRender(error instanceof Error ? error : new Error(String(error)));
        }
      }
    };

    loadAssets();

    return () => {
      cancelled = true;
    };
  }, [alreadyResolved, data.maskManifestSrc, data.planSrc, handle]);

  const plan = planRef.current;
  const maskManifest = maskManifestRef.current;

  const safeArea = useMemo(
    () => getEffectiveSafeArea(data.safeArea ?? DEFAULT_SAFE_AREA),
    [data.safeArea],
  );
  const block = useMemo(
    () => (plan ? getBlockForFrame(plan, frame) : null),
    [frame, plan],
  );
  const maskMeta = useMemo(
    () => (maskManifest ? getMaskMetaForFrame(maskManifest, frame) : null),
    [frame, maskManifest],
  );

  if (!loaded || !plan || !maskManifest) {
    return null;
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: data.bgColor ?? DEFAULT_BG_COLOR,
        color: data.textColor ?? DEFAULT_TEXT_COLOR,
        fontFamily: montserrat.fontFamily,
        ["--caption-display-font" as string]: montserrat.fontFamily,
        ["--caption-support-font" as string]: raleway.fontFamily,
        overflow: "hidden",
      }}
    >
      <BackgroundLayer data={data} />

      {block ? (
        <>
          <RearHeroTextLayer
            block={block}
            maskMeta={maskMeta}
            data={data}
            frame={frame}
          />
          <TagTextLayer
            block={block}
            data={data}
            frame={frame}
          />
          <SubjectCutoutLayer data={data} maskMeta={maskMeta} />
          <FrontSupportTextLayer
            block={block}
            maskMeta={maskMeta}
            data={data}
            frame={frame}
          />
        </>
      ) : null}

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          boxShadow: "inset 0 0 180px rgba(0, 0, 0, 0.26)",
          borderTop: `${safeArea.top * data.height}px solid transparent`,
          borderRight: `${safeArea.right * data.width}px solid transparent`,
          borderBottom: `${safeArea.bottom * data.height}px solid transparent`,
          borderLeft: `${safeArea.left * data.width}px solid transparent`,
        }}
      />
    </AbsoluteFill>
  );
};

export default Template3dCaptions;
