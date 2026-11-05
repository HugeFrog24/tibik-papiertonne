import { Vector3 } from "three";
import { easeUnit } from "../../characters/scalar";
import {
  LETTER_LAYOUT,
  PT,
  letterLineWidth,
  pointOnLetter,
  type LetterLine,
} from "../../props/letterShape";
import { FRAME_SIZE } from "../../dialogue/screen";
import type { Vec3 } from "../../toon/primitives";
import { camerasOf, type CameraSetup, type Shot } from "../hausmuell/cameras";
import {
  AT_MAILBOX,
  FLAP,
  READ,
  UNFOLD,
  RUNDSCHREIBEN_DURATION,
  letterAt,
} from "./choreography";

export type RundschreibenShot = Shot & { readonly pov?: boolean };

export const CAPTION = { text: "Zwei Wochen später.", from: 0, to: 3 } as const;

const INSERT_FOV = 20;
const MARGIN = 0.006;
const HIDDEN_BELOW = 0.002;
const READABLE = 40;
const ASPECT = FRAME_SIZE.width / FRAME_SIZE.height;

const fixed =
  (position: Vec3, target: Vec3, fov: number) => (): CameraSetup => ({
    position,
    target,
    fov,
  });

const dolly =
  (from: CameraSetup, to: CameraSetup, start: number, end: number) =>
  (t: number): CameraSetup => {
    const k = easeUnit((t - start) / (end - start));
    const mix = (a: Vec3, b: Vec3) => a.map((v, i) => v + (b[i] - v) * k) as unknown as Vec3;
    return {
      position: mix(from.position, to.position),
      target: mix(from.target, to.target),
      fov: from.fov + (to.fov - from.fov) * k,
    };
  };

const insert = (
  lines: readonly LetterLine[],
  from: number,
  to: number,
  keepAbove?: number,
) => {
  const left = Math.min(...lines.map((l) => l.x));
  const right = Math.max(...lines.map((l) => l.x + letterLineWidth(l)));
  const top = Math.min(...lines.map((l) => l.y));
  const bottom = Math.max(...lines.map((l) => l.y + l.pt * PT));
  const largest = (Math.min(...lines.map((l) => l.pt * PT)) * FRAME_SIZE.height) / READABLE;
  const smallest = Math.max(
    (right - left + 2 * MARGIN) / ASPECT,
    bottom - top + 2 * MARGIN,
  );
  const start = Math.min(0.97 * largest, 1.2 * smallest);
  const heights = [start, Math.max(smallest, 0.86 * start)];
  return (t: number): CameraSetup => {
    const k = easeUnit((t - from) / (to - from));
    const height = heights[0] + (heights[1] - heights[0]) * k;
    const centreFromTop =
      keepAbove === undefined
        ? (top + bottom) / 2
        : Math.min((top + bottom) / 2, keepAbove - height / 2);
    const centre = pointOnLetter(letterAt(t)!, (left + right) / 2, centreFromTop);
    const sheet = letterAt(t)!.matrix;
    const normal = new Vector3(0, 0, 1).transformDirection(sheet);
    const distance = height / (2 * Math.tan((INSERT_FOV * Math.PI) / 360));
    return {
      position: centre.clone().addScaledVector(normal, distance).toArray() as Vec3,
      target: centre.toArray() as Vec3,
      fov: INSERT_FOV,
      up: new Vector3(0, 1, 0).transformDirection(sheet).toArray() as Vec3,
    };
  };
};

const roleLines = (...roles: LetterLine["role"][]) =>
  LETTER_LAYOUT.lines.filter((l) => roles.includes(l.role));

const OPENING = FLAP[0] - 0.4;
const THANKS_UP = READ[1];
const DEADPAN = 29.5;
export const FOLDING_SHOT = 30.4;
const CODA = 31.5;

const body = roleLines("body");
const thanks = roleLines("thanks", "signature");
const punchline = Math.min(...thanks.map((l) => l.y));

export const SHOTS: readonly RundschreibenShot[] = [
  {
    name: "Wide: Zwei Wochen später",
    from: 0,
    to: AT_MAILBOX,
    at: fixed([-9.0, 1.8, 1.3], [-3.0, 1.1, -1.4], 45),
  },
  {
    name: "Mailbox",
    from: AT_MAILBOX,
    to: OPENING,
    at: fixed([-3.7, 1.6, -0.5], [-2.75, 1.15, -2.0], 40),
  },
  {
    name: "Opening",
    from: OPENING,
    to: READ[0],
    at: dolly(
      { position: [-2.42, 0.92, -2.14], target: [-2.34, 1.06, -1.73], fov: 50 },
      { position: [-2.42, 1.2, -2.14], target: [-2.32, 1.08, -1.72], fov: 50 },
      FLAP[1],
      UNFOLD[0],
    ),
  },
  {
    name: "Insert: the letter",
    from: READ[0],
    to: THANKS_UP,
    pov: true,
    at: insert(body, READ[0], THANKS_UP, punchline - HIDDEN_BELOW),
  },
  {
    name: "Insert: Vie-len DANK",
    from: THANKS_UP,
    to: DEADPAN,
    pov: true,
    at: insert(thanks, THANKS_UP, DEADPAN),
  },
  {
    name: "Tibik",
    from: DEADPAN,
    to: FOLDING_SHOT,
    at: fixed([-2.62, 1.6, -2.04], [-2.33, 1.56, -1.68], 44),
  },
  {
    name: "His hands: folding it back",
    from: FOLDING_SHOT,
    to: CODA,
    at: fixed([-2.42, 1.2, -2.14], [-2.32, 1.08, -1.72], 50),
  },
  {
    name: "Coda",
    from: CODA,
    to: RUNDSCHREIBEN_DURATION,
    at: fixed([-3.5, 1.7, 1.4], [-0.5, 0.95, -1.7], 50),
  },
];

export const { shotAt, cameraAt } = camerasOf(SHOTS);
