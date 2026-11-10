import { CatmullRomCurve3, Euler, Matrix4, Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { BROW_INK, browLine } from "./face";
import { HEAD_SIZE, facePoint } from "./headShape";
import {
  EYE,
  eyeFrame,
  eyeLids,
  eyeTurn,
  lidCovers,
  irisGeometry,
  pupilDirection,
  turnEuler,
  upperEdgeAt,
} from "./eyeShape";
import { KAREN_SKELETON as K } from "./rig";
import { luminance } from "../toon/colourChecks";

const SIDES = [1, -1] as const;
const ANGERS = [0, 0.5, 1];
const LIMIT = EYE.turn;
const GAZES = [-1, -0.5, 0, 0.5, 1].flatMap((u) =>
  [-1, -0.5, 0, 0.5, 1].map((v) => [u * LIMIT.yaw, v * LIMIT.pitch] as const),
);

const insideHead = (p: Vector3) =>
  (p.x / HEAD_SIZE[0]) ** 2 +
    (p.y / HEAD_SIZE[1]) ** 2 +
    (p.z / HEAD_SIZE[2]) ** 2 <
  1;

const centreOf = (side: 1 | -1) =>
  new Vector3().setFromMatrixPosition(eyeFrame(side));

const forwardOf = (side: 1 | -1) =>
  new Vector3(0, 0, 1).transformDirection(eyeFrame(side));

describe("her eyes are eyeballs, not black buttons", () => {
  test("a white ball set into her head: mostly inside it, its front standing out of the skin", () => {
    for (const side of SIDES) {
      const centre = centreOf(side);
      expect(insideHead(centre), `side ${side}`).toBe(true);
      const front = centre.clone().addScaledVector(forwardOf(side), EYE.radius);
      expect(insideHead(front), `side ${side} front`).toBe(false);
      const back = centre.clone().addScaledVector(forwardOf(side), -EYE.radius);
      expect(insideHead(back), `side ${side} back`).toBe(true);
      expect(Math.sign(centre.x)).toBe(side);
    }
    expect(EYE.sink).toBeGreaterThan(0.4);
    expect(EYE.sink).toBeLessThan(0.7);
  });

  test("white sclera, a coloured iris about half the eye wide with a darker rim, and a small black pupil", () => {
    expect(luminance(EYE.colours.sclera)).toBeGreaterThan(0.9);
    expect(luminance(EYE.colours.pupil)).toBeLessThan(0.05);
    const iris = luminance(EYE.colours.iris);
    expect(iris).toBeGreaterThan(0.15);
    expect(iris).toBeLessThan(0.75);
    expect(luminance(EYE.colours.limbus)).toBeLessThan(iris);
    expect(Math.sin(EYE.iris)).toBeGreaterThan(0.4);
    expect(Math.sin(EYE.iris)).toBeLessThan(0.6);
    expect(EYE.pupil).toBeLessThan(0.45 * EYE.iris);
  });

  test("the lids are skin over the ball: a shell just outside it", () => {
    expect(EYE.lid).toBeGreaterThan(1.03);
    expect(EYE.lid).toBeLessThan(1.12);
  });
});

describe("the eyes look where she looks, together", () => {
  const inHead = (side: 1 | -1, local: Vector3) =>
    local.clone().transformDirection(eyeFrame(side));

  test("looking straight ahead, both pupils point straight forward and parallel, never wall-eyed", () => {
    for (const side of SIDES) {
      const d = inHead(side, pupilDirection(eyeTurn(0, 0)));
      expect(d.angleTo(new Vector3(0, 0, 1)), `side ${side}`).toBeLessThan(
        1e-6,
      );
    }
    for (const [yaw, pitch] of GAZES) {
      const turn = eyeTurn(yaw, pitch);
      const left = inHead(1, pupilDirection(turn));
      const right = inHead(-1, pupilDirection(turn));
      expect(left.angleTo(right)).toBeLessThan(1e-6);
    }
  });

  test("the whole pupil stays on the part of the ball that stands out of her skin, wherever she looks", () => {
    for (const side of SIDES) {
      const centre = centreOf(side);
      for (const [yaw, pitch] of GAZES) {
        const turn = turnEuler(eyeTurn(yaw, pitch));
        for (let i = 0; i < 12; i++) {
          const a = (2 * Math.PI * i) / 12;
          const rim = new Vector3(
            Math.sin(EYE.pupil) * Math.cos(a),
            Math.sin(EYE.pupil) * Math.sin(a),
            Math.cos(EYE.pupil),
          )
            .applyEuler(turn)
            .transformDirection(eyeFrame(side));
          const p = centre.clone().addScaledVector(rim, EYE.radius);
          expect(
            insideHead(p),
            `side ${side}, gaze (${yaw.toFixed(2)}, ${pitch.toFixed(2)})`,
          ).toBe(false);
        }
      }
    }
  });

  test("iris and pupil are one disc lying on the ball: no part of it dips into the white, and the bands don't overlap", () => {
    const disc = irisGeometry();
    const position = disc.getAttribute("position");
    let lowest = Infinity;
    for (let i = 0; i < position.count; i += 3) {
      const a = new Vector3().fromBufferAttribute(position, i);
      const b = new Vector3().fromBufferAttribute(position, i + 1);
      const c = new Vector3().fromBufferAttribute(position, i + 2);
      for (const p of [
        a.clone().add(b).add(c).divideScalar(3),
        a.clone().add(b).multiplyScalar(0.5),
        b.clone().add(c).multiplyScalar(0.5),
        c.clone().add(a).multiplyScalar(0.5),
      ])
        lowest = Math.min(lowest, p.length());
    }
    expect(lowest).toBeGreaterThan(EYE.radius * 1.0005);
    expect(lowest).toBeLessThan(EYE.radius * 1.01);
    const colours = disc.getAttribute("color");
    expect(colours.count).toBe(position.count);
  });
});

describe("the eyes follow her gaze", () => {
  test("both pupils turn the same way she looks, up to the eyes' limits", () => {
    const right = pupilDirection(eyeTurn(0.3, 0));
    expect(right.x).toBeGreaterThan(0.25);
    const up = pupilDirection(eyeTurn(0, 0.3));
    expect(up.y).toBeGreaterThan(0.25);
    const down = pupilDirection(eyeTurn(0, -0.3));
    expect(down.y).toBeLessThan(-0.25);
    expect(eyeTurn(5, 0).yaw).toBeCloseTo(LIMIT.yaw, 9);
    expect(eyeTurn(0, -5).pitch).toBeCloseTo(-LIMIT.pitch, 9);
    const far = eyeTurn(5, -5);
    expect(
      Math.hypot(far.yaw / LIMIT.yaw, far.pitch / LIMIT.pitch),
    ).toBeCloseTo(1, 9);
    expect(far.yaw).toBeGreaterThan(0);
    expect(far.pitch).toBeLessThan(0);
  });

  test("the lids ride up and down with the gaze, as real lids do", () => {
    for (const side of SIDES) {
      const at = (pitch: number) => upperEdgeAt(eyeLids(side, 1, 0, pitch), 0);
      expect(at(LIMIT.pitch)).toBeGreaterThan(at(0));
      expect(at(0)).toBeGreaterThan(at(-LIMIT.pitch));
    }
  });
});

describe("angry eyes", () => {
  test("anger slants each upper lid down toward her nose", () => {
    for (const side of SIDES) {
      const calm = eyeLids(side, 0, 0, 0);
      const angry = eyeLids(side, 1, 0, 0);
      const inner = -side * 0.7;
      const outer = side * 0.7;
      expect(upperEdgeAt(calm, inner)).toBeCloseTo(upperEdgeAt(calm, outer), 9);
      expect(
        upperEdgeAt(angry, outer) - upperEdgeAt(angry, inner),
      ).toBeGreaterThan(0.3);
    }
  });

  test("anger narrows the eye: the lids close in from above and below", () => {
    for (const side of SIDES) {
      const opening = (anger: number) => {
        const lids = eyeLids(side, anger, 0, 0);
        return upperEdgeAt(lids, 0) - lids.lower.height;
      };
      expect(opening(1)).toBeLessThan(0.75 * opening(0));
      expect(eyeLids(side, 1, 0, 0).lower.height).toBeGreaterThan(
        eyeLids(side, 0, 0, 0).lower.height,
      );
    }
  });

  test("with her eyes open, no lid ever hides a pupil, wherever she looks and however angry", () => {
    const problems: string[] = [];
    for (const side of SIDES)
      for (const anger of ANGERS)
        for (const [yaw, pitch] of GAZES) {
          const turn = eyeTurn(yaw, pitch);
          if (
            lidCovers(eyeLids(side, anger, 0, turn.pitch), pupilDirection(turn))
          )
            problems.push(
              `side ${side}, anger ${anger}, gaze (${yaw.toFixed(2)}, ${pitch.toFixed(2)})`,
            );
        }
    expect(problems.slice(0, 6)).toEqual([]);
  });

  test("looking straight ahead, the whole pupil shows, with white on both sides of the iris", () => {
    for (const side of SIDES)
      for (const anger of ANGERS) {
        const lids = eyeLids(side, anger, 0, 0);
        for (let i = 0; i < 24; i++) {
          const a = (2 * Math.PI * i) / 24;
          const rim = new Vector3(0, 0, 1).applyEuler(
            new Euler(EYE.pupil * Math.sin(a), EYE.pupil * Math.cos(a), 0),
          );
          expect(lidCovers(lids, rim), `pupil rim at ${i}`).toBe(false);
        }
        for (const way of [1, -1]) {
          const white = new Vector3(0, 0, 1).applyEuler(
            new Euler(0, way * (EYE.iris + 0.12), 0),
          );
          expect(
            lidCovers(lids, white),
            `white, side ${side}, anger ${anger}`,
          ).toBe(false);
        }
      }
  });

  test("a blink shuts each eye completely", () => {
    for (const side of SIDES)
      for (const anger of ANGERS)
        for (const pitch of [-LIMIT.pitch, 0, LIMIT.pitch]) {
          const lids = eyeLids(side, anger, 1, pitch);
          for (let i = 0; i <= 20; i++)
            for (let j = 0; j <= 20; j++) {
              const x = -1 + i / 10;
              const y = -1 + j / 10;
              if (x * x + y * y > 0.95) continue;
              const d = new Vector3(x, y, Math.sqrt(1 - x * x - y * y));
              expect(
                lidCovers(lids, d),
                `side ${side}, anger ${anger}, pitch ${pitch}, (${x.toFixed(1)}, ${y.toFixed(1)})`,
              ).toBe(true);
            }
        }
  });
});

describe("the eyes keep clear of her other features", () => {
  const lidRadius = EYE.radius * EYE.lid;

  test("her brows and their ink stay off the eyelids, however angry", () => {
    for (const side of SIDES)
      for (const anger of ANGERS) {
        const curve = new CatmullRomCurve3(
          browLine(side, anger).map(([x, y]) => facePoint(x, y, BROW_INK.lift)),
        );
        const centre = centreOf(side);
        for (const p of curve.getSpacedPoints(60))
          expect(
            p.distanceTo(centre),
            `side ${side}, anger ${anger}`,
          ).toBeGreaterThan(lidRadius + BROW_INK.radius);
      }
  });

  test("no lock of her fringe hangs into her eyes", () => {
    for (const lock of K.hair.filter((h) => h.name === "fringe")) {
      const toLock = new Matrix4()
        .makeRotationFromEuler(new Euler(...lock.rotation))
        .setPosition(...lock.center)
        .invert();
      for (const side of SIDES) {
        const centre = centreOf(side).add(new Vector3(...K.headCenter));
        for (let i = 0; i < 200; i++) {
          const u = new Vector3(
            Math.sin(i * 2.4) * Math.sqrt(1 - ((i + 0.5) / 200) ** 2),
            1 - (2 * (i + 0.5)) / 200,
            Math.cos(i * 2.4) * Math.sqrt(1 - ((i + 0.5) / 200) ** 2),
          );
          const p = centre
            .clone()
            .addScaledVector(u.normalize(), lidRadius)
            .applyMatrix4(toLock);
          const inside =
            (p.x / lock.size[0]) ** 2 +
            (p.y / lock.size[1]) ** 2 +
            (p.z / lock.size[2]) ** 2;
          expect(inside).toBeGreaterThan(1);
        }
      }
    }
  });
});

test("the iris carries outward normals, so it is lit like the eyeball and darkens with the scene", () => {
  const geometry = irisGeometry();
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  expect(normal).toBeDefined();
  for (let i = 0; i < position.count; i++) {
    const p = new Vector3(position.getX(i), position.getY(i), position.getZ(i));
    const n = new Vector3(normal.getX(i), normal.getY(i), normal.getZ(i));
    expect(n.length()).toBeCloseTo(1, 6);
    expect(n.dot(p.normalize())).toBeGreaterThan(0.999);
  }
});
