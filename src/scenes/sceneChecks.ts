import { Vector3 } from "three";
import { allColliders, handPosition, handSphere, torsoMatrix, type ArmName, type LegPose } from "../characters/skeleton";
import type { Hold } from "../physics/holds";
import type { Character } from "../physics/guards";
import { faceInWorld, faceTurnedTo, headInWorld, inFront, onScreen, seenBy, type Face } from "../dialogue/screen";
import type { Line, Speaker } from "../dialogue/line";
import { KAREN_SKELETON } from "../Karen/rig";
import { barRect, type Chunk } from "../dialogue/subtitles";
import { FORMATS, TIMELINE_FPS, type Format } from "../frameRate";
import { GRAVITY } from "../physics/fall";
import { boxInTheWay, raySphere, sightLine } from "../physics/rays";
import { asCharacter, type TibikFrame } from "../Tibik/character";
import { rootSpeed, type RootAt } from "../characters/gait";
import { asKaren, type KarenFrame } from "../Karen/character";
import { headSurface } from "../Tibik/headShape";
import { RIG } from "../Tibik/rig";
import type { CameraSetup } from "../toon/shots";
import {
  collide,
  sphere,
  sphereObbGap,
  type Contact,
  type Solid,
  type Sphere,
} from "../physics/collision";

export const TOLERANCE = 0.005;

export const mm = (metres: number, digits = 1) =>
  `${(metres * 1000).toFixed(digits)} mm`;

export const penetrations = <T>(
  times: readonly T[],
  violationsAt: (t: T) => readonly Contact[],
  label: (t: T) => string,
): string[] =>
  times.flatMap((t) =>
    violationsAt(t)
      .filter((c) => c.depth > TOLERANCE)
      .map((c) => `${label(t)}: ${c.a} is ${mm(c.depth, 0)} inside ${c.b}`),
  );

export const seconds = (t: number) => `${t.toFixed(2)} s`;
export const frameLabel = (frame: number) => `frame ${frame}`;
export const framesOf = (duration: number, fps: number, step = 1) =>
  Array.from(
    { length: Math.ceil((duration * fps) / step) },
    (_, i) => i * step,
  );

export const framesIn = (from: number, to: number, fps = TIMELINE_FPS) => {
  const frames: number[] = [];
  for (let f = Math.ceil(from * fps - 1e-6); f < to * fps - 1e-6; f++) frames.push(f / fps);
  return frames;
};

export const framesThrough = (from: number, to: number, fps = TIMELINE_FPS) => {
  const frames: number[] = [];
  for (let f = Math.ceil(from * fps - 1e-6); f <= Math.floor(to * fps + 1e-6); f++) frames.push(f / fps);
  return frames;
};

export const framesFrom = (from: number, seconds: number, fps = TIMELINE_FPS) =>
  Array.from({ length: Math.round(seconds * fps) + 1 }, (_, f) => from + f / fps);

const SIGHT_SLACK = 0.01;

export const hidersOf = (eye: Vector3, target: Vector3, blockers: readonly Sphere[]) => {
  const reach = eye.distanceTo(target) - SIGHT_SLACK;
  const along = target.clone().sub(eye).normalize();
  return blockers.filter((s) => raySphere(eye, along, s) < reach);
};

export const hiddenBy = (eye: Vector3, target: Vector3, blockers: readonly Sphere[]) => hidersOf(eye, target, blockers).length > 0;

export const KEEP_OFF_THE_CAST = 0.3;

type Placed = { readonly position: readonly number[] };

export const shovedOff = (times: readonly number[], authored: (t: number) => Placed, solved: (t: number) => Placed, label = "") =>
  times.flatMap((t) => {
    const [a, s] = [authored(t).position, solved(t).position];
    const off = Math.hypot(a[0] - s[0], a[2] - s[2]);
    return off > 0.001 ? [`${label}${t.toFixed(2)} s: shoved ${mm(off)}`] : [];
  });

export const lensProblems = (
  t: number,
  lens: Vector3,
  radius: number,
  solids: readonly Solid[],
  bodies: readonly Sphere[] = [],
  keepOff = radius,
): string[] => {
  const probe = sphere("camera", lens, radius);
  return [
    ...solids
      .filter((s) => collide(probe, s))
      .map((s) => `${seconds(t)}: camera against ${s.name}`),
    ...bodies
      .map((s) => ({ s, clear: lens.distanceTo(s.center) - s.radius }))
      .filter(({ clear }) => clear < keepOff)
      .map(({ s, clear }) => `${seconds(t)}: camera ${mm(clear, 0)} from ${s.name}`),
  ];
};

const HEAD_IN_FRAME = { margin: 0.005 };

