import { expect, test } from "vitest";
import { INNER_GLASS } from "../building/bedroomShape";
import { distanceToSegment } from "../characters/scalar";
import { BEAD_RIM, GLASS_RAIN, glassRain } from "./glassRain";

const pane = { w: INNER_GLASS.w, h: INNER_GLASS.h };
const rain = glassRain(pane);
const third = (y: number) => (y > pane.h / 6 ? "top" : y < -pane.h / 6 ? "bottom" : "middle");
const meanRadius = (where: string) => {
  const beads = rain.beads.filter((b) => third(b.y) === where);
  return beads.reduce((sum, b) => sum + b.r, 0) / beads.length;
};

test("rain on his window glass: every bead lies wholly on the clear glass, and no two beads overlap (touching beads run together into one)", () => {
  for (const b of rain.beads) {
    expect(Math.abs(b.x) + b.r).toBeLessThanOrEqual(pane.w / 2);
    expect(Math.abs(b.y) + b.r).toBeLessThanOrEqual(pane.h / 2);
  }
  const byX = [...rain.beads].sort((p, q) => p.x - q.x);
  const overlapping = byX.flatMap((a, i) => {
    const near: (typeof a)[] = [];
    for (let j = i + 1; j < byX.length && byX[j].x - a.x < 2 * GLASS_RAIN.radius[1]; j++)
      if (Math.hypot(a.x - byX[j].x, a.y - byX[j].y) < a.r + byX[j].r) near.push(byX[j]);
    return near;
  });
  expect(overlapping).toEqual([]);
});

test("steady rain has speckled the glass: the beads cover about a tenth of it", () => {
  const covered = rain.beads.reduce((sum, b) => sum + Math.PI * b.r ** 2, 0) / (pane.w * pane.h);
  expect(covered).toBeGreaterThan(0.06);
  expect(covered).toBeLessThan(0.2);
});

test("beads are small, a millimetre or two, and grow toward the bottom of the pane where running drops have gathered them", () => {
  for (const b of rain.beads) {
    expect(b.r).toBeGreaterThanOrEqual(GLASS_RAIN.radius[0]);
    expect(b.r).toBeLessThanOrEqual(GLASS_RAIN.radius[1]);
  }
  expect(GLASS_RAIN.radius[1]).toBeLessThanOrEqual(0.003);
  expect(meanRadius("bottom")).toBeGreaterThan(meanRadius("top") * 1.2);
});

test("a few drops have run down the glass: each track only goes down, wanders a little, ends in a fat drop, and has swept every bead out of its way, between its points as well as at them", () => {
  expect(rain.runs.length).toBeGreaterThanOrEqual(2);
  expect(rain.runs.length).toBeLessThanOrEqual(4);
  for (const run of rain.runs) {
    const ys = run.path.map(([, y]) => y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThan(ys[i - 1]);
    const xs = run.path.map(([x]) => x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.005);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.08);
    for (const [x, y] of run.path) {
      expect(Math.abs(x) + run.width).toBeLessThanOrEqual(pane.w / 2);
      expect(Math.abs(y)).toBeLessThanOrEqual(pane.h / 2);
    }
    expect(run.end.r).toBeGreaterThan(Math.max(...rain.beads.map((b) => b.r)));
    const [endX, endY] = run.path[run.path.length - 1];
    expect(Math.hypot(run.end.x - endX, run.end.y - endY)).toBeLessThan(run.end.r);
    const inTheWay = rain.beads.filter((b) =>
      run.path.slice(1).some((to, i) => distanceToSegment([b.x, b.y], run.path[i], to) < b.r + run.width),
    );
    expect(inTheWay).toEqual([]);
  }
});

test("water stands in a thin line along the bottom seal of the glass", () => {
  expect(rain.seal).toBeGreaterThan(0.001);
  expect(rain.seal).toBeLessThan(0.006);
});

test("the same glass every frame: the drops are laid out once, from a fixed seed", () => {
  expect(glassRain(pane)).toEqual(rain);
});

test("each bead shows the view upside down, as a drop on a pane does: its dark rim lies on its upper side (the street below seen through it), its light side below (the sky)", () => {
  const [from, to] = BEAD_RIM;
  for (let k = 0; k <= 10; k++) expect(Math.sin(from + ((to - from) * k) / 10), "canvas y grows downward").toBeLessThan(0);
});
