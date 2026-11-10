import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { insideKarenHead, karenHeadMatrix, toKarenHead } from "./mouthEmitter";
import { KAREN_REST } from "./rig";

const STANDING = { position: [0.4, 0, -1.2] as [number, number, number], rotationY: 0.7, pose: KAREN_REST };

test("a point at the centre of her head is inside it; one a metre in front of her face is not", () => {
  const head = karenHeadMatrix(STANDING);
  const centre = new Vector3().applyMatrix4(head);
  const ahead = new Vector3(0, 0, 1).applyMatrix4(head);
  expect(insideKarenHead(centre, STANDING)).toBe(true);
  expect(insideKarenHead(ahead, STANDING)).toBe(false);
  expect(toKarenHead(ahead, STANDING).distanceTo(new Vector3(0, 0, 1))).toBeLessThan(1e-9);
  expect(new Matrix4().copy(head).determinant()).not.toBe(0);
});
