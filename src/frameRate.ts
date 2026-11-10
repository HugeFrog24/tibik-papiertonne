export const FPS = 30;

export const atFrame = (t: number) => Math.round(t * FPS) / FPS;

export const firstFrameAfter = (t: number) => (Math.floor(t * FPS + 1e-6) + 1) / FPS;

export const FORMATS = {
  wide: { width: 1920, height: 1080 },
  tall: { width: 1080, height: 1920 },
} as const;

export type Format = keyof typeof FORMATS;

export const aspectOf = (format: Format) => FORMATS[format].width / FORMATS[format].height;

export const formatOf = (size: { readonly width: number; readonly height: number }): Format => (size.height > size.width ? "tall" : "wide");
