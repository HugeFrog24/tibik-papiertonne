export type SceneAmbience = {
  readonly indoors: (t: number) => number;
  readonly hush: (t: number) => number;
  readonly duck: (t: number) => number;
};

export const OUT_IN_THE_STREET: SceneAmbience = { indoors: () => 0, hush: () => 1, duck: () => 1 };

export const ambienceOf = (ambience: Partial<SceneAmbience>): SceneAmbience => ({ ...OUT_IN_THE_STREET, ...ambience });
