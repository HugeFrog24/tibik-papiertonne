import { Group, Mesh, MeshBasicMaterial, type ShaderMaterial } from "three";
import { expect, test } from "vitest";
import { idMaterialOf } from "./InkPass";
import { ONE_UNIT, inkJoin } from "./inkWidth";

const uniformsOf = (m: ShaderMaterial) => [m.uniforms["uId"].value, m.uniforms["uJoinId"].value, m.uniforms["uJoinReach"].value, m.uniforms["uInk"].value] as number[];

test("an object is inked by the unit it belongs to now, however long the render has run: a part moved into a unit drawn anew takes that unit's id, so a long render outlines exactly what a single frame does (in a long 4K60 render the open letterbox door kept an old unit's id and grew lines between its own parts)", () => {
  const cache = new Map<Mesh, ShaderMaterial>();
  const part = new Mesh(undefined, new MeshBasicMaterial());
  const first = new Group();
  first.userData = { ...ONE_UNIT };
  first.add(part);
  const before = uniformsOf(idMaterialOf(cache, part, part.material));
  expect(before[0]).toBe(first.id);
  const drawnAnew = new Group();
  drawnAnew.userData = { ...ONE_UNIT };
  const sibling = new Mesh(undefined, new MeshBasicMaterial());
  drawnAnew.add(part, sibling);
  const now = uniformsOf(idMaterialOf(cache, part, part.material));
  expect(now[0]).toBe(drawnAnew.id);
  expect(now[0]).toBe(uniformsOf(idMaterialOf(cache, sibling, sibling.material))[0]);
  expect(cache.size).toBe(2);
});

test("a part's join and ink weight follow its place too", () => {
  const cache = new Map<Mesh, ShaderMaterial>();
  const outer = new Group();
  outer.userData = { ...ONE_UNIT };
  const inner = new Group();
  inner.userData = { ...ONE_UNIT };
  const part = new Mesh(undefined, new MeshBasicMaterial());
  part.userData = inkJoin(0.05);
  inner.add(part);
  const [id, joinId, reach] = uniformsOf(idMaterialOf(cache, part, part.material));
  expect([id, joinId, reach]).toEqual([inner.id, inner.id, 0]);
  outer.add(inner);
  const [id2, joinId2, reach2] = uniformsOf(idMaterialOf(cache, part, part.material));
  expect([id2, joinId2, reach2]).toEqual([inner.id, outer.id, 0.05]);
});
