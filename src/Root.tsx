import React from "react";
import { Composition } from "remotion";

// ── DynamicVideo (combined multi-template composition) ──
import { DynamicVideo, DynamicVideoSchema, computeTotalFrames } from "./engine/DynamicVideo";
import { VideoSpecSchema } from "./engine/schema";

// ── Auto-load latest generated spec (written by generate.py / generate_from_script.py) ──
import latestSpec from "./latest-spec.json";

// ── Kinetic Captions ──
import { KineticCaptions } from "./templates/KineticCaptions";
import captionSpec from "./kinetic-captions-spec.json";

// ── Animated Web Screens ──
import { AnimatedWebScreens } from "./templates/AnimatedWebScreens";
import webScreensSpec from "./animated-web-screens-spec.json";

// ── Animated Search Bar ──
import { AnimatedSearchBar } from "./templates/AnimatedSearchBar";
import searchBarSpec from "./animated-search-bar-spec.json";

// ── iOS Notification ──
import { IOSNotification } from "./templates/IOSNotification";
import notificationSpec from "./ios-notification-spec.json";

// ── Inflating Text ──
import { InflatingText } from "./templates/InflatingText";
import inflatingTextSpec from "./inflating-text-spec.json";

// ── Progress Bar ──
import { ProgressBar } from "./templates/ProgressBar";
import progressBarSpec from "./progress-bar-spec.json";

// ── Blur Text Scroller ──
import { BlurTextScroller } from "./templates/BlurTextScroller";
import blurScrollerSpec from "./blur-text-scroller-spec.json";

// ── Vault Animated Cards ──
import { VaultAnimatedCards } from "./templates/VaultAnimatedCards";
import vaultCardsSpec from "./vault-animated-cards-spec.json";

// ── Color Blend Blocks ──
import { ColorBlendBlocks } from "./templates/ColorBlendBlocks";
import colorBlendBlocksSpec from "./color-blend-blocks-spec.json";

// ── Tweet ──
import { Tweet } from "./templates/Tweet";
import tweetSpec from "./tweet-spec.json";

// ── Product Reveal Track ──
import { ProductRevealTrack } from "./templates/ProductRevealTrack";
import productRevealTrackSpec from "./product-reveal-track-spec.json";

// ── White Social Handle ──
import { WhiteSocialHandle } from "./templates/WhiteSocialHandle";
import whiteSocialHandleSpec from "./white-social-handle-spec.json";

// ── Showreel Grid ──
import { ShowreelGrid } from "./templates/ShowreelGrid";
import showreelGridSpec from "./showreel-grid-spec.json";

// ── Mobile Showreel Frames ──
import { MobileShowreelFrames } from "./templates/MobileShowreelFrames";
import mobileShowreelFramesSpec from "./mobile-showreel-frames-spec.json";

// ── Stack Hiring ──
import { StackHiring } from "./templates/StackHiring";
import stackHiringSpec from "./stack-hiring-spec.json";

// ── Slideshow Social ──
import { SlideshowSocial } from "./templates/SlideshowSocial";
import { DesignPreview } from "./templates/DesignPreview";
import designPreviewSpec from "./design-preview-spec.json";
import slideshowSocialSpec from "./slideshow-social-spec.json";

// ── Gen AI Features ──
import { GenAiFeatures } from "./templates/GenAiFeatures";
import genAiFeaturesSpec from "./gen-ai-features-spec.json";

// ── Vault Card Features ──
import { VaultCardFeatures } from "./templates/VaultCardFeatures";
import vaultCardFeaturesSpec from "./vault-card-features-spec.json";

// ── Showcase ──
import { Showcase } from "./templates/Showcase";
import showcaseSpec from "./showcase-spec.json";

// ── Route Text ──
import { RouteText } from "./templates/RouteText";
import routeTextSpec from "./route-text-spec.json";

// ── Parallax Image Reveal ──
import { ParallaxImageReveal } from "./templates/ParallaxImageReveal";
import parallaxImageRevealSpec from "./parallax-image-reveal-spec.json";