const headPointSeen = (point: Vector3, setup: CameraSetup, format: Format) => seenBy(point, setup, HEAD_IN_FRAME.margin, format);

export const tibikHeadPoints = (tibik: TibikFrame) => {
  const top = headSurface(tibik).reduce((a, b) => (b.y > a.y ? b : a));
  const eyes = allColliders(RIG, asCharacter(tibik))
    .filter((part) => part.name.endsWith(" eye"))
    .map((eye) => ({ name: eye.name, point: eye.center.clone().add(new Vector3(0, eye.radius, 0)) }));
  return [{ name: "top of his head", point: top }, ...eyes];
};

export const tibikHeadOutOfFrame = (tibik: TibikFrame, setup: CameraSetup, format: Format = "wide"): string[] =>
  tibikHeadPoints(tibik)
    .filter(({ point }) => !headPointSeen(point, setup, format))
    .map(({ name }) => name);

export type Staged = readonly [shot: string, from: number, to: number, who?: string];

const stagedFor = (staged: readonly Staged[], shot: string, t: number, who: string) =>
  staged.some(([name, from, to, person]) => name === shot && t >= from && t <= to && (person === undefined || person === who));

export const headCroppedPartway = (times: readonly number[], shotAt: (t: number) => { readonly name: string }, cameraAt: (t: number) => CameraSetup, tibikAt: (t: number) => TibikFrame | null, staged: readonly Staged[] = [], format: Format = "wide") => {
  const tally = new Map<string, number[][]>();
  for (const t of times) {
    const tibik = tibikAt(t);
    if (!tibik) continue;
    const shot = shotAt(t);
    if (stagedFor(staged, shot.name, t, "tibik")) continue;
    const [seen, out] = tally.get(shot.name) ?? [[], []];
    (tibikHeadOutOfFrame(tibik, cameraAt(t), format).length ? out : seen).push(t);
    tally.set(shot.name, [seen, out]);
  }
  return [...tally]
    .filter(([, [seen, out]]) => seen.length > 0 && out.length > 0)
    .map(([name, [seen, out]]) => `${name}: his head leaves the frame on ${out.length} of ${seen.length + out.length} frames, ${out[0].toFixed(2)}-${out[out.length - 1].toFixed(2)} s`);
};

export const ARM_JERK = { turn: 0.65, hand: 0.3 };

export const LEG_SNAP = 0.3;

export const GENTLE_ARM = { turn: 0.3, hand: 0.15 };

const handInTorso = (c: Character, which: ArmName) =>
  handPosition(c.skeleton, c, which).applyMatrix4(torsoMatrix(c.skeleton, c).clone().invert());

export const tibikIn = (solve: (t: number) => { readonly tibik: TibikFrame }) => (t: number) => ({ Tibik: asCharacter(solve(t).tibik) });

export const karenIn = (solve: (t: number) => { readonly karen: KarenFrame }) => (t: number) => ({ Karen: asKaren(solve(t).karen) });

export const armJumpsOver = (
  times: readonly number[],
  charactersAt: (t: number) => Readonly<Record<string, Character>>,
  cuts: readonly number[] = [],
  jerk: typeof ARM_JERK = ARM_JERK,
) => armJumps(times.map((t) => ({ t, characters: charactersAt(t) })), cuts, jerk);

export const secondDifference = (before: Vector3, now: Vector3, after: Vector3) => after.clone().sub(now.clone().multiplyScalar(2)).add(before).length();

const cutBetween = (cuts: readonly number[], from: number, to: number) => cuts.some((cut) => cut > from && cut <= to);

type Frames = readonly { readonly t: number; readonly characters: Readonly<Record<string, Character>> }[];

const acrossLimbs = <L extends string>(
  frames: Frames,
  cuts: readonly number[],
  limbs: readonly L[],
  judge: (which: L, was: Character, now: Character, next: Character) => string | null,
) =>
  frames.slice(1, -1).flatMap(({ t, characters }, i) => {
    const [before, after] = [frames[i], frames[i + 2]];
    if (cutBetween(cuts, before.t, after.t)) return [];
    return Object.entries(characters).flatMap(([who, now]) => {
      const [was, next] = [before.characters[who], after.characters[who]] as (Character | undefined)[];
      if (!was || !next) return [];
      return limbs.flatMap((which) => {
        const verdict = judge(which, was, now, next);
        return verdict ? [`${seconds(t)} ${who} ${which}: ${verdict}`] : [];
      });
    });
  });

