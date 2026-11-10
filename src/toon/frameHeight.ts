export const frameHeightAt = (depth: number, fovDegrees: number) => 2 * depth * Math.tan((fovDegrees * Math.PI) / 360);
