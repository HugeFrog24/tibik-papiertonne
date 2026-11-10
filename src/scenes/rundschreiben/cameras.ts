import { Vector3 } from "three";
import { lazy } from "../../physics/lazy";
import { aspectOf, type Format } from "../../frameRate";
import { aboveTheBar } from "../../dialogue/subtitles";
import { easeUnit, lerpVec3 } from "../../characters/scalar";
import { kf } from "../../characters/animate";
import { doorFrame } from "../../building/doors";
import { HAUSTUER } from "../../street/facade";
import {
  A4,
  LETTER_LAYOUT,
  PT,
  letterLineWidth,
  pointOnLetter,
  type LetterLine,
} from "../../props/letterShape";
import { DOOR_SHUT } from "./home";
import { SHOWN_IN_THE_INSERT } from "./letter";
import type { Vec3 } from "../../toon/primitives";
import { aboveHisHips } from "../../Tibik/rig";
import { hisEyes } from "../../Tibik/character";
import { onFrames, amidst, camerasOf, dolly, fixed, following, type CameraSetup, type Shot } from "../../toon/shots";
import {
  FOLD,
  REACT,
  ON_HIS_FACE,
  THANKS,
  AT_MAILBOX,
  FLAP,
  READ,
  UNFOLD,
  RUNDSCHREIBEN_DURATION,
  ENTRY,
  TO_DOOR,
  letterAt,
  rundschreibenTibikAt,
} from "./choreography";

export type RundschreibenShot = Shot & { readonly pov?: boolean };

const MARGIN = 0.006;
export const READABLE = 32;
const INSERT = { distance: 0.45, page: { wide: 0.75, tall: 0.5 } };

type Rect = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };

const rectOf = (lines: readonly LetterLine[]): Rect => ({
  left: Math.min(...lines.map((l) => l.x)),
  right: Math.max(...lines.map((l) => l.x + letterLineWidth(l))),
  top: Math.min(...lines.map((l) => l.y)),
  bottom: Math.max(...lines.map((l) => l.y + l.pt * PT)),
});

const PAGE: Rect = { left: 0, right: A4[0], top: 0, bottom: A4[1] };

const fitted = (rect: Rect, format: Format) =>
  Math.max((rect.right - rect.left + 2 * MARGIN) / aspectOf(format), rect.bottom - rect.top + 2 * MARGIN);

const withRoomAround = (rect: Rect, format: Format) =>
  Math.max((rect.right - rect.left) / aspectOf(format), rect.bottom - rect.top) / INSERT.page[format];

const onTheSheet = (from: Rect, to: Rect, heights: readonly [number, number], usable: number) => (t: number, k: number) => {
  const mix = (a: number, b: number) => a + (b - a) * k;
  const height = mix(heights[0], heights[1]) / usable;
  const centre = pointOnLetter(letterAt(t)!, mix((from.left + from.right) / 2, (to.left + to.right) / 2), mix((from.top + from.bottom) / 2, (to.top + to.bottom) / 2) + (0.5 - usable / 2) * height);
  const sheet = letterAt(t)!.matrix;
  return {
    position: centre.clone().addScaledVector(new Vector3(0, 0, 1).transformDirection(sheet), INSERT.distance),
    target: centre,
    up: new Vector3(0, 1, 0).transformDirection(sheet),
    height,
  };
};

const WORLD_UP = new Vector3(0, 1, 0);

const letterInsert = (from: Rect, to: Rect, heights: readonly [number, number], zoom: readonly [number, number], usable = 1) => {
  const view = onTheSheet(from, to, heights, usable);
  const settled = lazy(() => view(zoom[1], 1));
  return (t: number): CameraSetup => {
    const k = easeUnit((t - zoom[0]) / (zoom[1] - zoom[0]));
    const now = view(t, k);
    const end = settled();
    return {
      position: now.position.clone().lerp(end.position, k).toArray(),
      target: now.target.clone().lerp(end.target, k).toArray(),
      fov: (2 * Math.atan(now.height / 2 / INSERT.distance) * 180) / Math.PI,
      up: now.up.clone().lerp(WORLD_UP, k).normalize().toArray(),
    };
  };
};


const OPENING = FLAP[0] - 0.4;
const ZOOM_OUT = { lead: 2, settle: 0.5 };
const WIDE_ZOOM: readonly [number, number] = [THANKS[0] - ZOOM_OUT.lead, ON_HIS_FACE - ZOOM_OUT.settle];
export const FOLDING_SHOT = REACT[1] + 0.4;
const CODA = FOLD[1];

