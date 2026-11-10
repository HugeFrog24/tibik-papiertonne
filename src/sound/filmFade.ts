import { kf } from "../characters/animate";

export const FILM_FADE = { in: 0.5, out: 2.5 };

export const filmFadeAt = (t: number, length: number) =>
  kf(t, [0, FILM_FADE.in, length - FILM_FADE.out, length], [0, 1, 1, 0]);
