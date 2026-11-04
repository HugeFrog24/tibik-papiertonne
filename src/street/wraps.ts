export type Faceted = {
  readonly segments: number;
  readonly radiusAt: (y: number) => number;
};

export type TaperedPole = Faceted & {
  readonly radius: readonly [number, number];
  readonly height: number;
};

export const taperedPole = (
  radius: readonly [number, number],
  height: number,
  segments: number,
): TaperedPole => ({
  radius,
  height,
  segments,
  radiusAt: (y) => radius[1] + ((radius[0] - radius[1]) * y) / height,
});

export const poleBox = (pole: TaperedPole): [number, number, number] => [
  2 * pole.radius[1],
  pole.height,
  2 * pole.radius[1],
];

export type Wrap<D extends string = string> = {
  readonly face: number;
  readonly faces: number;
  readonly bottom: number;
  readonly height: number;
  readonly design: D;
};

const WRAP_GAP = 0.001;

export const faceAngle = (pole: Faceted) => (2 * Math.PI) / pole.segments;

export const wrapGeometry = (pole: Faceted, wrap: Wrap) => {
  const face = faceAngle(pole);
  const lift = WRAP_GAP / Math.cos(face / 2);
  const top = wrap.bottom + wrap.height;
  return {
    y: wrap.bottom + wrap.height / 2,
    args: [
      pole.radiusAt(top) + lift,
      pole.radiusAt(wrap.bottom) + lift,
      wrap.height,
      wrap.faces,
      1,
      true,
      wrap.face * face,
      wrap.faces * face,
    ] as [number, number, number, number, number, boolean, number, number],
  };
};

export const wrapWidth = (pole: Faceted, wrap: Wrap) => {
  const radius = pole.radiusAt(wrap.bottom + wrap.height / 2);
  return wrap.faces * 2 * radius * Math.sin(Math.PI / pole.segments);
};

export const wrapNormal = (pole: Faceted, wrap: Wrap) => {
  const centre = (wrap.face + wrap.faces / 2) * faceAngle(pole);
  return { x: Math.sin(centre), z: Math.cos(centre) };
};

export const wrapPixels = (pole: Faceted, wrap: Wrap, pxPerM: number) => {
  const width = wrapWidth(pole, wrap);
  return [
    Math.round(width * pxPerM),
    Math.round(wrap.height * pxPerM),
  ] as const;
};
