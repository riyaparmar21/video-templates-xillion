/**
 * Engine barrel export.
 */
export { DynamicVideo, DynamicVideoSchema, computeTotalFrames } from "./DynamicVideo";
export { Camera } from "./Camera";
export { TransitionWrapper } from "./Transitions";
export { templateRegistry, getTemplate } from "./registry";
export {
  VideoSpecSchema,
  SceneSchema,
  PaletteSchema,
  TemplateName,
} from "./schema";
export type {
  VideoSpec,
  SceneSpec,
  Palette,
  Typography,
  CameraConfig,
  TemplateProps,
} from "./schema";
