import { Vector3 } from "three";
import { expect, test } from "vitest";
import { bedroomSolids, BEDROOM_DOOR } from "../../building/bedroomShape";
import { onScreen, inFront, FRAME_SIZE } from "../../dialogue/screen";
import { FPS } from "../../frameRate";
import { partObb, sphere, type Solid } from "../../physics/collision";
import { ACROSS_STREET, BALCONIES, BLOCK_SPAN, FACADE_Z, acrossZ, balconyDecor, balconyParts, flatWindow, railingHeightFor } from "../../street/building";
import { facadePieces } from "../../street/facade";
import { dishParts, DISH } from "../../street/dishShape";
import { BINS, worldSolids } from "../../street/layout";
import { PARAPET, roofParts } from "../../street/townShape";
import { STREET_TREES, TREE_CROWN, TREE_POSITION } from "../../street/trees";
import { lensProblems } from "../sceneChecks";
import { KEY_MOMENTS, NACHTRUHE_DURATION, NACHTRUHE_SHOTS, cameraAt, shotAt } from "./cameras";

const shot = (name: string) => NACHTRUHE_SHOTS.find((s) => s.name === name)!;

const balconySolids: Solid[] = BALCONIES.flatMap(({ x, y }) =>
  balconyParts(y).map((p) => partObb({ name: `balcony ${p.name}`, center: [x + p.center[0], y + p.center[1], FACADE_Z + p.center[2]], size: p.size })),
);
const dishSolids: Solid[] = BALCONIES.flatMap(({ x, y }, i) => {
  if (!balconyDecor(12, i).dish) return [];
  const dish = dishParts(railingHeightFor(y));
  return [sphere("dish", new Vector3(x, y, FACADE_Z).add(dish.centre), DISH.diameter / 2)];
});
const roofSolids: Solid[] = [-3, -2, -1, 0, 1, 2, 3].flatMap((n) =>
  roofParts().map((p) => partObb({ ...p, center: [p.center[0] + n * BLOCK_SPAN, p.center[1], p.center[2]] })),
);
const across = (s: { name: string; center: readonly number[]; size: readonly number[] }) =>
  partObb({ name: `No. 13 ${s.name}`, center: [ACROSS_STREET.shift - s.center[0], s.center[1], acrossZ(s.center[2])], size: [s.size[0], s.size[1], s.size[2]] });
const acrossSolids: Solid[] = [
  ...[-3, -2, -1, 0, 1, 2, 3].flatMap((n) => roofParts().map((p) => across({ ...p, center: [p.center[0] + n * BLOCK_SPAN, p.center[1], p.center[2]] }))),
  ...facadePieces().map(across),
];
const door = Array.from({ length: 31 }, (_, k) => (BEDROOM_DOOR.open * k) / 30);
const outdoor = [...worldSolids(BINS.map(() => 0)), ...balconySolids, ...dishSolids, ...roofSolids, ...acrossSolids];
const indoor = door.flatMap((angle) => bedroomSolids({ door: angle, curtain: [0, 0] }));

const frames = Array.from({ length: Math.round(NACHTRUHE_DURATION * FPS) }, (_, f) => f / FPS);

test("the shots run back to back, with the plan's names and lengths", () => {
  expect(NACHTRUHE_SHOTS.map((s) => [s.name, s.from, s.to])).toEqual([
    ["Dusk wide", 0, 6],
    ["Bedroom: evening", 6, 12],
    ["Drone rise", 12, 20],
    ["Dawn", 20, 23],
    ["Bedroom: morning", 23, 29],
  ]);
  expect(NACHTRUHE_DURATION).toBe(29);
});

test("the lens is never inside or against a solid, the bedroom door at every angle included", { timeout: 120_000 }, () => {
  const problems = frames.flatMap((t) => {
    const indoors = shotAt(t).name.startsWith("Bedroom");
    return lensProblems(t, new Vector3(...cameraAt(t).position), 0.2, indoors ? indoor : outdoor);
  });
  expect(problems.slice(0, 8)).toEqual([]);
});

test("the drone opens on both first-floor windows and rises clear of the roof", () => {
  const start = cameraAt(shot("Drone rise").from);
  for (const side of ["links", "rechts"] as const) {
    const w = flatWindow(12, 1, side);
    const point = new Vector3(w.x, w.y, FACADE_Z);
    const [x, y] = onScreen(point, start);
    expect(inFront(point, start), side).toBe(true);
    expect(x > 0 && x < FRAME_SIZE.width && y > 0 && y < FRAME_SIZE.height, side).toBe(true);
  }
  const roofTop = Math.max(...roofSolids.map((s) => (s.kind === "obb" ? s.center.y + s.half[1] : 0)));
  expect(roofTop).toBeGreaterThan(PARAPET.height);
  expect(cameraAt(shot("Drone rise").to - 1e-6).position[1]).toBeGreaterThanOrEqual(roofTop + 3);
  expect(cameraAt(shot("Dawn").from)).toEqual(cameraAt(shot("Drone rise").to - 1e-9));
  expect(cameraAt(shot("Dawn").to - 1e-6)).toEqual(cameraAt(shot("Dawn").from));
});

test("the key action stays near the centre, for a later vertical crop", () => {
  expect(KEY_MOMENTS.length).toBeGreaterThanOrEqual(5);
  for (const moment of KEY_MOMENTS)
    for (let t = moment.from; t <= moment.to + 1e-9; t += 1 / FPS) {
      const setup = cameraAt(t);
      const point = new Vector3(...moment.at);
      const [x] = onScreen(point, setup);
      const ndc = (2 * x) / FRAME_SIZE.width - 1;
      expect(inFront(point, setup), `${moment.name} at ${t.toFixed(2)}`).toBe(true);
      expect(Math.abs(ndc), `${moment.name} at ${t.toFixed(2)}`).toBeLessThanOrEqual(0.316);
    }
});

test("evening and morning are filmed from the same place", () => {
  expect(shot("Bedroom: morning").at(26)).toEqual(shot("Bedroom: evening").at(8));
});

const crowns = STREET_TREES.flatMap(({ side, x }) =>
  TREE_CROWN.map(({ at, scale }) => {
    const base = side === "near" ? new Vector3(x, 0, TREE_POSITION[2]) : new Vector3(ACROSS_STREET.shift - x, 0, acrossZ(TREE_POSITION[2]));
    const turn = side === "near" ? 1 : -1;
    return { centre: base.add(new Vector3(turn * at[0], at[1], turn * at[2])), radius: Math.max(...scale) };
  }),
);

test("no key moment hides behind a street tree's crown", () => {
  const hidden: string[] = [];
  for (const moment of KEY_MOMENTS)
    for (let t = moment.from; t <= moment.to + 1e-9; t += 0.25) {
      const lens = new Vector3(...cameraAt(t).position);
      const point = new Vector3(...moment.at);
      const ray = point.clone().sub(lens);
      const length = ray.length();
      ray.normalize();
      for (const crown of crowns) {
        const along = crown.centre.clone().sub(lens).dot(ray);
        if (along > 0 && along < length && crown.centre.distanceTo(lens.clone().addScaledVector(ray, along)) < crown.radius)
          hidden.push(`${moment.name} at ${t.toFixed(2)}`);
      }
    }
  expect([...new Set(hidden)]).toEqual([]);
});
