import { z } from "zod";
import { RENDER_RATES, TIMELINE_FPS, renderFrame } from "./frameRate";

export const RENDER_RATE = z.object({
  fps: z.number().int().min(TIMELINE_FPS).max(Math.max(...RENDER_RATES)).multipleOf(TIMELINE_FPS),
});

export type RenderRate = z.infer<typeof RENDER_RATE>;

export const AT_THE_TIMELINE_RATE: RenderRate = { fps: TIMELINE_FPS };

export const atRenderRate =
  (ticks: number) =>
  ({ props }: { readonly props: RenderRate }) => ({ fps: props.fps, durationInFrames: renderFrame(ticks / TIMELINE_FPS, props.fps) });
