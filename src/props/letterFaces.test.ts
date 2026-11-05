import { Vector3 } from "three";
import { expect, test } from "vitest";
import { letterPanels } from "./letterShape";
import { PAPER, bowOf, panelGeometry } from "./Letter";

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
