import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { expect, test } from "vitest";
import { ACROSS_STREET, acrossFootprint, acrossPoint } from "./building";
import { footprint, overlap, partFootprint } from "./footprint";
import { STREET_LAMPS, lampParts } from "./lamps";
import { FACADE_Z, HYDRANT, MORE_TREES, hydrantCap, treePit } from "./layout";

const drawnAcross = () =>
  new Matrix4().compose(
    new Vector3(ACROSS_STREET.shift, 0, ACROSS_STREET.facade + FACADE_Z),
    new Quaternion().setFromEuler(new Euler(0, Math.PI, 0)),
    new Vector3(1, 1, 1),
  );

test("the far side is the near side turned half round, the way Street draws it", () => {
  const near = treePit(20);
  const corners = [
    new Vector3(near.x[0], 0, near.z[0]),
    new Vector3(near.x[1], 0, near.z[1]),
  ].map((c) => c.applyMatrix4(drawnAcross()));
  const far = acrossFootprint(near);
  expect(Math.min(...corners.map((c) => c.x))).toBeCloseTo(far.x[0], 9);
  expect(Math.max(...corners.map((c) => c.x))).toBeCloseTo(far.x[1], 9);
  expect(Math.min(...corners.map((c) => c.z))).toBeCloseTo(far.z[0], 9);
  expect(Math.max(...corners.map((c) => c.z))).toBeCloseTo(far.z[1], 9);
});

test("a point across the street is the near point turned half round, the way Street draws it", () => {
  const near = new Vector3(3.2, 1.1, 4.7);
  const drawn = near.clone().applyMatrix4(drawnAcross()).toArray();
  acrossPoint(near.toArray()).forEach((v, i) => { expect(v).toBeCloseTo(drawn[i], 9); });
});

test("across the street, the tree pits and the hydrant cap stand clear of every street lamp", () => {
  const lamps = STREET_LAMPS.flatMap(lampParts).map(partFootprint);
  const cap = hydrantCap();
  const far = [
    ...MORE_TREES.map((x) => acrossFootprint(treePit(x))),
    acrossFootprint(footprint(cap.x, cap.z, HYDRANT.cap[0], HYDRANT.cap[1])),
  ];
  for (const f of far)
    for (const lamp of lamps) expect(overlap(f, lamp)).toBe(false);
});
