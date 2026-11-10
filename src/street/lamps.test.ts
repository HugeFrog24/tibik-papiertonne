import { expect, test } from "vitest";
import { KERB_Z, acrossZ } from "./building";
import { LAMP, STREET_LAMPS } from "./lamps";

const FAR_KERB_Z = acrossZ(KERB_Z);

const sides = () => {
  const near = STREET_LAMPS.filter((lamp) => lamp.z < KERB_Z)
    .map((lamp) => lamp.x)
    .sort((a, b) => a - b);
  const far = STREET_LAMPS.filter((lamp) => lamp.z > FAR_KERB_Z)
    .map((lamp) => lamp.x)
    .sort((a, b) => a - b);
  return { near, far };
};

test("street lamps are residential masts, 4 to 5.5 m tall, set back from the kerb with their arm over the road", () => {
  expect(LAMP.height).toBeGreaterThanOrEqual(4);
  expect(LAMP.height).toBeLessThanOrEqual(5.5);
  for (const lamp of STREET_LAMPS) {
    const onNearPavement = lamp.z < KERB_Z && lamp.z > KERB_Z - 1;
    const onFarPavement = lamp.z > FAR_KERB_Z && lamp.z < FAR_KERB_Z + 1;
    expect(onNearPavement || onFarPavement).toBe(true);
    expect(lamp.toward).toBe(onNearPavement ? 1 : -1);
  }
});

test("they stand 30 m apart on each side, staggered half a spacing across the street", () => {
  const { near, far } = sides();
  expect(near.length + far.length).toBe(STREET_LAMPS.length);
  for (const row of [near, far])
    row.slice(1).forEach((x, i) => { expect(x - row[i]).toBeLessThanOrEqual(30); });
  for (const x of far)
    expect(Math.min(...near.map((n) => Math.abs(n - x)))).toBeCloseTo(15, 6);
});

test("none stands in front of No. 12's entrance and bins, where the wide shots look", () => {
  for (const x of sides().near) expect(Math.abs(x)).toBeGreaterThan(12);
});
