import { Vector3 } from "three";
import { expect, test } from "vitest";
import { contacts } from "../physics/collision";
import { floorLevel } from "../street/building";
import { doorFrame, doorSolids } from "./doors";
import { FLUR_PARTS, FLUR_SOLIDS, SWUNG } from "./flurShape";
import { FLUR, TIBIK_DOOR } from "./stairwell";

const floor = floorLevel(1);
const MOUNT = 0.01;

const span = (center: number, size: number) => [
  center - size / 2,
  center + size / 2,
];

test("the Flur has a chest of drawers, a coat rack, a clock, the chime and the intercom", () => {
  const names = FLUR_PARTS.map((p) => p.name).join(" ");
  for (const thing of [
    "chest of drawers",
    "coat rack",
    "clock",
    "chime",
    "intercom",
  ])
    expect(names).toContain(thing);
});

test("every part of the Flur fits inside its walls, floor and ceiling", () => {
  for (const part of FLUR_PARTS) {
    const [x0, x1] = span(part.center[0], part.size[0]);
    const [y0, y1] = span(part.center[1], part.size[1]);
    const [z0, z1] = span(part.center[2], part.size[2]);
    expect(x0, part.name).toBeGreaterThanOrEqual(FLUR.x0 - 1e-9);
    expect(x1, part.name).toBeLessThanOrEqual(FLUR.x1 + 1e-9);
    expect(z0, part.name).toBeGreaterThanOrEqual(FLUR.z0 - 1e-9);
    expect(z1, part.name).toBeLessThanOrEqual(FLUR.z1 + 1e-9);
    expect(y0, part.name).toBeGreaterThanOrEqual(floor - 1e-9);
    expect(y1, part.name).toBeLessThanOrEqual(floor + FLUR.height + 1e-9);
  }
});

test("nothing in the Flur is in the way of his door, opened all the way", () => {
  const problems: string[] = [];
  for (let a = 0; a <= SWUNG + 1e-9; a += 0.02)
    for (const c of contacts(doorSolids(TIBIK_DOOR, a), FLUR_SOLIDS))
      problems.push(`${c.a} hits ${c.b} at ${a.toFixed(2)} rad`);
  expect(SWUNG).toBeGreaterThanOrEqual(Math.PI / 2);
  expect(problems.slice(0, 5)).toEqual([]);
});

test("the chest stands on the floor and everything else hangs flat on a wall", () => {
  for (const part of FLUR_PARTS) {
    const [x0, x1] = span(part.center[0], part.size[0]);
    const [y0] = span(part.center[1], part.size[1]);
    const [z0, z1] = span(part.center[2], part.size[2]);
    const onFloor = Math.abs(y0 - floor) < MOUNT;
    const onWall =
      Math.abs(x0 - FLUR.x0) < MOUNT ||
      Math.abs(x1 - FLUR.x1) < MOUNT ||
      Math.abs(z0 - FLUR.z0) < MOUNT ||
      Math.abs(z1 - FLUR.z1) < MOUNT;
    expect(onFloor || onWall, part.name).toBe(true);
  }
});

test("as in the real Flur, the coat rack and the intercom hang beside the hinge side of his door and the clock on the end wall", () => {
  const byName = (name: string) =>
    FLUR_PARTS.find((p) => p.name.includes(name))!;
  const hingeSide = TIBIK_DOOR.hinge[2];
  for (const name of ["coat rack", "intercom"]) {
    const part = byName(name);
    expect(part.center[0] + part.size[0] / 2, name).toBeCloseTo(FLUR.x1, 2);
    expect(part.center[2] + part.size[2] / 2, name).toBeLessThan(
      hingeSide - 0.01,
    );
  }
  expect(byName("intercom").center[2]).toBeLessThan(
    byName("coat rack").center[2],
  );
  const clock = byName("clock");
  expect(clock.center[2] - clock.size[2] / 2).toBeCloseTo(FLUR.z0, 2);
});

test("a light switch sits beside his door on the latch side, its centre 1.05 m up, 10–30 cm from the door (DIN 18015-3 zone ZS-t)", () => {
  const light = FLUR_PARTS.find((p) => p.name === "light switch")!;
  expect(light).toBeDefined();
  expect(light.center[1] - floor).toBeLessThanOrEqual(1.05 + 1e-9);
  expect(light.center[1] - floor).toBeGreaterThanOrEqual(0.95);
  expect(Math.abs(light.center[0] + light.size[0] / 2 - FLUR.x1)).toBeLessThan(
    MOUNT,
  );
  const shut = doorFrame(TIBIK_DOOR, 0);
  const hinge = new Vector3(0, 0, 0).applyMatrix4(shut).z;
  const latch = new Vector3(TIBIK_DOOR.width, 0, 0).applyMatrix4(shut).z;
  const beyond = (light.center[2] - latch) * Math.sign(latch - hinge);
  expect(beyond).toBeGreaterThanOrEqual(0.1);
  expect(beyond).toBeLessThanOrEqual(0.3);
});