// ── 3D Card Flip ──
import { ThreeDCardFlip } from "./templates/ThreeDCardFlip";
import { CubeRotation } from "./templates/CubeRotation";
import threeDCardFlipSpec from "./three-d-card-flip-spec.json";
import cubeRotationSpec from "./cube-rotation-spec.json";

// ── Gradient Wash ──
import { GradientWash } from "./templates/GradientWash";
import gradientWashSpec from "./gradient-wash-spec.json";

// ── Split Screen Morph ──
import { SplitScreenMorph } from "./templates/SplitScreenMorph";
import splitScreenMorphSpec from "./split-screen-morph-spec.json";

// ── Number Counter Scene ──
import { NumberCounterScene } from "./templates/NumberCounterScene";
import numberCounterSceneSpec from "./number-counter-scene-spec.json";

// ── Text Reveal Wipe ──
import { TextRevealWipe } from "./templates/TextRevealWipe";
import textRevealWipeSpec from "./text-reveal-wipe-spec.json";

// ── Logo Stinger ──
import { LogoStinger } from "./templates/LogoStinger";
import logoStingerSpec from "./logo-stinger-spec.json";

// ── Spiral Captions ──
import { SpiralCaptions } from "./templates/SpiralCaptions";
import spiralCaptionsSpec from "./spiral-captions-spec.json";

