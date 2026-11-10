export const GRAVITY = 9.81;

export const heightAfter = (from: number, upSpeed: number, t: number) => from + upSpeed * t - (GRAVITY * t * t) / 2;

export const landsAfter = (drop: number, upSpeed: number) => (upSpeed + Math.sqrt(upSpeed * upSpeed + 2 * GRAVITY * drop)) / GRAVITY;

export const upSpeedToLand = (drop: number, flight: number) => -((drop - (GRAVITY * flight * flight) / 2) / flight);
