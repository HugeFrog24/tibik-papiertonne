import { Vector3 } from "three";
import { expect, test } from "vitest";
import { letterPanels } from "./letterShape";
import { PAPER, panelGeometry } from "./Letter";

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
