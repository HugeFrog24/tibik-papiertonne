import { expect, test } from "vitest";
import { CODA } from "./cigarette";
import {
  FLIGHTS,
  TIBIK_LIGHT_BUTTON,
  buttonSolid,
  riserZ,
} from "../../building/stairwell";
import {
  allColliders,
  bodyColliders,
  boxIntoTorso,
} from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { boxGap, sphereObbGap } from "../../physics/collision";
import { floorLevel } from "../../street/building";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { FPS } from "../../timeline";
import { tuckedParcel } from "./carry";
import { KLINGELSTURM_DURATION } from "./choreography";
import { inTheFlur } from "./doorCues";
import { EXIT, EXIT_HOLDS, swapAt } from "./exit";
import { LIGHT, lightsAt } from "./light";
import { klingelsturmSolids, solveKlingelsturm } from "./solve";
import { mm } from "../sceneChecks";

const TOLERANCE = 0.002;

const exitFrames = (() => {
  const frames: number[] = [];
  for (
    let f = Math.floor(EXIT.pickup * FPS);
    f < Math.floor(KLINGELSTURM_DURATION * FPS);
    f++
  )
    frames.push(f / FPS);
  return frames;
})();

const handOn = (t: number, which: "leftArm" | "rightArm") => {
  const arm = bodyColliders(RIG, asCharacter(solveKlingelsturm(t).tibik))[
    which
  ];
  return arm[arm.length - 1];
};

test("he picks the parcel up unseen, behind his shut door, and carries it on his arm from then on", () => {
  expect(solveKlingelsturm(EXIT.pickup).tibikDoor).toBe(0);
  expect(inTheFlur(EXIT.pickup)).toBe(false);
  expect(EXIT.pickup).toBeGreaterThan(LIGHT.out - 1);
  for (let t = 20; t < KLINGELSTURM_DURATION; t += 0.25)
    expect(solveKlingelsturm(t).carried, t.toFixed(2)).toBe(t >= EXIT.pickup);
});

test("after the light goes out he leaves: door shut behind him, the light back on, and he is going down the flight before the jump cut", () => {
  const end = solveKlingelsturm(CODA.jumpCut - 1 / FPS);
  expect(end.tibikDoor).toBe(0);
  expect(end.lights).toBe(1);
  expect(lightsAt(LIGHT.out + 1)).toBe(0);
  const top = riserZ(FLIGHTS[0], FLIGHTS[0].risers - 1);
  expect(end.tibik.position[2]).toBeGreaterThan(top + 0.3);
  expect(end.tibik.position[1]).toBeLessThan(
    floorLevel(1) - 2 * FLIGHTS[0].rise + 0.01,
  );
});

test("his hands are on the lever, the knob and the switch exactly while he works each", () => {
  for (const hold of EXIT_HOLDS)
    for (let t = hold.grip; t <= hold.release; t += 1 / FPS)
      expect(
        sphereObbGap(handOn(t, hold.arm), hold.target(t)),
        `${hold.name} at ${t.toFixed(2)} s`,
      ).toBeLessThan(0.01);
});

test("his left hand is on the switch when the light comes back", () => {
  const on = exitFrames.find((t) => t > LIGHT.out && lightsAt(t) > 0);
  expect(on).toBeDefined();
  expect(
    sphereObbGap(handOn(on!, "leftArm"), buttonSolid(TIBIK_LIGHT_BUTTON)),
  ).toBeLessThan(0.01);
});

test(
  "the parcel on his arm passes through nothing on the way out and down: not the stairwell, not his door, not Karen, not him",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (const t of exitFrames) {
      const state = solveKlingelsturm(t);
      const tibik = asCharacter(state.tibik);
      const swap = swapAt(t);
      const parcel = tuckedParcel(tibik, swap);
      for (const solid of klingelsturmSolids(state)) {
        const gap = boxGap(parcel, solid);
        if (gap < -TOLERANCE)
          problems.push(
            `${t.toFixed(2)} s: parcel ${mm(-gap, 0)} into ${solid.name}`,
          );
      }
      const karen = asKaren(state.karen);
      for (const s of allColliders(karen.skeleton, karen))
        if (sphereObbGap(s, parcel) < 0)
          problems.push(`${t.toFixed(2)} s: parcel into Karen's ${s.name}`);
      if (boxIntoTorso(RIG, tibik, parcel) > TOLERANCE)
        problems.push(`${t.toFixed(2)} s: parcel into his belly`);
      const own = bodyColliders(RIG, tibik);
      const free = swap === 0 ? own.rightArm : swap === 1 ? own.leftArm : [];
      for (const s of [...own.head, ...free])
        if (sphereObbGap(s, parcel) < -TOLERANCE)
          problems.push(`${t.toFixed(2)} s: parcel into his ${s.name}`);
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test(
  "Tibik and Karen never touch while he passes her",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (const t of exitFrames) {
      const state = solveKlingelsturm(t);
      const karen = asKaren(state.karen);
      const hers = allColliders(karen.skeleton, karen);
      for (const a of allColliders(RIG, asCharacter(state.tibik)))
        for (const b of hers)
          if (a.center.distanceTo(b.center) < a.radius + b.radius)
            problems.push(
              `${t.toFixed(2)} s: his ${a.name} into her ${b.name}`,
            );
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);
