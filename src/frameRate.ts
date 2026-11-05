export const FPS = 30;

export const atFrame = (t: number) => Math.round(t * FPS) / FPS;
