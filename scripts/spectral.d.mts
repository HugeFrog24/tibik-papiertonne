export type Texture = {
  readonly modulation: number[];
  readonly dips: number;
  readonly dip: number;
};

export type Syllable = {
  readonly start: number;
  readonly duration: number;
  readonly level: number;
  readonly pitch: number[];
  readonly envelope: number[];
  readonly partials: number[];
  readonly residual: number[];
  readonly wobble: number;
  readonly texture: Texture;
};

export type Frame = unknown;

export declare const BANDS: [number, number][];
export declare const MODULATION: [number, number][];
export declare const LOBE_WIDTH: number;
export type Kind = {
  readonly pitch: readonly [number, number];
  readonly partials: number;
  readonly harmonicSum: boolean;
  readonly window: number;
};

export declare const COO: Kind;
export declare const BUZZ: Kind;
export declare const analyse: (samples: Float32Array, kind?: Kind) => Frame[];
export declare const syllablesOf: (
  frames: Frame[],
  samples: Float32Array,
) => Syllable[];
export declare const textureOf: (
  samples: Float32Array,
  from: number,
  to: number,
) => Texture;
export declare const round: (value: number, digits?: number) => number;
export declare const fft: (re: Float64Array, im: Float64Array) => void;

export type Buzz = {
  readonly f0: number;
  readonly wander: number;
  readonly partials: number[];
  readonly residual: number[];
  readonly texture: Texture;
};

export declare const buzzOf: (frames: Frame[], samples: Float32Array) => Buzz;