export const armJumps = (frames: Frames, cuts: readonly number[] = [], jerk: typeof ARM_JERK = ARM_JERK) =>
  acrossLimbs(frames, cuts, ["leftArm", "rightArm"] as const, (which, was, now, next) => {
    const [a, b, c] = [was.pose[which], now.pose[which], next.pose[which]];
    const turn = Math.max(...(["raise", "out", "elbow", "inward"] as const).map((k) => Math.abs(c[k] - 2 * b[k] + a[k])));
    const hand = secondDifference(handInTorso(was, which), handInTorso(now, which), handInTorso(next, which));
    return turn > jerk.turn || hand > jerk.hand ? `turns ${turn.toFixed(2)} rad off its course, hand ${mm(hand, 0)}` : null;
  });

const legAngles = ({ hip, knee, ankle }: LegPose) => [...hip, knee, ...ankle];

export const legSnaps = (frames: Frames, cuts: readonly number[] = [], bar = LEG_SNAP) =>
  acrossLimbs(frames, cuts, ["leftLeg", "rightLeg"] as const, (which, was, now, next) => {
    const [a, b, c] = [was, now, next].map((character) => legAngles(character.pose[which]));
    const snap = Math.max(...b.map((v, k) => (Math.sign(v - a[k]) !== Math.sign(c[k] - v) ? Math.min(Math.abs(v - a[k]), Math.abs(c[k] - v)) : 0)));
    return snap > bar ? `bends ${snap.toFixed(2)} rad and back within a frame` : null;
  });

export const WALK_LIMIT = { froude: 0.6, window: 0.2 };

export const tooFastToWalk = (frames: Frames, cuts: readonly number[], excused: Readonly<Partial<Record<string, readonly [number, number]>>> = {}) => {
  const span = Math.round(WALK_LIMIT.window * TIMELINE_FPS);
  const over = new Map<string, { readonly t: number; readonly froude: number }[]>();
  frames.slice(span).forEach((now, i) => {
    const was = frames[i];
    if (cutBetween(cuts, was.t, now.t)) return;
    for (const [who, c] of Object.entries(now.characters)) {
      const before = was.characters[who] as Character | undefined;
      const pass = excused[who];
      if (!before || (pass && now.t >= pass[0] && was.t <= pass[1])) continue;
      const speed = Math.hypot(c.position[0] - before.position[0], c.position[2] - before.position[2]) / (now.t - was.t);
      const froude = speed ** 2 / (GRAVITY * (c.skeleton.thigh.length + c.skeleton.shin.length));
      if (froude > WALK_LIMIT.froude) over.set(who, [...(over.get(who) ?? []), { t: now.t, froude }]);
    }
  });
  return [...over].map(([who, list]) => {
    const worst = list.reduce((a, b) => (b.froude > a.froude ? b : a));
    return `${who} walks at Froude ${worst.froude.toFixed(2)} at ${seconds(worst.t)}, over ${WALK_LIMIT.froude} on ${list.length} frames`;
  });
};

export const ON_IT = 0.015;

export const handsOffHolds = (holds: readonly Hold[], characterAt: (t: number) => Character | undefined, tolerance = ON_IT) => {
  const checked = holds.flatMap((hold) => framesThrough(Math.max(0, hold.grip), hold.release).map((t) => ({ hold, t })));
  const off = checked.flatMap(({ hold, t }) => {
    const c = characterAt(t);
    if (!c) return [`${seconds(t)}: nobody there to hold ${hold.name}`];
    const gap = Math.abs(sphereObbGap(handSphere(c.skeleton, c, hold.arm), hold.target(t)));
    return gap > tolerance ? [`${seconds(t)}: ${hold.name} ${(gap * 100).toFixed(1)} cm off`] : [];
  });
  return { frames: checked.length, off };
};

export const dialogueFrames = (lines: readonly Line[]) => lines.flatMap((l) => framesIn(l.from, l.to));

export const castFaces = ({ tibik, karen }: { readonly tibik: TibikFrame; readonly karen: KarenFrame }) => [
  faceInWorld(RIG, tibik),
  faceInWorld(KAREN_SKELETON, karen),
];

export const BAR_CLEARANCE = 12;

type ScreenPoint = [number, number];

export const facesUnderBar = (
  times: readonly number[],
  chunkAt: (t: number) => Chunk | null,
  cameraAt: (t: number) => CameraSetup,
  facesAt: (t: number) => readonly Face[],
  format: Format,
  lens: (point: ScreenPoint, t: number) => ScreenPoint = (point) => point,
) =>
  times.flatMap((t) => {
    const chunk = chunkAt(t);
    if (chunk === null) return [];
    const setup = cameraAt(t);
    const { left, top, width, height } = barRect(chunk, format);
    const under = ([x, y]: ScreenPoint) =>
      x >= left - BAR_CLEARANCE && x <= left + width + BAR_CLEARANCE && y >= top - BAR_CLEARANCE && y <= top + height + BAR_CLEARANCE;
    return facesAt(t)
      .flatMap((face) => face.points.filter((point) => inFront(point, setup) && faceTurnedTo(face, point, setup)))
      .map((point) => lens(onScreen(point, setup, format), t))
      .filter(under)
      .map(([x, y]) => `${seconds(t)}: "${chunk.text}" covers a face at ${x.toFixed(0)}, ${y.toFixed(0)}`);
  });

