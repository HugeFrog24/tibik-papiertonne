import { Vector3 } from "three";
import { expect, test } from "vitest";
import { seenBy } from "../dialogue/screen";
import { SHOTS } from "../scenes/hausmuell/cameras";
import { OUTLINE } from "../toon/primitives";
import {
  LAMP,
  MAST_PLATE,
  lampParts,
  STREET_LAMPS,
  mastNumber,
  stickersOn,
  POLE,
  type LampWrap,
} from "./lamps";
import { overlapping, wrapGaps } from "./wrapChecks";
import { poleBox, wrapNormal } from "./wraps";

const wrapsOn = (lamp: (typeof STREET_LAMPS)[number]): LampWrap[] => [
  MAST_PLATE,
  ...stickersOn(lamp),
];

test("the plate and every sticker lie flat on the pole's faces, 0.5-2 mm proud and inside its ink line", () => {
  for (const lamp of STREET_LAMPS)
    for (const wrap of wrapsOn(lamp)) {
      const gaps = wrapGaps(POLE, wrap);
      expect(Math.min(...gaps), wrap.design).toBeGreaterThanOrEqual(0.0005);
      expect(Math.max(...gaps), wrap.design).toBeLessThanOrEqual(0.002);
      expect(Math.max(...gaps)).toBeLessThan(OUTLINE);
      expect(Number.isInteger(wrap.face) && Number.isInteger(wrap.faces)).toBe(
        true,
      );
      expect(wrap.faces).toBeGreaterThanOrEqual(1);
      expect(wrap.bottom + wrap.height).toBeLessThan(LAMP.height - 0.2);
    }
});

test("stickers sit where a person can reach (0.9-2 m), the mast number above them at 2-2.6 m", () => {
  for (const lamp of STREET_LAMPS)
    for (const wrap of stickersOn(lamp)) {
      expect(wrap.bottom).toBeGreaterThanOrEqual(0.9);
      expect(wrap.bottom + wrap.height).toBeLessThanOrEqual(2.0);
    }
  expect(MAST_PLATE.bottom).toBeGreaterThanOrEqual(2.0);
  expect(MAST_PLATE.bottom + MAST_PLATE.height).toBeLessThanOrEqual(2.6);
});

test("no two wraps on one pole overlap", () => {
  for (const lamp of STREET_LAMPS) {
    const wraps = wrapsOn(lamp);
    wraps.forEach((a, i) => { wraps
        .slice(i + 1)
        .forEach((b) => { expect(overlapping(POLE, a, b), `${a.design} / ${b.design}`).toBe(
            false,
          ); },
        ); },
    );
  }
});

test("every mast has its own number, and every mast carries a few stickers", () => {
  const numbers = STREET_LAMPS.map(mastNumber);
  expect(new Set(numbers).size).toBe(STREET_LAMPS.length);
  for (const n of numbers) expect(n).toMatch(/^\d{3}$/);
  for (const lamp of STREET_LAMPS)
    expect(stickersOn(lamp).length).toBeGreaterThanOrEqual(3);
});

test("the mast seen behind Karen shows its number and at least three stickers to the camera", () => {
  const shot = SHOTS.find((s) => s.name === "Karen: Hausmüll")!;
  const setup = shot.at((shot.from + shot.to) / 2);
  const eye = new Vector3(...setup.position);
  const lamp = STREET_LAMPS.find((l) => l.x === 14)!;
  const facing = (wrap: LampWrap) => {
    const { x: nx, z: nz } = wrapNormal(POLE, wrap);
    const normal = new Vector3(nx, 0, nz);
    const at = new Vector3(lamp.x, wrap.bottom + wrap.height / 2, lamp.z);
    return (
      seenBy(at, setup) && eye.clone().sub(at).normalize().dot(normal) > 0.3
    );
  };
  expect(facing(MAST_PLATE)).toBe(true);
  expect(stickersOn(lamp).filter(facing).length).toBeGreaterThanOrEqual(3);
});

test("the mast drawn is the mast that collides and the one the plate and stickers wrap", () => {
  for (const lamp of STREET_LAMPS) {
    const [solid] = lampParts(lamp);
    expect(solid.size).toEqual(poleBox(POLE));
    expect(solid.center[1]).toBe(POLE.height / 2);
  }
  expect(POLE.radius).toEqual(LAMP.radius);
  expect(POLE.height).toBe(LAMP.height);
  expect(POLE.radiusAt(0)).toBe(LAMP.radius[1]);
  expect(POLE.radiusAt(LAMP.height)).toBeCloseTo(LAMP.radius[0], 12);
});
