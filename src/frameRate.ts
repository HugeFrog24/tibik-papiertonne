export const TIMELINE_FPS = 30;

export const RENDER_RATES = [30, 60, 90, 120] as const;

export const atFrame = (t: number) => Math.round(t * TIMELINE_FPS) / TIMELINE_FPS;

export const renderFrame = (t: number, fps: number) => Math.round(Math.round(t * TIMELINE_FPS) * (fps / TIMELINE_FPS));

export const firstFrameAfter = (t: number) => (Math.floor(t * TIMELINE_FPS + 1e-6) + 1) / TIMELINE_FPS;

export const FORMATS = {
  wide: { width: 1920, height: 1080 },
  tall: { width: 1080, height: 1920 },
} as const;

export type Format = keyof typeof FORMATS;

export const FINEST_PIXEL_RATIO = 4;

export const aspectOf = (format: Format) => FORMATS[format].width / FORMATS[format].height;

export const formatOf = (size: { readonly width: number; readonly height: number }): Format => (size.height > size.width ? "tall" : "wide");