export const tibikHead = (tibik: TibikFrame) => ({ tibik: tibikHeadPoints(tibik).map(({ point }) => point) });

export const castHeads = ({ tibik, karen }: { readonly tibik: TibikFrame; readonly karen: KarenFrame }) => ({
  ...tibikHead(tibik),
  karen: headInWorld(KAREN_SKELETON, karen),
});

type Heads = Readonly<Partial<Record<string, readonly Vector3[]>>>;
type FormatCamera = (t: number, format: Format) => CameraSetup;

export type TallFraming = {
  readonly shotAt: (t: number) => { readonly name: string; readonly from?: number; readonly to?: number };
  readonly cameraAt: FormatCamera;
  readonly headsAt: (t: number) => Heads;
  readonly solidsAt?: (t: number) => readonly Solid[];
  readonly staged?: readonly Staged[];
};

const hiddenBehind = (point: Vector3, eye: Vector3, solids: readonly Solid[]) => {
  const sight = sightLine(eye, point);
  return solids.some((solid) => solid.kind === "obb" && boxInTheWay(sight, solid, 1e-6));
};

const lostInTall = (head: readonly Vector3[], wide: CameraSetup, tall: CameraSetup, solids: readonly Solid[]) => {
  const eye = new Vector3(...wide.position);
  if (!head.some((p) => !hiddenBehind(p, eye, solids))) return [];
  return head.filter((p) => headPointSeen(p, wide, "wide") && !headPointSeen(p, tall, "tall"));
};

const headsOutOfTall = (times: readonly number[], framing: TallFraming, mustShow: (t: number) => readonly string[]) => {
  const { shotAt, cameraAt, headsAt, solidsAt = () => [], staged = [] } = framing;
  const tally = new Map<string, number[]>();
  for (const t of times) {
    const shot = shotAt(t).name;
    const heads = headsAt(t);
    const [wide, tall] = [cameraAt(t, "wide"), cameraAt(t, "tall")];
    const solids = solidsAt(t);
    for (const who of mustShow(t)) {
      if (stagedFor(staged, shot, t, who)) continue;
      const head = heads[who];
      if (head && lostInTall(head, wide, tall, solids).length > 0)
        tally.set(`${shot} / ${who}`, [...(tally.get(`${shot} / ${who}`) ?? []), t]);
    }
  }
  return [...tally].map(([key, out]) => `${key}: head out of the tall frame on ${out.length} frames, ${seconds(out[0])}-${seconds(out[out.length - 1])}`);
};

const speakingAt = (lines: readonly Line[], t: number) => lines.filter((l) => t >= l.from && t < l.to);

export const PLATFORM_TOP_BAND = 300 / 1920;

export type SpeakerFaces = Readonly<Partial<Record<Speaker, Face>>>;

export const speakerEyesInTheTopBand = (lines: readonly Line[], cameraAt: (t: number) => CameraSetup, facesAt: (t: number) => SpeakerFaces) => {
  const { height } = FORMATS.tall;
  return lines
    .filter((line) => !line.far)
    .flatMap((line) =>
      framesIn(line.from, line.to).flatMap((t) => {
        const face = facesAt(t)[line.speaker];
        if (!face) return [];
        const setup = cameraAt(t);
        const shown = face.points.slice(1).filter((eye) => seenBy(eye, setup, 0, "tall"));
        return shown.some((eye) => onScreen(eye, setup, "tall")[1] < PLATFORM_TOP_BAND * height) ? [`${seconds(t)}: ${line.name}: eyes in the top band`] : [];
      }),
    );
};

export const speakerOutOfTallFrame = (times: readonly number[], lines: readonly Line[], framing: TallFraming) =>
  headsOutOfTall(times, framing, (t) => speakingAt(lines, t).map((l) => l.speaker).filter((s) => s !== "phone"));

export const castOutOfTallFrame = (times: readonly number[], lines: readonly Line[], framing: TallFraming) =>
  headsOutOfTall(times, framing, (t) => {
    const shot = framing.shotAt(t);
    const [from, to] = [shot.from ?? -Infinity, shot.to ?? Infinity];
    return lines.some((l) => l.from < to && l.to > from) ? [] : Object.keys(framing.headsAt(t));
  });

export const rootMotion = (root: RootAt) => {
  const speed = rootSpeed(root);
  return (t: number) => ({ speed: speed(t), turn: Math.abs(root(t + 0.005).yaw - root(t - 0.005).yaw) / 0.01 });
};
