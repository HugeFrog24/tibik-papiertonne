export const takeId = (scene: string, index: number, voice: string) => `${scene}_${String(index + 1).padStart(2, "0")}_${voice}`;
