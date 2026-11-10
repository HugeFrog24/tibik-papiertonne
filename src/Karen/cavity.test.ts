import { Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { boxGap, obbCorners } from "../physics/collision";
import {
  CAVITY,
  pocketAt,
  pocketGeometry,
  teethAt,
  toothObb,
  tongueAt,
} from "./cavity";
import { insideMouth, mouthShape } from "./face";
import { HEAD_SIZE } from "./headShape";
import { insideNose } from "./noseShape";
import { KAREN_SKELETON as K } from "./rig";

const tongueSurface = (
  tongue: { readonly center: Vector3; readonly size: readonly number[] },
  rings: readonly number[],
) =>
  Array.from({ length: 64 }, (_, i) => (i / 64) * Math.PI * 2).flatMap((a) =>
    rings.map((v) => {
      const r = Math.sqrt(1 - v * v);
      return tongue.center
        .clone()
        .add(
          new Vector3(
            tongue.size[0] * r * Math.cos(a),
            tongue.size[1] * v,
            tongue.size[2] * r * Math.sin(a),
          ),
        );
    }),
  );

const OPENINGS = [CAVITY.minOpen, 0.1, 0.25, 0.5, 0.75, 1];

const underSkin = (p: Vector3, margin = 0.0003) => {
  const [a, b, c] = HEAD_SIZE;
  return (
    (p.x / (a - margin)) ** 2 +
      (p.y / (b - margin)) ** 2 +
      (p.z / (c - margin)) ** 2 <
    1
  );
};

const jowls = [1, -1].map((side) => ({
  center: new Vector3(
    side * K.jowl.center[0] - K.headCenter[0],
    K.jowl.center[1] - K.headCenter[1],
    K.jowl.center[2] - K.headCenter[2],
  ),
  size: K.jowl.size,
}));

const insideJowl = (p: Vector3) =>
  jowls.some(
    ({ center, size }) =>
      ((p.x - center.x) / size[0]) ** 2 +
        ((p.y - center.y) / size[1]) ** 2 +
        ((p.z - center.z) / size[2]) ** 2 <
      1,
  );

const wallAt = (open: number) => {
  const { points } = pocketAt(open);
  return (x: number, y: number) => {
    let best = points[0][0];
    for (const column of points)
      for (const p of column)
        if (Math.hypot(p.x - x, p.y - y) < Math.hypot(best.x - x, best.y - y))
          best = p;
    return best.z;
  };
};

const toothPoints = (open: number) =>
  teethAt(open).flatMap((tooth) => {
    const box = toothObb(tooth);
    const faces = box.axes.flatMap((axis, i) =>
      [1, -1].map((s) =>
        box.center.clone().addScaledVector(axis, s * box.half[i]),
      ),
    );
    return [...obbCorners(box), ...faces].map((p) => ({ tooth, p }));
  });

describe("her open mouth is a hole into a cavity, not a painted patch", () => {
  test("the skin opens exactly where her lips part, and stays shut when her mouth is closed", () => {
    for (const open of OPENINGS) {
      const { top, bottom } = mouthShape(open);
      for (let i = 2; i < top.length - 2; i++) {
        const [x, yTop] = top[i];
        const [, yBottom] = bottom[i];
        if (yTop - yBottom < 0.002) continue;
        expect(insideMouth(x, (yTop + yBottom) / 2, open), `open ${open}`).toBe(
          true,
        );
        expect(insideMouth(x, yTop + 0.001, open)).toBe(false);
        expect(insideMouth(x, yBottom - 0.001, open)).toBe(false);
      }
    }
    expect(insideMouth(0, mouthShape(0).top[12][1] - 0.001, 0)).toBe(false);
    expect(insideMouth(0, -0.088, CAVITY.minOpen / 2)).toBe(false);
  });

  test("the pocket seals the hole from inside: its rim runs just outside the opening, under the skin, all the way round", () => {
    for (const open of OPENINGS) {
      const rows = pocketAt(open).points;
      const rim = [
        ...rows.map((column) => column[0]),
        ...rows.map((column) => column[column.length - 1]),
      ];
      for (const p of rim) {
        expect(insideMouth(p.x, p.y, open), `open ${open}`).toBe(false);
        expect(underSkin(p, 0)).toBe(true);
      }
      const { top, bottom } = mouthShape(open);
      rows.forEach((column, i) => {
        expect(column[0].y - top[i][1]).toBeGreaterThan(0);
        expect(column[0].y - top[i][1]).toBeLessThan(CAVITY.rim * 2);
        expect(bottom[i][1] - column[column.length - 1].y).toBeGreaterThan(0);
      });
    }
  });

  test("the pocket goes well back into her head, the same depth however little she opens, and never pokes out of it, into her jowls or into her nose", () => {
    for (const open of OPENINGS) {
      const { points } = pocketAt(open);
      const front = points[12][0].z;
      const deepest = Math.min(...points[12].map((p) => p.z));
      expect(front - deepest, `open ${open}`).toBeGreaterThan(0.025);
      for (const column of points)
        for (const p of column.slice(1, -1)) {
          expect(underSkin(p), `open ${open}`).toBe(true);
          expect(insideJowl(p), `open ${open}`).toBe(false);
          expect(insideNose(p), `open ${open}`).toBe(false);
        }
    }
  });
});

describe("both rows of individual 3D teeth", () => {
  test("ten upper and ten lower teeth, mirrored, each standing apart from its neighbour", () => {
    const teeth = teethAt(1);
    for (const row of ["upper", "lower"] as const) {
      const rowTeeth = teeth.filter((t) => t.row === row);
      expect(rowTeeth).toHaveLength(10);
      for (const t of rowTeeth) {
        const twin = rowTeeth.find(
          (m) => m.index === t.index && m.side === -t.side,
        )!;
        expect(twin.center.x).toBeCloseTo(-t.center.x, 9);
        expect(twin.center.y).toBeCloseTo(t.center.y, 9);
      }
      const ordered = [...rowTeeth].sort((a, b) => a.center.x - b.center.x);
      for (let i = 0; i + 1 < ordered.length; i++)
        expect(
          boxGap(toothObb(ordered[i]), toothObb(ordered[i + 1])),
          `${ordered[i].name} to ${ordered[i + 1].name}`,
        ).toBeGreaterThan(0.0003);
    }
    const front = teeth.find((t) => t.row === "upper" && t.index === 0)!;
    const lateral = teeth.find((t) => t.row === "upper" && t.index === 1)!;
    expect(front.size[0]).toBeGreaterThan(lateral.size[0]);
  });

  test("the upper teeth stay fixed to her skull; the lower teeth ride down with her jaw", () => {
    const shut = teethAt(0.1);
    const wide = teethAt(1);
    for (const t of wide) {
      const before = shut.find((s) => s.name === t.name)!;
      if (t.row === "upper")
        expect(t.center.distanceTo(before.center), t.name).toBeLessThan(1e-9);
      else expect(t.center.y, t.name).toBeLessThan(before.center.y - 0.01);
    }
  });

  test("no tooth ever pokes out through her skin, her jowls or her nose", () => {
    for (const open of OPENINGS)
      for (const { tooth, p } of toothPoints(open)) {
        expect(underSkin(p), `open ${open}: ${tooth.name}`).toBe(true);
        expect(insideJowl(p), `open ${open}: ${tooth.name}`).toBe(false);
        expect(insideNose(p), `open ${open}: ${tooth.name}`).toBe(false);
      }
  });

  test("the rows never bite into each other, however little she opens: the uppers close in front of the lowers", () => {
    for (const open of OPENINGS) {
      const teeth = teethAt(open);
      const upper = teeth.filter((t) => t.row === "upper").map(toothObb);
      const lower = teeth.filter((t) => t.row === "lower").map(toothObb);
      for (const u of upper)
        for (const l of lower)
          expect(
            boxGap(u, l),
            `open ${open}: ${u.name} / ${l.name}`,
          ).toBeGreaterThan(0);
    }
  });

  test("wide open, the front teeth show: each tip lies inside the opening and in front of the pocket's back wall", () => {
    const open = 1;
    const wall = wallAt(open);
    for (const tooth of teethAt(open).filter((t) => t.index <= 2)) {
      const box = toothObb(tooth);
      const toward = tooth.row === "upper" ? -1 : 1;
      const tip = box.center
        .clone()
        .addScaledVector(box.axes[1], toward * box.half[1] * 0.8);
      expect(insideMouth(tip.x, tip.y, open), tooth.name).toBe(true);
      expect(tip.z, tooth.name).toBeGreaterThan(wall(tip.x, tip.y));
    }
  });
});

describe("the tongue", () => {
  test("lies on the floor of the pocket, behind the lower teeth, inside her head; wide open its top shows above them", () => {
    for (const open of OPENINGS) {
      const tongue = tongueAt(open);
      const teeth = teethAt(open)
        .filter((t) => t.row === "lower")
        .map(toothObb);
      for (const p of tongueSurface(tongue, [-0.7, 0, 0.7])) {
        expect(underSkin(p), `open ${open}`).toBe(true);
        expect(insideJowl(p), `open ${open}`).toBe(false);
      }
      const inTooth = (p: Vector3) =>
        teeth.find((box) =>
          box.axes.every(
            (axis, k) =>
              Math.abs(p.clone().sub(box.center).dot(axis)) < box.half[k],
          ),
        );
      for (const p of tongueSurface(tongue, [-0.9, -0.5, 0, 0.5, 0.9]))
        expect(inTooth(p)?.name, `open ${open}`).toBeUndefined();
      const front = teeth.find((t) => t.name.includes('central'))!;
      expect(tongue.center.z).toBeLessThan(front.center.z);
    }
    const wide = tongueAt(1);
    const tips = teethAt(1)
      .filter((t) => t.row === "lower")
      .map((t) => {
        const box = toothObb(t);
        return box.center.y + box.half[1];
      });
    expect(wide.center.y + wide.size[1]).toBeGreaterThan(Math.max(...tips));
    const crown = wide.center
      .clone()
      .add(new Vector3(0, wide.size[1] * 0.9, 0));
    expect(insideMouth(crown.x, crown.y, 1)).toBe(true);
    const wall = wallAt(1);
    const shown = [-0.5, 0, 0.5].filter((across) => {
      const p = crown
        .clone()
        .add(new Vector3(across * wide.size[0], 0, 0.3 * wide.size[2]));
      return p.z > wall(p.x, p.y);
    });
    expect(shown.length).toBe(3);
  });
});

test("the mouth pocket carries unit normals, so the lit material shades it instead of dropping it", () => {
  const opens = Array.from(
    { length: 101 },
    (_, i) => CAVITY.minOpen + ((1 - CAVITY.minOpen) * i) / 100,
  );
  for (const open of opens) {
    const normals = pocketGeometry(open).getAttribute("normal");
    expect(normals).toBeDefined();
    for (let i = 0; i < normals.count; i++)
      expect(
        Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)),
      ).toBeCloseTo(1, 6);
  }
});