// ── Depth Captions ──
import { DepthCaptions } from "./templates/DepthCaptions";
import depthCaptionsSpec from "./depth-captions-spec.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Kinetic Captions Composition ── */}
      <Composition
        id="KineticCaptions"
        component={KineticCaptions}
        durationInFrames={captionSpec.durationFrames}
        fps={captionSpec.fps}
        width={captionSpec.width}
        height={captionSpec.height}
        defaultProps={{
          captionData: captionSpec as any,
        }}
      />

      {/* ── Animated Web Screens Composition ── */}
      <Composition
        id="AnimatedWebScreens"
        component={AnimatedWebScreens}
        durationInFrames={Math.round((webScreensSpec.durationMs / 1000) * webScreensSpec.fps)}
        fps={webScreensSpec.fps}
        width={webScreensSpec.width}
        height={webScreensSpec.height}
        defaultProps={{
          data: webScreensSpec as any,
        }}
      />

      {/* ── Animated Search Bar Composition ── */}
      <Composition
        id="AnimatedSearchBar"
        component={AnimatedSearchBar}
        durationInFrames={Math.round((searchBarSpec.durationMs / 1000) * searchBarSpec.fps)}
        fps={searchBarSpec.fps}
        width={searchBarSpec.width}
        height={searchBarSpec.height}
        defaultProps={{
          data: searchBarSpec as any,
        }}
      />

      {/* ── iOS Notification Composition ── */}
      <Composition
        id="IOSNotification"
        component={IOSNotification}
        durationInFrames={Math.round((notificationSpec.durationMs / 1000) * notificationSpec.fps)}
        fps={notificationSpec.fps}
        width={notificationSpec.width}
        height={notificationSpec.height}
        defaultProps={{
          data: notificationSpec as any,
        }}
      />

      {/* ── Inflating Text Composition ── */}
      <Composition
        id="InflatingText"
        component={InflatingText}
        durationInFrames={Math.round((inflatingTextSpec.durationMs / 1000) * inflatingTextSpec.fps)}
        fps={inflatingTextSpec.fps}
        width={inflatingTextSpec.width}
        height={inflatingTextSpec.height}
        defaultProps={{
          data: inflatingTextSpec as any,
        }}
      />
      {/* ── Progress Bar Composition ── */}
      <Composition
        id="ProgressBar"
        component={ProgressBar}
        durationInFrames={Math.round((progressBarSpec.durationMs / 1000) * progressBarSpec.fps)}
        fps={progressBarSpec.fps}
        width={progressBarSpec.width}
        height={progressBarSpec.height}
        defaultProps={{
          data: progressBarSpec as any,
        }}
      />

      {/* ── Blur Text Scroller Composition ── */}
      <Composition
        id="BlurTextScroller"
        component={BlurTextScroller}
        durationInFrames={Math.round((blurScrollerSpec.durationMs / 1000) * blurScrollerSpec.fps)}
        fps={blurScrollerSpec.fps}
        width={blurScrollerSpec.width}
        height={blurScrollerSpec.height}
        defaultProps={{
          data: blurScrollerSpec as any,
        }}
      />

      {/* ── Vault Animated Cards Composition ── */}
      <Composition
        id="VaultAnimatedCards"
        component={VaultAnimatedCards}
        durationInFrames={Math.round((vaultCardsSpec.durationMs / 1000) * vaultCardsSpec.fps)}
        fps={vaultCardsSpec.fps}
        width={vaultCardsSpec.width}
        height={vaultCardsSpec.height}
        defaultProps={{
          data: vaultCardsSpec as any,
        }}
      />

      {/* ── Color Blend Blocks Composition ── */}
      <Composition
        id="ColorBlendBlocks"
        component={ColorBlendBlocks}
        durationInFrames={Math.round((colorBlendBlocksSpec.durationMs / 1000) * colorBlendBlocksSpec.fps)}
        fps={colorBlendBlocksSpec.fps}
        width={colorBlendBlocksSpec.width}
        height={colorBlendBlocksSpec.height}
        defaultProps={{
          data: colorBlendBlocksSpec as any,
        }}
      />
      {/* ── Tweet Composition ── */}
      <Composition
        id="Tweet"
        component={Tweet}
        durationInFrames={Math.round((tweetSpec.durationMs / 1000) * tweetSpec.fps)}
        fps={tweetSpec.fps}
        width={tweetSpec.width}
        height={tweetSpec.height}
        defaultProps={{
          data: tweetSpec as any,
        }}
      />
      {/* ── Product Reveal Track Composition ── */}
      <Composition
        id="ProductRevealTrack"
        component={ProductRevealTrack}
        durationInFrames={Math.round((productRevealTrackSpec.durationMs / 1000) * productRevealTrackSpec.fps)}
        fps={productRevealTrackSpec.fps}
        width={productRevealTrackSpec.width}
        height={productRevealTrackSpec.height}
        defaultProps={{
          data: productRevealTrackSpec as any,
        }}
      />
      {/* ── White Social Handle Composition ── */}
      <Composition
        id="WhiteSocialHandle"
        component={WhiteSocialHandle}
        durationInFrames={Math.round((whiteSocialHandleSpec.durationMs / 1000) * whiteSocialHandleSpec.fps)}
        fps={whiteSocialHandleSpec.fps}
        width={whiteSocialHandleSpec.width}
        height={whiteSocialHandleSpec.height}
        defaultProps={{
          data: whiteSocialHandleSpec as any,
        }}
      />
      {/* ── Showreel Grid Composition ── */}
      <Composition
        id="ShowreelGrid"
        component={ShowreelGrid}
        durationInFrames={Math.round((showreelGridSpec.durationMs / 1000) * showreelGridSpec.fps)}
        fps={showreelGridSpec.fps}
        width={showreelGridSpec.width}
        height={showreelGridSpec.height}
        defaultProps={{
          data: showreelGridSpec as any,
        }}
      />
      {/* ── Mobile Showreel Frames Composition ── */}
      <Composition
        id="MobileShowreelFrames"
        component={MobileShowreelFrames}
        durationInFrames={Math.round((mobileShowreelFramesSpec.durationMs / 1000) * mobileShowreelFramesSpec.fps)}
        fps={mobileShowreelFramesSpec.fps}
        width={mobileShowreelFramesSpec.width}
        height={mobileShowreelFramesSpec.height}
        defaultProps={{
          data: mobileShowreelFramesSpec as any,
        }}
      />
      {/* ── Stack Hiring Composition ── */}
      <Composition
        id="StackHiring"
        component={StackHiring}
        durationInFrames={Math.round((stackHiringSpec.durationMs / 1000) * stackHiringSpec.fps)}
        fps={stackHiringSpec.fps}
        width={stackHiringSpec.width}
        height={stackHiringSpec.height}
        defaultProps={{
          data: stackHiringSpec as any,
        }}
      />
      {/* ── Slideshow Social Composition ── */}
      <Composition
        id="SlideshowSocial"
        component={SlideshowSocial}
        durationInFrames={Math.round((slideshowSocialSpec.durationMs / 1000) * slideshowSocialSpec.fps)}
        fps={slideshowSocialSpec.fps}
        width={slideshowSocialSpec.width}
        height={slideshowSocialSpec.height}
        defaultProps={{
          data: slideshowSocialSpec as any,
        }}
      />

      {/* ── Design Preview Composition ── */}
      <Composition
        id="DesignPreview"
        component={DesignPreview}
        durationInFrames={Math.round((designPreviewSpec.durationMs / 1000) * designPreviewSpec.fps)}
        fps={designPreviewSpec.fps}
        width={designPreviewSpec.width}
        height={designPreviewSpec.height}
        defaultProps={{
          data: designPreviewSpec as any,
        }}
      />

      {/* ── Gen AI Features Composition ── */}
      <Composition
        id="GenAiFeatures"
        component={GenAiFeatures}
        durationInFrames={Math.round((genAiFeaturesSpec.durationMs / 1000) * genAiFeaturesSpec.fps)}
        fps={genAiFeaturesSpec.fps}
        width={genAiFeaturesSpec.width}
        height={genAiFeaturesSpec.height}
        defaultProps={{
          data: genAiFeaturesSpec as any,
        }}
      />

      {/* ── Vault Card Features Composition ── */}
      <Composition
        id="VaultCardFeatures"
        component={VaultCardFeatures}
        durationInFrames={Math.round((vaultCardFeaturesSpec.durationMs / 1000) * vaultCardFeaturesSpec.fps)}
        fps={vaultCardFeaturesSpec.fps}
        width={vaultCardFeaturesSpec.width}
        height={vaultCardFeaturesSpec.height}
        defaultProps={{
          data: vaultCardFeaturesSpec as any,
        }}
      />

      {/* ── Showcase Composition ── */}
      <Composition
        id="Showcase"
        component={Showcase}
        durationInFrames={Math.round((showcaseSpec.durationMs / 1000) * showcaseSpec.fps)}
        fps={showcaseSpec.fps}
        width={showcaseSpec.width}
        height={showcaseSpec.height}
        defaultProps={{
          data: showcaseSpec as any,
        }}
      />

      {/* ── Route Text Composition ── */}
      <Composition
        id="RouteText"
        component={RouteText}
        durationInFrames={Math.round((routeTextSpec.durationMs / 1000) * routeTextSpec.fps)}
        fps={routeTextSpec.fps}
        width={routeTextSpec.width}
        height={routeTextSpec.height}
        defaultProps={{
          data: routeTextSpec as any,
        }}
      />

      {/* ── Parallax Image Reveal Composition ── */}
      <Composition
        id="ParallaxImageReveal"
        component={ParallaxImageReveal as any}
        durationInFrames={Math.round((parallaxImageRevealSpec.durationMs / 1000) * parallaxImageRevealSpec.fps)}
        fps={parallaxImageRevealSpec.fps}
        width={parallaxImageRevealSpec.width}
        height={parallaxImageRevealSpec.height}
        defaultProps={{
          data: parallaxImageRevealSpec as any,
        }}
      />

      {/* ── 3D Card Flip Composition ── */}
      <Composition
        id="ThreeDCardFlip"
        component={ThreeDCardFlip as any}
        durationInFrames={Math.round((threeDCardFlipSpec.durationMs / 1000) * threeDCardFlipSpec.fps)}
        fps={threeDCardFlipSpec.fps}
        width={threeDCardFlipSpec.width}
        height={threeDCardFlipSpec.height}
        defaultProps={{
          data: threeDCardFlipSpec as any,
        }}
      />

      {/* ── Cube Rotation Composition ── */}
      <Composition
        id="CubeRotation"
        component={CubeRotation as any}
        durationInFrames={Math.round((cubeRotationSpec.durationMs / 1000) * cubeRotationSpec.fps)}
        fps={cubeRotationSpec.fps}
        width={cubeRotationSpec.width}
        height={cubeRotationSpec.height}
        defaultProps={{
          data: cubeRotationSpec as any,
        }}
      />

      {/* ── Gradient Wash Composition ── */}
      <Composition
        id="GradientWash"
        component={GradientWash as any}
        durationInFrames={Math.round((gradientWashSpec.durationMs / 1000) * gradientWashSpec.fps)}
        fps={gradientWashSpec.fps}
        width={gradientWashSpec.width}
        height={gradientWashSpec.height}
        defaultProps={{
          data: gradientWashSpec as any,
        }}
      />

      {/* ── Split Screen Morph Composition ── */}
      <Composition
        id="SplitScreenMorph"
        component={SplitScreenMorph as any}
        durationInFrames={Math.round((splitScreenMorphSpec.durationMs / 1000) * splitScreenMorphSpec.fps)}
        fps={splitScreenMorphSpec.fps}
        width={splitScreenMorphSpec.width}
        height={splitScreenMorphSpec.height}
        defaultProps={{
          data: splitScreenMorphSpec as any,
        }}
      />

      {/* ── Number Counter Scene Composition ── */}
      <Composition
        id="NumberCounterScene"
        component={NumberCounterScene as any}
        durationInFrames={Math.round((numberCounterSceneSpec.durationMs / 1000) * numberCounterSceneSpec.fps)}
        fps={numberCounterSceneSpec.fps}
        width={numberCounterSceneSpec.width}
        height={numberCounterSceneSpec.height}
        defaultProps={{
          data: numberCounterSceneSpec as any,
        }}
      />

      {/* ── Text Reveal Wipe Composition ── */}
      <Composition
        id="TextRevealWipe"
        component={TextRevealWipe as any}
        durationInFrames={Math.round((textRevealWipeSpec.durationMs / 1000) * textRevealWipeSpec.fps)}
        fps={textRevealWipeSpec.fps}
        width={textRevealWipeSpec.width}
        height={textRevealWipeSpec.height}
        defaultProps={{
          data: textRevealWipeSpec as any,
        }}
      />

      {/* ── Logo Stinger Composition ── */}
      <Composition
        id="LogoStinger"
        component={LogoStinger as any}
        durationInFrames={Math.round((logoStingerSpec.durationMs / 1000) * logoStingerSpec.fps)}
        fps={logoStingerSpec.fps}
        width={logoStingerSpec.width}
        height={logoStingerSpec.height}
        defaultProps={{
          data: logoStingerSpec as any,
        }}
      />

      {/* ── Spiral Captions Composition ── */}
      <Composition
        id="SpiralCaptions"
        component={SpiralCaptions}
        durationInFrames={Math.round((spiralCaptionsSpec.durationMs / 1000) * spiralCaptionsSpec.fps)}
        fps={spiralCaptionsSpec.fps}
        width={spiralCaptionsSpec.width}
        height={spiralCaptionsSpec.height}
        defaultProps={{
          data: spiralCaptionsSpec as any,
        }}
      />

      {/* ── Depth Captions Composition ── */}
      <Composition
        id="DepthCaptions"
        component={DepthCaptions}
        durationInFrames={Math.round((depthCaptionsSpec.durationMs / 1000) * depthCaptionsSpec.fps)}
        fps={depthCaptionsSpec.fps}
        width={depthCaptionsSpec.width}
        height={depthCaptionsSpec.height}
        defaultProps={{
          data: depthCaptionsSpec as any,
        }}
      />

      {/* ── GeneratedVideo (DynamicVideo multi-template composition) ── */}
      <Composition
        id="GeneratedVideo"
        component={DynamicVideo}
        schema={DynamicVideoSchema}
        calculateMetadata={async ({ props }) => {
          try {
            const spec = VideoSpecSchema.parse(JSON.parse(props.specJson));
            const totalFrames = computeTotalFrames(spec.scenes, spec.fps);
            return {
              durationInFrames: totalFrames,
              fps: spec.fps,
              width: spec.width,
              height: spec.height,
            };
          } catch {
            return {
              durationInFrames: 300,
              fps: 30,
              width: 1080,
              height: 1920,
            };
          }
        }}
        defaultProps={{
          specJson: JSON.stringify(latestSpec),
        }}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
