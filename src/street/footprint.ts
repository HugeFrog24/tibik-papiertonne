export type Span = readonly [number, number];
export type Footprint = { readonly x: Span; readonly z: Span };

export const footprint = (
  x: number,
  z: number,
  along: number,
  across: number,
): Footprint => ({
  x: [x - along / 2, x + along / 2],
  z: [z - across / 2, z + across / 2],
});

export const rectFootprint = (r: {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
}): Footprint => ({ x: [r.x0, r.x1], z: [r.z0, r.z1] });

export const reachOver = (
  x: number,
  z: number,
  reach: number,
  r: Parameters<typeof rectFootprint>[0],
) => overlap(footprint(x, z, 2 * reach, 2 * reach), rectFootprint(r));

export const overlap = (a: Footprint, b: Footprint) =>
  a.x[0] < b.x[1] && b.x[0] < a.x[1] && a.z[0] < b.z[1] && b.z[0] < a.z[1];

export const partFootprint = (p: {
  readonly center: readonly number[];
  readonly size: readonly number[];
}): Footprint => ({
  x: [p.center[0] - p.size[0] / 2, p.center[0] + p.size[0] / 2],
  z: [p.center[2] - p.size[2] / 2, p.center[2] + p.size[2] / 2],
});
