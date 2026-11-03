import { expect, test } from "vitest";
import { contacts, deepest, type Solid } from "../../physics/collision";
import { Vector3 } from "three";
import { armIntoTorso, torsoMatrix } from "../../characters/skeleton";
import { BINS, FOUND_SHEET, SEARCHED_BIN, STREET_SOLIDS, WINDOWS, binContentSolids, binItemColliders, type BinSpec } from "../../street/layout";
import { tonneColliders, tonneLid } from "../../street/tonneShape";
import { ARM_WALK, RIG, TIBIK_REST } from "../../Tibik/rig";
import { PAPIERTONNEN_DURATION, SHOT_FOUND_BOX, lidAt } from "./choreography";
import { OUTLINE } from "../../toon/primitives";
import { binContentViolations, guardLid, headToKarton, papiertonnenViolations, solvePapiertonnen } from "./solve";

const FPS = 30;
const TOLERANCE = 0.005;

const describeFrame = (frame: number) => (c: { a: string; b: string; depth: number }) =>
  `frame ${frame}: ${c.a} is ${(c.depth * 1000).toFixed(0)} mm inside ${c.b}`;

test("Papiertonnen: nothing passes through anything, in any frame", { timeout: 120_000 }, () => {
  const problems: string[] = [];
  for (let frame = 0; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
    problems.push(
      ...papiertonnenViolations(solvePapiertonnen(frame / FPS))
        .filter((c) => c.depth > TOLERANCE)
        .map(describeFrame(frame)),
    );
  }
  expect(problems).toEqual([]);
});

test("Papiertonnen: bin contents fit inside their bins (lids open or closed)", { timeout: 120_000 }, () => {
  const problems: string[] = [];
  for (let frame = 0; frame < PAPIERTONNEN_DURATION * FPS; frame += 5) {
    problems.push(
      ...binContentViolations(solvePapiertonnen(frame / FPS).lids)
        .filter((c) => c.depth > TOLERANCE)
        .map(describeFrame(frame)),
    );
  }
  expect(problems).toEqual([]);
});

test("the content check catches a sheet poking through a bin wall", () => {
  const bin = BINS[1];
  const clipping: BinSpec = {
    ...bin,
    contents: [{ name: "bad sheet", position: [0.02, 1.0, 0.12], rotation: [0.28, 0.1, 0], size: [0.5, 0.025, 0.5], material: "cardboard" }],
  };
  const hits = contacts(binItemColliders(clipping), tonneColliders(bin.name, bin.position, 0.22));
  expect(deepest(hits)).toBeGreaterThan(TOLERANCE);
});

test("Papiertonnen: guards only nudge the performance, they don't rewrite it", { timeout: 120_000 }, () => {
  for (let frame = 0; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
    const { tibik } = solvePapiertonnen(frame / FPS);
    expect(Math.abs(tibik.position[1])).toBeLessThan(0.01);
    expect(tibik.pose.bob).toBeLessThan(0.15);
  }
});

test("the resting pose touches the belly without sinking into it", () => {
  const depth = armIntoTorso(RIG, TIBIK_REST, "leftArm");
  expect(depth).toBeLessThanOrEqual(TOLERANCE);
  expect(depth).toBeGreaterThan(-0.02);
});

test("walking arms swing past the belly without sinking into it", () => {
  for (let swing = -0.45; swing <= 0.45; swing += 0.05) {
    const pose = { ...TIBIK_REST, leftArm: { ...ARM_WALK, raise: ARM_WALK.raise + swing } };
    expect(armIntoTorso(RIG, pose, "leftArm")).toBeLessThanOrEqual(TOLERANCE);
  }
});

test("a lid flipped open under a window stops at the sill instead of passing through it", () => {
  const window = WINDOWS.find((w) => w.y < 3)!;
  const bin = { ...BINS.find((b) => b.name === SEARCHED_BIN)!, position: [window.x, 0, BINS[0].position[2]] as [number, number, number] };
  const fullyOpen = lidAt(PAPIERTONNEN_DURATION);
  const hitsHouse = (angle: number) =>
    deepest(contacts([tonneLid(bin.name, bin.position, angle)], STREET_SOLIDS));
  expect(hitsHouse(fullyOpen)).toBeGreaterThan(TOLERANCE);
  expect(hitsHouse(guardLid(bin, fullyOpen))).toBeLessThanOrEqual(TOLERANCE);
});

test("the box is taken out of the bin on screen, without jumping", () => {
  const worldPosition = (frame: number) => {
    const state = solvePapiertonnen(frame / FPS);
    const tibik = { ...state.tibik, skeleton: RIG };
    const karton = state.karton!;
    return new Vector3(...karton.position).applyMatrix4(torsoMatrix(RIG, tibik));
  };
  const bin = BINS.find((b) => b.name === SEARCHED_BIN)!;
  const lying = bin.contents.find((i) => i.name === FOUND_SHEET)!;
  const inBin = new Vector3(...lying.position).add(new Vector3(...bin.position));
  const first = SHOT_FOUND_BOX * FPS;
  expect(worldPosition(first).distanceTo(inBin)).toBeLessThan(0.002);
  for (let frame = first + 1; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
    expect(worldPosition(frame).distanceTo(worldPosition(frame - 1))).toBeLessThan(0.1);
  }
}, 120_000);

const LIDS_OPEN_AT = 0.01;
const restsOnSomething = (bin: (typeof BINS)[number], angle: number, supports: Solid[]) => {
  const fallen = angle + (angle < Math.PI / 2 ? -0.03 : 0.03);
  return deepest(contacts([tonneLid(bin.name, bin.position, fallen)], supports)) > 0;
};

test("open lids never hang in the air: at rest, they lean on something", { timeout: 120_000 }, () => {
  const problems: string[] = [];
  let before = solvePapiertonnen(0);
  for (let frame = 1; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
    const now = solvePapiertonnen(frame / FPS);
    const supports = [...STREET_SOLIDS, ...binContentSolids(now.karton ? FOUND_SHEET : undefined)];
    BINS.forEach((bin, i) => {
      const angle = now.lids[i];
      const still = Math.abs(angle - before.lids[i]) < 1e-4;
      if (angle > LIDS_OPEN_AT && still && !restsOnSomething(bin, angle, supports)) {
        problems.push(`frame ${frame}: ${bin.name} lid open at ${((angle * 180) / Math.PI).toFixed(1)}° with nothing holding it`);
      }
    });
    before = now;
  }
  expect(problems).toEqual([]);
});

test("the lid check catches a lid left hanging just short of vertical", () => {
  const bin = BINS.find((b) => b.name === SEARCHED_BIN)!;
  expect(restsOnSomething(bin, 1.55, [...STREET_SOLIDS])).toBe(false);
  expect(restsOnSomething(bin, guardLid(bin, lidAt(PAPIERTONNEN_DURATION)), [...STREET_SOLIDS])).toBe(true);
});

test("his chin keeps clear of the box and its flaps, by at least their ink outline", { timeout: 120_000 }, () => {
  const problems: string[] = [];
  for (let frame = 0; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
    const { tibik, karton } = solvePapiertonnen(frame / FPS);
    const gap = karton ? headToKarton(tibik, karton) : Infinity;
    if (gap < OUTLINE) {
      problems.push(`frame ${frame}: head ${(gap * 1000).toFixed(1)} mm from the box`);
    }
  }
  expect(problems).toEqual([]);
});
