import { Vector3 } from "three";
import { expect, test } from "vitest";
import { A4, letterPanels, paperSpotsAt } from "./letterShape";
import { PAPER, bowOf, letterPixels, panelGeometry, paperSpotGeometry, spotOnPanel } from "./Letter";
import { WET } from "../Karen/WetSpot";

test("the letter's back is a front-facing sheet of its own, its normals pointing away from the text, so the ink pass sees the paper from behind too", () => {
  for (const panel of letterPanels(1)) {
    const back = panelGeometry(panel, -PAPER.face, true);
    const normals = back.getAttribute("normal");
    for (let i = 0; i < normals.count; i++) expect(normals.getZ(i)).toBeLessThan(-0.99);
    const index = back.getIndex()!;
    const position = back.getAttribute("position");
    const at = (k: number) => new Vector3().fromBufferAttribute(position, index.getX(k));
    for (let k = 0; k < index.count; k += 3) {
      const face = at(k + 1).sub(at(k)).cross(at(k + 2).sub(at(k)));
      expect(face.z).toBeLessThan(0);
    }
    const front = panelGeometry(panel, PAPER.face, false).getAttribute("normal");
    for (let i = 0; i < front.count; i++) expect(front.getZ(i)).toBeGreaterThan(0.99);
  }
});

test("folded, the sheet is pressed flat: it only bows once it is opened out, so no outer panel bulges in front of the middle one", () => {
  expect(bowOf(0)).toBe(0);
  expect(bowOf(0.5)).toBe(0);
  expect(bowOf(1)).toBe(1);
  for (const panel of letterPanels(0)) {
    const position = panelGeometry(panel, PAPER.face, false, bowOf(0)).getAttribute("position");
    for (let i = 0; i < position.count; i++) expect(Math.abs(position.getZ(i) - PAPER.face)).toBeLessThan(1e-9);
  }
  const open = panelGeometry(letterPanels(1)[1], PAPER.face, false, bowOf(1)).getAttribute("position");
  expect(Math.max(...Array.from({ length: open.count }, (_, i) => open.getZ(i))) - PAPER.face).toBeGreaterThan(0.0015);
});

const paperHeight = (panel: ReturnType<typeof letterPanels>[number], bow: number) => {
  const position = panelGeometry(panel, PAPER.face, false, bow).getAttribute("position");
  const row = Array.from({ length: position.count }, (_, i) => [position.getX(i), position.getZ(i)] as const)
    .filter(([, ], i) => Math.abs(position.getY(i) - position.getY(0)) < 1e-12)
    .sort((a, b) => a[0] - b[0]);
  return (x: number) => {
    const k = Math.min(row.length - 2, Math.max(0, row.findIndex(([rx]) => rx > x) - 1));
    const [x0, z0] = row[k];
    const [x1, z1] = row[k + 1];
    return z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
  };
};

test("the rain spots lie on the bowed sheet: every point of a spot sits just above the paper, never under it", () => {
  const spots = paperSpotsAt(40, 0);
  for (const bow of [0, 0.5, 1]) {
    for (const panel of letterPanels(1)) {
      const z = paperHeight(panel, bow);
      for (const spot of spots.filter((s) => spotOnPanel(s, panel))) {
        const g = paperSpotGeometry(spot, panel, bow);
        const p = g.getAttribute("position");
        const index = g.getIndex();
        const corners = index ? Array.from({ length: index.count }, (_, k) => index.getX(k)) : Array.from({ length: p.count }, (_, i) => i);
        for (let k = 0; k < corners.length; k += 3) {
          const tri = [0, 1, 2].map((j) => new Vector3().fromBufferAttribute(p, corners[k + j]));
          const points = [...tri, tri[0].clone().lerp(tri[1], 0.5), tri[1].clone().lerp(tri[2], 0.5), tri[2].clone().lerp(tri[0], 0.5)];
          for (const q of points) {
            const above = q.z - z(q.x);
            expect(above, `bow ${bow}, spot at ${spot.u.toFixed(3)},${spot.v.toFixed(3)}`).toBeGreaterThan(PAPER.spotLift * 0.5);
            expect(above).toBeLessThan(PAPER.spotLift * 1.5);
          }
        }
      }
    }
  }
});

test("a spot's rim is round: the polygon strays less than 1% of the radius from the circle", () => {
  expect(1 - Math.cos(Math.PI / WET.segments)).toBeLessThan(0.01);
});

test("a spot over a crease is drawn on both panels, each part staying on its own panel", () => {
  const [top, middle] = letterPanels(1);
  const spot = { u: 0.5, v: middle.fromTop / A4[1], r: 0.003 };
  expect(spotOnPanel(spot, top)).toBe(true);
  expect(spotOnPanel(spot, middle)).toBe(true);
  for (const panel of [top, middle]) {
    const p = paperSpotGeometry(spot, panel, 1).getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      expect(p.getY(i)).toBeGreaterThanOrEqual(-1e-9);
      expect(p.getY(i)).toBeLessThanOrEqual(panel.size[1] + 1e-9);
    }
  }
});

test("the letter is painted as finely as the render needs: 10,000 px a metre at 1080p, twice that above it, so a zoomed or retina preview never piles up textures of every density", () => {
  expect(letterPixels(1)).toEqual({ perMetre: PAPER.pxPerMetre, size: [2100, 2970] });
  expect(letterPixels(2)).toEqual({ perMetre: 2 * PAPER.pxPerMetre, size: [4200, 5940] });
  expect(letterPixels(3)).toEqual(letterPixels(2));
  expect(letterPixels(0.5)).toEqual(letterPixels(1));
  expect(letterPixels(1.5)).toEqual(letterPixels(2));
  expect(new Set([1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((ratio) => letterPixels(ratio).perMetre)).size).toBe(2);
});
