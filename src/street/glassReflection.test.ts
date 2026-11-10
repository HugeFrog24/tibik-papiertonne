import { Vector3 } from "three";
import { expect, test } from "vitest";
import { doorFrame } from "../building/doors";
import { GLASS_PANE } from "../building/glazedLeaf";
import type { Vec3 } from "../toon/primitives";
import { FACADE_Z, FRAME_BORDER, OPENING_LAYERS, OPENINGS, acrossZ, openingFrame } from "./building";
import { DOORWAY, FACADE_THICKNESS, HAUSTUER, HAUSTUER_GLASS, facadeOpenings, type Rect } from "./facade";
import {
  FACADE_MIRROR_Z,
  GLASS_F0,
  SHUT_TOLERANCE,
  ajar,
  GLASS_REFLECTION,
  clearViewsOut,
  dimmedBehind,
  distantGlass,
  doorGlassFilm,
  glassFresnel,
  glazingReflectance,
  seenFromInside,
  surfaceReflectance,
} from "./glassReflection";

test("one face of glass reflects 4 % of the light head-on, one pane 7.7 %, and the double glazing in every window here about 14 %, as the Fresnel equations give for glass", () => {
  expect(surfaceReflectance()).toBeCloseTo(0.04, 9);
  expect(glazingReflectance(1)).toBeCloseTo(0.0769, 4);
  expect(glazingReflectance(2)).toBeCloseTo(0.1428, 3);
  expect(GLASS_F0).toBe(glazingReflectance(2));
});

test("glass reflects more the flatter it is seen, until at a grazing angle it is a mirror", () => {
  expect(glassFresnel(1)).toBeCloseTo(GLASS_F0, 12);
  expect(glassFresnel(0)).toBe(1);
  for (let c = 0; c < 1; c += 0.05) expect(glassFresnel(c)).toBeGreaterThanOrEqual(glassFresnel(c + 0.05));
});

test("seen head-on a lit window loses none of its light to the reflection, which only adds to it; the room behind fades only as the glass turns into a mirror", () => {
  expect(dimmedBehind(1)).toBeCloseTo(0, 12);
  expect(dimmedBehind(0)).toBeCloseTo(1 - GLASS_F0, 12);
  for (let c = 0; c < 1; c += 0.05) expect(dimmedBehind(c)).toBeGreaterThanOrEqual(dimmedBehind(c + 0.05));
});

test("the reflection lies on the glass: in front of the curtains behind it, behind the shutters, glazing bars and frame in front of it", () => {
  expect(OPENING_LAYERS.reflection).toBeGreaterThan(OPENING_LAYERS.curtain);
  expect(OPENING_LAYERS.reflection).toBeLessThan(OPENING_LAYERS.shutter);
  expect(OPENING_LAYERS.reflection).toBeLessThan(OPENING_LAYERS.bars);
});

test("the facade's mirror lies in its glass just in front of the wall, so the wall, the panes and the curtains behind it are cut away and never stand between the mirror and the street", () => {
  expect(FACADE_MIRROR_Z).toBe(FACADE_Z + OPENING_LAYERS.reflection);
  const kept = FACADE_MIRROR_Z + GLASS_REFLECTION.clearance;
  for (const behind of [FACADE_Z, FACADE_Z + OPENING_LAYERS.glass, FACADE_Z + OPENING_LAYERS.curtain]) expect(behind).toBeLessThan(kept);
  expect(GLASS_REFLECTION.clearance).toBeGreaterThan(0);
  expect(GLASS_REFLECTION.clearance).toBeLessThan(OPENING_LAYERS.shutter - OPENING_LAYERS.reflection);
});

test("the neighbouring blocks' glass is every pane they paint, less what their roller shutters cover", () => {
  const glass = distantGlass();
  const open = OPENINGS.filter((o) => o.shutter < 1);
  expect(glass).toHaveLength(open.length);
  open.forEach((o, i) => {
    const [fw, fh] = openingFrame(o);
    const [w, h] = [fw - 2 * FRAME_BORDER, fh - 2 * FRAME_BORDER];
    const g = glass[i];
    expect([g.x0, g.x1, g.y0, g.y1].map((v) => +v.toFixed(9))).toEqual([o.x - w / 2, o.x + w / 2, o.y - h / 2, o.y + h / 2 - h * o.shutter].map((v) => +v.toFixed(9)));
  });
  expect(OPENINGS.some((o) => o.shutter === 1)).toBe(true);
});

