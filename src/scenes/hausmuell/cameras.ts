import { kf } from "../../characters/animate";
import type { Vec3 } from "../../toon/primitives";
import { onFrames, between, camerasOf, fixed, heldBetween, withTall, type CameraSetup, type Shot } from "../../toon/shots";
import {
  KAREN_SPOT,
  HAUSMUELL_DURATION,
  SHOT_KAREN_ACCUSES,
  SHOT_KAREN_THREATENS,
  SHOT_KAREN_YELLS,
  SHOT_TIBIK_ASKS,
  SHOT_TIBIK_EXPLAINS,
  SHOT_TIBIK_WHO,
  SHOT_KAREN_NAMES,
  SHOT_TIBIK_WEISUNG,
  SHOT_KAREN_WIE,
  SHOT_EXIT,
  TIBIK_SPOT,
  LINES,
  karenAt,
  tibikAt,
} from "./choreography";

const HEAD_HEIGHT = { tibik: 1.45, karen: 1.45 };

const across = (() => {
  const dx = KAREN_SPOT[0] - TIBIK_SPOT[0];
  const dz = KAREN_SPOT[2] - TIBIK_SPOT[2];
  const length = Math.hypot(dx, dz);
  return { x: dx / length, z: dz / length };
})();
const streetSide = { x: -across.z, z: across.x };

const overShoulder = (
  from: Vec3,
  to: Vec3,
  towards: { x: number; z: number },
  height: number,
  targetHeight: number,
): CameraSetup => ({
  position: [
    from[0] + streetSide.x * 0.65 - towards.x * 0.8,
    height,
    from[2] + streetSide.z * 0.65 - towards.z * 0.8,
  ],
  target: [to[0], targetHeight, to[2]],
  fov: 32,
});

const onKaren = overShoulder(
  TIBIK_SPOT,
  KAREN_SPOT,
  across,
  1.55,
  HEAD_HEIGHT.karen,
);
const onTibik = overShoulder(
  KAREN_SPOT,
  TIBIK_SPOT,
  { x: -across.x, z: -across.z },
  1.6,
  HEAD_HEIGHT.tibik,
);

const pushIn =
  (setup: CameraSetup, from: number, to: number) =>
  (t: number): CameraSetup => {
    const push = kf(t, [from, to], [0, 0.12]);
    return {
      ...setup,
      position: [
        setup.position[0] + (setup.target[0] - setup.position[0]) * push,
        setup.position[1],
        setup.position[2] + (setup.target[2] - setup.position[2]) * push,
      ],
    };
  };

const headOf =
  (placed: (t: number) => { readonly position: Vec3 }, height: number) =>
  (t: number): Vec3 => {
    const [x, , z] = placed(t).position;
    return [x, height, z];
  };

const HEADS = {
  tibik: headOf(tibikAt, HEAD_HEIGHT.tibik),
  karen: headOf(karenAt, HEAD_HEIGHT.karen),
};

const BOTH = between(HEADS.tibik, HEADS.karen);

const lineOf = (name: string) => LINES.find((l) => l.name === name)!;

const TALL = {
  faceAboveTheBar: [0, -0.15, 0] as Vec3,
  karenArrives: between(HEADS.tibik, heldBetween(HEADS.karen, LINES[0].from)),
  heWalksOff: between(heldBetween(HEADS.tibik, -Infinity, lineOf("Tibik: Schönen Tag noch").to), HEADS.karen),
};

const onKarenFor = (at: (t: number) => CameraSetup) => withTall(at, { shift: TALL.faceAboveTheBar });

const hausverwaltung = (t: number): CameraSetup => {
  const push = kf(t, [SHOT_KAREN_THREATENS, SHOT_TIBIK_WHO], [0, 1]);
  return {
    position: [1.9, 1.7 - push * 0.1, 4.8 - push * 0.6],
    target: [1.6, 1.5, -1.0],
    fov: 44,
  };
};

export const SHOTS: readonly Shot[] = onFrames([
  {
    name: "Wide: Karen comes running",
    from: 0,
    to: SHOT_KAREN_YELLS,
    ...withTall(fixed([2.4, 1.5, 4.4], [2.4, 1.0, -0.6], 40), { aimAt: TALL.karenArrives, shift: [-0.25, -0.45, 0], fov: 64 }),
  },
  {
    name: "Karen: Sie dürfen das nicht",
    from: SHOT_KAREN_YELLS,
    to: SHOT_TIBIK_ASKS,
    ...onKarenFor(pushIn(onKaren, SHOT_KAREN_YELLS, SHOT_TIBIK_ASKS)),
  },
  {
    name: "Tibik: Was darf ich nicht",
    from: SHOT_TIBIK_ASKS,
    to: SHOT_KAREN_ACCUSES,
    at: () => onTibik,
  },
  {
    name: "Karen: Hausmüll",
    from: SHOT_KAREN_ACCUSES,
    to: SHOT_TIBIK_EXPLAINS,
    ...onKarenFor(pushIn(onKaren, SHOT_KAREN_ACCUSES, SHOT_TIBIK_EXPLAINS)),
  },
  {
    name: "Tibik: Umweltschutz",
    from: SHOT_TIBIK_EXPLAINS,
    to: SHOT_KAREN_THREATENS,
    at: pushIn(onTibik, SHOT_TIBIK_EXPLAINS, SHOT_KAREN_THREATENS),
  },
  {
    name: "Wide: Hausverwaltung",
    from: SHOT_KAREN_THREATENS,
    to: SHOT_TIBIK_WHO,
    ...withTall(hausverwaltung, { aimAt: BOTH, shift: [0, 0.05, 0] }),
  },
  {
    name: "Tibik: Wer sind Sie",
    from: SHOT_TIBIK_WHO,
    to: SHOT_KAREN_NAMES,
    at: () => onTibik,
  },
  {
    name: "Karen: Schulz",
    from: SHOT_KAREN_NAMES,
    to: SHOT_TIBIK_WEISUNG,
    ...onKarenFor(pushIn(onKaren, SHOT_KAREN_NAMES, SHOT_TIBIK_WEISUNG)),
  },
  {
    name: "Tibik: Weisungsbefugnis",
    from: SHOT_TIBIK_WEISUNG,
    to: SHOT_KAREN_WIE,
    at: pushIn(onTibik, SHOT_TIBIK_WEISUNG, SHOT_KAREN_WIE),
  },
  {
    name: "Karen: Wie bitte",
    from: SHOT_KAREN_WIE,
    to: SHOT_EXIT,
    ...onKarenFor(() => onKaren),
  },
  {
    name: "Wide: Schönen Tag noch",
    from: SHOT_EXIT,
    to: HAUSMUELL_DURATION,
    ...withTall(fixed([0.9, 1.6, 5.2], [0.6, 1.1, -1.0], 46), { aimAt: TALL.heWalksOff, shift: [0, -0.35, 0], fov: 52 }),
  },
]);

export const { cameraAt } = camerasOf(SHOTS);
