export const FPS = 30;

export const atFrame = (t: number) => Math.round(t * FPS) / FPS;

export const FRAME_SIZE = { width: 1920, height: 1080 };
