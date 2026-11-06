import { Matrix4 } from "three";
import { expect, test } from "vitest";
import { CIGARETTE, cigaretteObb, cigaretteParts, cigaretteSegments, cigaretteTip } from "./cigaretteShape";

test("a king-size cigarette: 84 x 8 mm, a 25 mm filter, a 2 mm ink line", () => {
  expect(CIGARETTE.length).toBeCloseTo(0.084, 9);
  expect(2 * CIGARETTE.radius).toBeCloseTo(0.008, 9);
  expect(CIGARETTE.filter).toBeCloseTo(0.025, 9);
  expect(CIGARETTE.ink).toBeCloseTo(0.002, 9);
});

test("burning shortens the rod; the ash is never longer than what has burned; the ember sits at the burning end", () => {
  const fresh = cigaretteParts({ burned: 0, ash: 0 });
  expect(fresh.rod).toBeCloseTo(0.059, 9);
  expect(fresh.ashLength).toBe(0);
  expect(fresh.emberAt).toBeCloseTo(0.084, 9);
  const smoked = cigaretteParts({ burned: 0.023, ash: 0.008 });
  expect(smoked.rod).toBeCloseTo(0.036, 9);
  expect(smoked.ashLength).toBeCloseTo(0.008, 9);
  expect(smoked.emberAt).toBeCloseTo(0.061, 9);
  expect(cigaretteParts({ burned: 0.01, ash: 0.03 }).ashLength).toBeCloseTo(0.01, 9);
  expect(cigaretteParts({ burned: 1, ash: 0 }).rod).toBeGreaterThan(0);
  const tip = cigaretteTip(new Matrix4(), 0.023);
  expect(tip.z).toBeCloseTo(0.061, 9);
  const box = cigaretteObb(new Matrix4(), 0.023, 0.008);
  expect(2 * box.half[2]).toBeCloseTo(0.069, 9);
  expect(box.center.z).toBeCloseTo(0.0345, 9);
});


test("filter, paper, ember (or the brown tobacco face, unlit) and ash abut end to end, no two end faces in one plane", () => {
  for (const [burned, ash, lit] of [[0, 0, false], [0, 0, true], [0.023, 0.008, true], [0.01, 0.01, true]] as const) {
    const parts = cigaretteSegments({ burned, ash, lit });
    expect(parts[0]).toMatchObject({ part: "filter", from: 0 });
    parts.forEach((p, i) => {
      expect(p.to - p.from, `${p.part}`).toBeGreaterThan(0);
      if (i > 0) expect(p.from).toBeCloseTo(parts[i - 1].to, 12);
    });
    expect(parts.map((p) => p.part)).toContain(lit ? "ember" : "tobacco");
    expect(parts[parts.length - 1].to).toBeCloseTo(cigaretteParts({ burned, ash }).emberAt + cigaretteParts({ burned, ash }).ashLength, 12);
  }
});

test("the ember lights only what is within 14 cm of it: her lips, nose tip and fingers", () => {
  expect(CIGARETTE.emberLight.distance).toBeCloseTo(0.14, 9);
  expect(CIGARETTE.emberLight.intensity).toBeLessThanOrEqual(0.005);
});
