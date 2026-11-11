import { z } from "zod";
import { RENDER_RATES, TIMELINE_FPS, renderFrame } from "./frameRate";
import { LANGUAGES, type Language } from "./language";

export const RENDER_PROPS = z.object({
  fps: z.number().int().min(TIMELINE_FPS).max(Math.max(...RENDER_RATES)).multipleOf(TIMELINE_FPS),
  language: z.enum(LANGUAGES),
});

export type RenderProps = z.infer<typeof RENDER_PROPS>;

export const BY_DEFAULT: RenderProps = { fps: TIMELINE_FPS, language: "de" };

export const atRenderRate =
  (ticks: (language: Language) => number) =>
  ({ props }: { readonly props: RenderProps }) => ({ fps: props.fps, durationInFrames: renderFrame(ticks(props.language) / TIMELINE_FPS, props.fps) });
