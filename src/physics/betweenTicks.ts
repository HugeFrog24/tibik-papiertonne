import { Matrix4, Quaternion, Vector3 } from "three";
import { wrapAngle } from "../characters/scalar";
import { TIMELINE_FPS } from "../frameRate";

const ON_THE_TICK = 1e-6;

const TURNS = new Set(["rotationY"]);

const isPlain = (v: unknown): v is Readonly<Record<string, unknown>> => typeof v === "object" && v !== null && Object.getPrototypeOf(v) === Object.prototype;

const blendPlacements = (a: Matrix4, b: Matrix4, u: number) => {
  const [from, to] = [a, b].map((m) => {
    const placement = { position: new Vector3(), turn: new Quaternion(), scale: new Vector3() };
    m.decompose(placement.position, placement.turn, placement.scale);
    return placement;
  });
  return new Matrix4().compose(from.position.lerp(to.position, u), from.turn.slerp(to.turn, u), from.scale.lerp(to.scale, u));
};

export const blend = <T>(a: T, b: T, u: number): T => {
  if (a === b || u <= 0) return a;
  if (typeof a === "number" && typeof b === "number") return (a + (b - a) * u) as T;
  if (a instanceof Matrix4 && b instanceof Matrix4) return blendPlacements(a, b, u) as T;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((x: unknown, i) => blend(x, b[i] as unknown, u)) as T;
  if (isPlain(a) && isPlain(b))
    return Object.fromEntries(
      Object.entries(a).map(([key, x]) => {
        const y = b[key];
        if (!(key in b)) return [key, x];
        return [key, TURNS.has(key) && typeof x === "number" && typeof y === "number" ? x + wrapAngle(y - x) * u : blend(x, y, u)];
      }),
    ) as T;
  return a;
};

export const betweenTicks =
  <S>(solve: (t: number) => S, jumps: readonly number[] = []) =>
  (t: number): S => {
    const ticks = t * TIMELINE_FPS;
    const before = Math.floor(ticks + ON_THE_TICK);
    const u = ticks - before;
    const jumpsNext = jumps.some((jump) => jump * TIMELINE_FPS > before + ON_THE_TICK && jump * TIMELINE_FPS <= before + 1 + ON_THE_TICK);
    if (u < ON_THE_TICK || jumpsNext) return solve(before / TIMELINE_FPS);
    return blend(solve(before / TIMELINE_FPS), solve((before + 1) / TIMELINE_FPS), u);
  };
