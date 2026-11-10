import { expect, test } from "vitest";
import { floorLevel } from "../street/building";
import { treppenhausTibikGait } from "../scenes/treppenhaus/choreography";
import { RIG } from "../Tibik/rig";
import { OUTLINE } from "../toon/primitives";
import {
  DOORMATS,
  MAT_THICKNESS,
  doorOfMat,
  doormatRect,
} from "./doormatShape";
import { firstFloorGround, groundWithMats } from "./ground";
import { soleGrid } from "../characters/soleGrid";
import { mm } from "../scenes/sceneChecks";

const soles = () => {
  const [, dy, dz] = RIG.foot.offset;
  return (["leftLeg", "rightLeg"] as const).flatMap((leg) =>
    treppenhausTibikGait().plants[leg].map((plant) => {
      const { x, y, z } = plant.ankle;
      const forward = [Math.sin(plant.yaw), Math.cos(plant.yaw)];
      return {
        leg,
        at: `${x.toFixed(2)},${z.toFixed(2)}`,
        points: soleGrid(RIG.foot.size).map(({ u, v, drop }) => {
          const along = dz + u;
          return {
            px: x + forward[0] * along + forward[1] * v,
            pz: z + forward[1] * along - forward[0] * v,
            underside: y + dy - drop - OUTLINE,
          };
        }),
      };
    }),
  );
};

const tibikMat = doormatRect(
  DOORMATS.find((m) => doorOfMat(m).name === "Tibik's door")!,
);

test("on a mat the ground is the mat's top, beside it the floor", () => {
  const middle = [
    (tibikMat.x0 + tibikMat.x1) / 2,
    (tibikMat.z0 + tibikMat.z1) / 2,
  ];
  expect(groundWithMats(middle[0], middle[1])).toBeCloseTo(
    floorLevel(1) + MAT_THICKNESS,
    9,
  );
  expect(groundWithMats(tibikMat.x1 + 0.05, middle[1])).toBeCloseTo(
    floorLevel(1),
    9,
  );
});

test("the 1. OG landing is level in both lanes", () => {
  expect(firstFloorGround(-2.4, -9.6)).toBeCloseTo(floorLevel(1), 9);
  expect(firstFloorGround(-1.0, -7.0)).toBeCloseTo(floorLevel(1), 9);
});

test("Tibik's drawn soles, outline included, never dip below the ground under them", () => {
  const problems: string[] = [];
  for (const { leg, at, points } of soles())
    for (const { px, pz, underside } of points)
      if (underside < groundWithMats(px, pz) - 1e-9)
        problems.push(
          `${leg} at ${at}: ${mm(groundWithMats(px, pz) - underside)} into the ground`,
        );
  expect([...new Set(problems)].slice(0, 6)).toEqual([]);
});

test("a foot lifted onto a mat still touches it: no planted sole hovers", () => {
  const [, dy] = RIG.foot.offset;
  const [, ry] = RIG.foot.size;
  const restGap = 0.18 + dy - ry - OUTLINE;
  const problems: string[] = [];
  for (const { leg, at, points } of soles()) {
    const gap = Math.min(
      ...points.map(
        ({ px, pz, underside }) => underside - groundWithMats(px, pz),
      ),
    );
    if (gap > restGap + 0.001)
      problems.push(`${leg} at ${at} hovers ${mm(gap - restGap)}`);
  }
  expect(problems).toEqual([]);
});