const READ_LINES = LETTER_LAYOUT.lines.slice(...SHOWN_IN_THE_INSERT);
const READ_RECT = rectOf(READ_LINES);

const THE_DOOR = new Vector3(HAUSTUER.width / 2, HAUSTUER.height / 2, 0).applyMatrix4(doorFrame(HAUSTUER, 0));
const CODA_VIEW: CameraSetup = { position: [-3.5, 1.7, 1.4], target: [-0.5, 0.95, -1.7], fov: 50 };
const ON_THE_DOOR: Vec3 = [THE_DOOR.x, CODA_VIEW.target[1], THE_DOOR.z];
const ON_TO_THE_DOOR = 1.0;
const CODA_PULL = { back: 0.5, up: 0.25, lead: 0.3 };

const easedBack = (view: CameraSetup, pull: typeof CODA_PULL): CameraSetup => {
  const from = new Vector3(...view.position);
  const away = from.clone().sub(new Vector3(...view.target)).normalize();
  return { ...view, position: from.addScaledVector(away, pull.back).add(new Vector3(0, pull.up, 0)).toArray() };
};

const TALL_CLOSE_UP = { fov: 72, shift: [0, -0.045, 0] as Vec3 };
const FACING_HIM: Vec3 = [-2.62, aboveHisHips(1.12), -2.04];
const HIS_EYES = amidst(FACING_HIM, ...[0, 1].map((side) => (t: number) => hisEyes(rundschreibenTibikAt(t))[side]));

const TIBIK_SPOT = (t: number) => rundschreibenTibikAt(t).position;
const ontoTheDoor = (at: (t: number) => CameraSetup) => (t: number): CameraSetup => {
  const view = at(t);
  return { ...view, target: lerpVec3(view.target, ON_THE_DOOR, kf(t, TO_DOOR, [0, 1])) };
};
const HIM_THEN_THE_DOOR = (t: number) =>
  lerpVec3(TIBIK_SPOT(t), THE_DOOR.toArray(), kf(t, [ENTRY.inWalk[0], ENTRY.inWalk[0] + ON_TO_THE_DOOR], [0, 1]));


export const SHOTS: readonly RundschreibenShot[] = onFrames([
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
    at: fixed([-3.9, 1.5, -0.45], [-2.95, 1.02, -1.8], 40),
  },
  {
    name: "Opening",
    from: OPENING,
    to: READ[0],
    at: dolly(
      { position: [-2.42, aboveHisHips(0.44), -2.14], target: [-2.34, aboveHisHips(0.58), -1.73], fov: 50 },
      { position: [-2.42, aboveHisHips(0.72), -2.14], target: [-2.32, aboveHisHips(0.6), -1.72], fov: 50 },
      FLAP[1],
      UNFOLD[0],
    ),
  },
  {
    name: "Insert: the letter",
    from: READ[0],
    to: ON_HIS_FACE,
    pov: true,
    at: letterInsert(READ_RECT, PAGE, [fitted(READ_RECT, "wide"), withRoomAround(PAGE, "wide")], WIDE_ZOOM, aboveTheBar("wide")),
    tall: letterInsert(PAGE, PAGE, [fitted(PAGE, "tall"), withRoomAround(PAGE, "tall")], [READ[0], ON_HIS_FACE]),
  },
  {
    name: "Tibik",
    from: ON_HIS_FACE,
    to: FOLDING_SHOT,
    ...following(fixed(FACING_HIM, [-2.33, aboveHisHips(1.08), -1.68], 44), HIS_EYES, TALL_CLOSE_UP),
  },
  {
    name: "His hands: folding it back",
    from: FOLDING_SHOT,
    to: CODA,
    at: fixed([-2.42, aboveHisHips(0.72), -2.14], [-2.32, aboveHisHips(0.6), -1.72], 50),
  },
  {
    name: "Coda",
    from: CODA,
    to: RUNDSCHREIBEN_DURATION,
    ...following(ontoTheDoor(dolly(CODA_VIEW, easedBack({ ...CODA_VIEW, target: ON_THE_DOOR }, CODA_PULL), DOOR_SHUT - CODA_PULL.lead, RUNDSCHREIBEN_DURATION)), HIM_THEN_THE_DOOR),
  },
]);

export const { shotAt, cameraAt } = camerasOf(SHOTS);
