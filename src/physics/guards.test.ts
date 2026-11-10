import { Euler, Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { rundschreibenTibikAt } from "../scenes/rundschreiben/choreography";
import { asCharacter } from "../Tibik/character";
import { contacts, frame, obb } from "./collision";
import { bodyColliders, carriedBox, torsoMatrix } from "../characters/skeleton";
import { GUARD_REACH, guardBody, guardCarried, type Carried } from "./guards";

const standing = () => asCharacter(rundschreibenTibikAt(0));

const wallThrough = (x: number, z: number) =>
  obb("wall", new Matrix4().makeTranslation(x, 1.5, z), [0.3, 3, 3]);

test("a path run into a wall moves the body by a small, visible push at most, never a jump across the set", () => {
  const before = standing();
  const [x, , z] = before.position;
  const after = guardBody(before, [wallThrough(x + 0.1, z)]);
  const moved = Math.hypot(after.position[0] - x, after.position[2] - z);
  expect(moved).toBeGreaterThan(0);
  expect(moved).toBeLessThanOrEqual(GUARD_REACH + 1e-9);
  const body = bodyColliders(after.skeleton, after);
  expect(contacts([...body.legs, ...body.lowerTorso], [wallThrough(x + 0.1, z)]).length).toBeGreaterThan(0);
});

test("a body clear of every solid stays where its path puts it", () => {
  const before = standing();
  const [x, , z] = before.position;
  expect(guardBody(before, [wallThrough(x + 3, z)]).position).toEqual(before.position);
});

test("a carried box grazing a wall beside it is eased off the wall, not lifted up over it", () => {
  const c = standing();
  const size: [number, number, number] = [0.3, 0.38, 0.1];
  const box: Carried = { position: [0, 0.5, 0.45], rotation: [0, 0, 0] };
  const boundsOf = () => ({ size, center: [0, 0, 0] as [number, number, number] });
  const graze = 0.003;
  const wall = obb("bin side wall", frame(torsoMatrix(c.skeleton, c), [box.position[0] + size[0] / 2 + 0.01 - graze, box.position[1] - size[1] / 2 - 0.2, box.position[2]], new Euler()), [0.02, 0.6, 0.5]);
  expect(guardCarried(c, box, boundsOf, []).position).toEqual(box.position);
  const at = (b: Carried) => carriedBox(c.skeleton, c, b.position, b.rotation, size);
  expect(contacts([at(box)], [wall]).length).toBeGreaterThan(0);
  const guarded = guardCarried(c, box, boundsOf, [wall]);
  expect(contacts([at(guarded)], [wall])).toEqual([]);
  expect(new Vector3(...guarded.position).distanceTo(new Vector3(...box.position))).toBeLessThan(0.01);
});

test("a body grazing a wall with several spheres at once is moved just clear of it, by the deepest overlap, not by all the overlaps added up", () => {
  const before = standing();
  const [x, , z] = before.position;
  const body = bodyColliders(before.skeleton, before);
  const parts = [...body.legs, ...body.lowerTorso];
  const reach = Math.max(...parts.map((s) => s.center.x + s.radius));
  const overlap = 0.02;
  const wall = obb("wall", new Matrix4().makeTranslation(reach - overlap + 0.15, 1.5, z), [0.3, 3, 3]);
  expect(contacts(parts, [wall]).length).toBeGreaterThan(1);
  const after = guardBody(before, [wall]);
  const moved = Math.hypot(after.position[0] - x, after.position[2] - z);
  expect(moved).toBeGreaterThanOrEqual(overlap - 1e-6);
  expect(moved).toBeLessThan(overlap + 0.002);
  const guarded = bodyColliders(after.skeleton, after);
  expect(contacts([...guarded.legs, ...guarded.lowerTorso], [wall])).toEqual([]);
});

test("against a sloping face (a step edge, a tilted lid) the body is moved sideways far enough to clear it, though only its sideways part pushes him", () => {
  const before = standing();
  const [, , z] = before.position;
  const body = bodyColliders(before.skeleton, before);
  const parts = [...body.legs, ...body.lowerTorso];
  const reach = Math.max(...parts.map((s) => s.center.x + s.radius));
  const slope = new Matrix4().makeRotationZ(Math.PI / 4).setPosition(reach + 0.15, 1.1, z);
  const face = obb("sloping face", slope, [0.3, 0.3, 3]);
  const touching = contacts(parts, [face]);
  expect(touching.length).toBeGreaterThan(0);
  expect(Math.max(...touching.map((c) => Math.abs(c.normal.y)))).toBeGreaterThan(0.3);
  const after = guardBody(before, [face]);
  const guarded = bodyColliders(after.skeleton, after);
  expect(contacts([...guarded.legs, ...guarded.lowerTorso], [face])).toEqual([]);
});

test("pressed a couple of millimetres into a nearly flat face (a step top, a lid tipped a few degrees), the body is nudged, not shoved sideways across the set", () => {
  const before = standing();
  const [x, , z] = before.position;
  const body = bodyColliders(before.skeleton, before);
  const parts = [...body.legs, ...body.lowerTorso];
  const lowest = parts.reduce((low, s) => (s.center.y - s.radius < low.center.y - low.radius ? s : low));
  const tilt = (3 * Math.PI) / 180;
  const top = lowest.center.y - lowest.radius + 0.002;
  const slab = obb("nearly flat", new Matrix4().makeRotationZ(tilt).setPosition(lowest.center.x, top - 0.05, lowest.center.z), [1, 0.1, 1]);
  const touching = contacts(parts, [slab]);
  expect(touching.length).toBeGreaterThan(0);
  expect(Math.min(...touching.map((c) => Math.abs(c.normal.y)))).toBeGreaterThan(0.9);
  const after = guardBody(before, [slab]);
  expect(Math.hypot(after.position[0] - x, after.position[2] - z)).toBeLessThan(0.01);
});
