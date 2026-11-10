import { Vector3 } from "three";
import { aspectOf } from "../frameRate";
import { expect, test } from "vitest";
import { BUILDING_HEIGHT, FACADE_Z, acrossZ } from "../street/building";
import type { CameraSetup } from "../toon/shots";
import { RAIN_DIR, RAIN_REACH, RAIN_TOP, rainFallsAt } from "../weather/rainDrops";
import { NACHTRUHE_SHOTS, cameraAt as nachtruheCameraAt } from "./nachtruhe/cameras";
import { DAWN } from "./nachtruhe/timeline";
import { SHOTS as RUNDSCHREIBEN_SHOTS, cameraAt as rundschreibenCameraAt } from "./rundschreiben/cameras";

type Setup = CameraSetup;

const RAINY: readonly { readonly scene: string; readonly cameraAt: (t: number) => Setup; readonly from: number; readonly to: number }[] = [
  ...NACHTRUHE_SHOTS.filter((s) => s.from >= DAWN[0] && !s.name.startsWith("Bedroom")).map((s) => ({ scene: `Nachtruhe ${s.name}`, cameraAt: nachtruheCameraAt, from: s.from, to: s.to })),
  ...RUNDSCHREIBEN_SHOTS.map((s) => ({ scene: `Rundschreiben ${s.name}`, cameraAt: rundschreibenCameraAt, from: s.from, to: s.to })),
];

const ASPECT = aspectOf("wide");
const HALF_FADED = (RAIN_REACH.full + RAIN_REACH.none) / 2;

const timesOf = (from: number, to: number) => {
  const count = Math.max(2, Math.ceil((to - from) / 0.5));
  return Array.from({ length: count }, (_, i) => from + ((to - from - 1e-6) * i) / (count - 1));
};

const insideAHouse = (p: Vector3) => (p.z < FACADE_Z || p.z > acrossZ(FACADE_Z)) && p.y < BUILDING_HEIGHT;

const underOpenSky = (p: Vector3) => {
  for (let up = p.clone(); up.y < RAIN_TOP; up.addScaledVector(RAIN_DIR, -0.25)) if (insideAHouse(up)) return false;
  return true;
};

const raysOf = ({ position, target, fov, up = [0, 1, 0] }: Setup) => {
  const eye = new Vector3(...position);
  const forward = new Vector3(...target).sub(eye).normalize();
  const right = forward.clone().cross(new Vector3(...up)).normalize();
  const upward = right.clone().cross(forward);
  const v = Math.tan((fov * Math.PI) / 360);
  const h = v * ASPECT;
  return Array.from({ length: 13 * 7 }, (_, k) => {
    const a = ((k % 13) / 12) * 2 - 1;
    const b = (Math.floor(k / 13) / 6) * 2 - 1;
    return { eye, dir: forward.clone().addScaledVector(right, a * h).addScaledVector(upward, b * v).normalize() };
  });
};

test("the rain falls from above every camera that sees it", () => {
  for (const shot of RAINY)
    for (const t of timesOf(shot.from, shot.to)) expect(shot.cameraAt(t).position[1], `${shot.scene} at ${t.toFixed(2)} s`).toBeLessThan(RAIN_TOP - 3);
});

test("wherever a rainy shot looks through open air under open sky, as far as the rain shows, rain falls", () => {
  const dry: string[] = [];
  for (const shot of RAINY)
    for (const t of timesOf(shot.from, shot.to))
      for (const { eye, dir } of raysOf(shot.cameraAt(t))) {
        for (let s = 0.5; s <= HALF_FADED; s += 0.5) {
          const p = eye.clone().addScaledVector(dir, s);
          if (p.y < 0 || insideAHouse(p)) break;
          if (underOpenSky(p) && !rainFallsAt(p)) {
            dry.push(`${shot.scene} at ${t.toFixed(2)} s: ${p.toArray().map((x) => x.toFixed(1)).join(",")}`);
            break;
          }
        }
      }
  expect(dry.slice(0, 8)).toEqual([]);
});
