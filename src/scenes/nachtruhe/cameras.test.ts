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
import { CAPTION, KEY_MOMENTS, NACHTRUHE_DURATION, NACHTRUHE_SHOTS, cameraAt, lightingAt, shotAt } from "./cameras";
import { SWITCH_PRESS, bedroomAt, curtainGrip } from "./bedroom";
import { solveNachtruhe } from "./solve";
import { CURTAIN_PULL, EYES_OPEN, LAMP_OFF, LAMP_ON, LIE_DOWN, SIT_UP } from "./timeline";
import { allColliders } from "../../characters/skeleton";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { rayObb } from "../../physics/rays";

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

test("the shots run back to back with the plan's names; the drone and the dawn keep the plan's lengths, the others are as long as their beats need", () => {
  expect(NACHTRUHE_SHOTS.map((s) => s.name)).toEqual(["Dusk wide", "Bedroom: evening", "Drone rise", "Dawn", "Bedroom: morning"]);
  expect(NACHTRUHE_SHOTS[0].from).toBe(0);
  NACHTRUHE_SHOTS.slice(1).forEach((s, i) => expect(s.from).toBe(NACHTRUHE_SHOTS[i].to));
  expect(NACHTRUHE_SHOTS[NACHTRUHE_SHOTS.length - 1].to).toBe(NACHTRUHE_DURATION);
  const length = (name: string) => shot(name).to - shot(name).from;
  expect(length("Drone rise")).toBeCloseTo(8, 9);
  expect(length("Dawn")).toBeCloseTo(3, 9);
  for (const name of ["Dusk wide", "Bedroom: evening", "Bedroom: morning"]) {
    expect(length(name), name).toBeGreaterThanOrEqual(6);
    expect(length(name), name).toBeLessThan(13);
  }
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

test("evening and morning are filmed from the same place, the morning panning after him to the window", () => {
  const evening = shot("Bedroom: evening");
  const morning = shot("Bedroom: morning");
  expect(morning.at(morning.from).position).toEqual(evening.at(evening.from).position);
  expect(morning.at(morning.to).position).toEqual(evening.at(evening.from).position);
  expect(morning.at(morning.from).target).toEqual(evening.at(evening.from).target);
  expect(morning.at(morning.to).target).not.toEqual(evening.at(evening.from).target);
});

const headAt = (t: number) => allColliders(RIG, asCharacter(bedroomAt(t))).find((c) => c.name.includes("head"))!.center.toArray();

test("the bedroom's key moments are where the action is: his head as he lies down and wakes, the cord switch at each press, his head as he sits up, his hand on the curtain", () => {
  const at = (name: string) => KEY_MOMENTS.find((m) => m.name === name)!;
  expect(at("he lies down").at).toEqual(headAt(LIE_DOWN[1] + 0.7));
  expect(at("he opens his eyes").at).toEqual(headAt(EYES_OPEN[1]));
  expect(at("he switches his lamp off").at).toEqual(SWITCH_PRESS.toArray());
  expect(at("he switches his lamp on").at).toEqual(SWITCH_PRESS.toArray());
  expect(at("he switches his lamp off").from).toBeLessThanOrEqual(LAMP_OFF - 0.4);
  expect(at("he switches his lamp on").to).toBeGreaterThanOrEqual(LAMP_ON);
  expect(at("he gets up").at).toEqual(headAt(SIT_UP[1]));
  expect(at("he opens the curtain").at).toEqual(curtainGrip((CURTAIN_PULL[0] + CURTAIN_PULL[1]) / 2).center.toArray());
});

test("nothing in the room stands between the lens and the bedroom's key action", () => {
  const hidden: string[] = [];
  for (const moment of KEY_MOMENTS)
    for (let t = moment.from; t <= moment.to + 1e-9; t += 0.1) {
      if (!shotAt(t).name.startsWith("Bedroom")) continue;
      const lens = new Vector3(...cameraAt(t).position);
      const point = new Vector3(...moment.at);
      const ray = point.clone().sub(lens);
      const length = ray.length();
      ray.normalize();
      for (const solid of bedroomSolids({ door: BEDROOM_DOOR.open, curtain: solveNachtruhe(t).curtains }))
        if (solid.kind === "obb" && rayObb(lens, ray, solid) < length - 0.03) hidden.push(`${moment.name} at ${t.toFixed(2)} behind ${solid.name}`);
    }
  expect([...new Set(hidden)].slice(0, 8)).toEqual([]);
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

test("the time-jump caption is up for three seconds from the morning's first frame", () => {
  expect(CAPTION).toEqual({ text: "Zwei Wochen später.", from: shot("Bedroom: morning").from, to: shot("Bedroom: morning").from + 3 });
});

test("the bedroom shots are lit by the room's own lights, the street shots by the street's, never both", () => {
  for (const s of NACHTRUHE_SHOTS) {
    const mid = (s.from + s.to) / 2;
    const indoors = s.name.startsWith("Bedroom");
    expect(lightingAt(mid), s.name).toEqual({ street: !indoors, bedroom: indoors });
  }
});
