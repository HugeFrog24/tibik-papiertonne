export const flurSpill = (doorAngle: number) =>
  Math.min(1, 1 - Math.cos(doorAngle));
