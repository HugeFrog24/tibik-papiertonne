export type Surface = "concrete" | "wood";

export const footstepTake = (i: number, { surface = "concrete", room, variant = 0 }: { readonly surface?: Surface; readonly room?: "stairwell"; readonly variant?: number } = {}) => {
  const take = `footstep_${surface}_00${(i + variant) % 4}`;
  return room ? `${room}/${take}.wav` : `${take}.ogg`;
};

export const footstepPlan = (times: readonly number[], fps: number, take: { readonly surface?: Surface; readonly room?: "stairwell"; readonly variant?: number } = {}) =>
  [...new Set(times.map((t) => Math.round(t * fps)))].map((frame, i) => ({ frame, file: footstepTake(i, take) }));