test("the Haustür's reflection lies on the outer face of its glass, over the whole pane, inside the leaf, and faces the street while the door is shut", () => {
  const film = doorGlassFilm(HAUSTUER_GLASS);
  expect(film.position).toEqual([HAUSTUER_GLASS.x, HAUSTUER_GLASS.y, expect.closeTo(GLASS_PANE / 2, 2)]);
  expect(film.position[2]).toBeGreaterThan(GLASS_PANE / 2);
  expect(film.position[2]).toBeLessThan(HAUSTUER.thickness / 2);
  expect(film.size).toEqual([HAUSTUER_GLASS.w, HAUSTUER_GLASS.h]);
  const facing = new Vector3(0, 0, 1).transformDirection(doorFrame(HAUSTUER, 0));
  expect(facing.z).toBeCloseTo(1, 9);
});

const centre = (r: Rect): Vec3 => [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, FACADE_Z];

const acrossAlong = (eye: Vec3, through: Vec3): Vec3 => {
  const z = acrossZ(FACADE_Z + OPENING_LAYERS.reflection);
  const t = (z - eye[2]) / (through[2] - eye[2]);
  return [eye[0] + t * (through[0] - eye[0]), eye[1] + t * (through[1] - eye[1]), z];
};

const paneAt = ([x, y, z]: Vec3): Vec3[] => [[x - 0.5, y - 0.6, z], [x + 0.5, y - 0.6, z], [x - 0.5, y + 0.6, z], [x + 0.5, y + 0.6, z]];

const inAnyHole = (x: number, y: number) => facadeOpenings(12).some((h) => x > h.x0 - 1.5 && x < h.x1 + 1.5 && y > h.y0 - 1.5 && y < h.y1 + 1.5);

test("from inside No. 12 the glass across the street is seen only through its clear openings: the open Haustür, the stair windows and the bedroom window, never through the wall or the shut door's patterned glass", () => {
  const indoors = (r: Rect): Vec3 => [centre(r)[0], centre(r)[1], FACADE_Z - FACADE_THICKNESS - 2];
  const windows = facadeOpenings(12).filter((h) => h !== DOORWAY);
  expect(windows.length).toBeGreaterThan(2);
  for (const hole of windows) {
    const eye = indoors(hole);
    expect(seenFromInside(eye, paneAt(acrossAlong(eye, centre(hole))), clearViewsOut(false))).toBe(true);
  }
  const doorEye = indoors(DOORWAY);
  const throughTheDoor = paneAt(acrossAlong(doorEye, centre(DOORWAY)));
  expect(seenFromInside(doorEye, throughTheDoor, clearViewsOut(false))).toBe(false);
  expect(seenFromInside(doorEye, throughTheDoor, clearViewsOut(true))).toBe(true);
  let wall: Vec3 | undefined;
  for (let x = -14; x < 14 && !wall; x += 0.25) for (let y = 1; y < 15 && !wall; y += 0.25) if (!inAnyHole(x, y)) wall = [x, y, FACADE_Z];
  expect(wall).toBeDefined();
  const wallEye: Vec3 = [wall![0], wall![1], FACADE_Z - FACADE_THICKNESS - 2];
  expect(seenFromInside(wallEye, paneAt(acrossAlong(wallEye, wall!)), clearViewsOut(true))).toBe(false);
});

test("from the street, glass in shot is always seen", () => {
  const eye: Vec3 = [0, 1.7, 6];
  expect(seenFromInside(eye, paneAt([3, 6, FACADE_Z + 0.035]), clearViewsOut(false))).toBe(true);
  expect(seenFromInside(eye, paneAt(acrossAlong([0, 1.7, -8], [0, 2, FACADE_Z])), clearViewsOut(false))).toBe(true);
});

test("the shut door's view out is no clear view: its doorway counts only once the door is open", () => {
  expect(clearViewsOut(false)).not.toContain(DOORWAY);
  expect(clearViewsOut(true)).toContain(DOORWAY);
  expect(clearViewsOut(false).length).toBe(facadeOpenings(12).length - 1);
});

test("the Haustür counts as open the moment it moves off its stop; while shut it shares the facade's mirror, whose image of the far side of the street is then off by under 5 mm", () => {
  expect([ajar(0), ajar(SHUT_TOLERANCE / 2), ajar(-SHUT_TOLERANCE / 2)]).toEqual([false, false, false]);
  expect([ajar(0.01), ajar(-0.01), ajar(Math.PI / 2)]).toEqual([true, true, true]);
  const acrossTheStreet = acrossZ(FACADE_Z) - FACADE_Z;
  expect(2 * SHUT_TOLERANCE * acrossTheStreet).toBeLessThan(0.005);
});
