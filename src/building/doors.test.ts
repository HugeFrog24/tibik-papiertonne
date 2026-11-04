import { Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { boxGap } from "../physics/collision";
import { FACADE_Z } from "../street/building";
import { HAUSTUER } from "../street/facade";
import {
  LEVER,
  PLATE,
  PROFILE,
  BUNTBART,
  VIEWER,
  doorFrame,
  doorLeaf,
  doorSolids,
  fittingSolids,
  gripSolid,
  gripSolids,
  leverParts,
  leverPath,
  keyOf,
  leverPivot,
  lockOf,
  profileOutline,
  viewerLens,
  viewerOf,
  type Door,
} from "./doors";
import { CORE, FLAT_DOORS, LIFT_DOORS, TIBIK_DOOR } from "./stairwell";
import { LIVING_DOOR } from "./livingRoomShape";

const ANGLES = Array.from({ length: 17 }, (_, i) => i * 0.1);

const sitsOnTheLeaf = (door: Door, side: "inner" | "outer") => {
  const lever = door.grips.find((g) => g.side === side)?.shape === "lever";
  for (const a of ANGLES) {
    const touching = lever
      ? leverParts(door, a, side).mount
      : gripSolid(door, a, side);
    const gap = boxGap(touching, doorLeaf(door, a));
    expect(gap, `${door.name} ${side} at ${a.toFixed(1)} rad`).toBeGreaterThan(
      -1e-9,
    );
    expect(gap, `${door.name} ${side} at ${a.toFixed(1)} rad`).toBeLessThan(
      0.04,
    );
  }
};

describe("door handles", () => {
  test("his flat door: a lever on the flat side, a knob on the landing side", () => {
    expect(gripSolid(TIBIK_DOOR, 0, "inner").center.x).toBeLessThan(
      TIBIK_DOOR.hinge[0] - TIBIK_DOOR.thickness / 2,
    );
    expect(gripSolid(TIBIK_DOOR, 0, "outer").center.x).toBeGreaterThan(CORE.x0);
    expect(TIBIK_DOOR.grips.find((g) => g.side === "outer")?.shape).toBe(
      "knob",
    );
    expect(TIBIK_DOOR.grips.find((g) => g.side === "inner")?.shape).toBe(
      "lever",
    );
  });

  test("the Haustür: a lever inside, a pull bar outside", () => {
    expect(gripSolid(HAUSTUER, 0, "inner").center.z).toBeLessThan(
      HAUSTUER.hinge[2] - HAUSTUER.thickness / 2,
    );
    expect(gripSolid(HAUSTUER, 0, "outer").center.z).toBeGreaterThan(
      HAUSTUER.hinge[2],
    );
    expect(gripSolid(HAUSTUER, 0, "outer").center.z).toBeLessThan(
      FACADE_Z + 0.2,
    );
    expect(HAUSTUER.grips.find((g) => g.side === "outer")?.shape).toBe("bar");
  });

  test("handles sit on the leaf, not in it, at any angle", () => {
    for (const door of [TIBIK_DOOR, HAUSTUER]) {
      sitsOnTheLeaf(door, "inner");
      sitsOnTheLeaf(door, "outer");
    }
  });

  test("handles sit at the free edge, at hand height; a pull bar a little further in, clear of the key hand", () => {
    for (const door of [TIBIK_DOOR, HAUSTUER]) {
      for (const grip of door.grips) {
        expect(grip.center[0]).toBeGreaterThan(door.width - (grip.shape === "bar" ? 0.25 : 0.2));
        expect(grip.center[1]).toBeGreaterThan(0.95);
        expect(grip.center[1]).toBeLessThan(1.15);
      }
    }
  });

  test("lift doors have no handles", () => {
    for (const door of LIFT_DOORS) expect(door.grips).toEqual([]);
  });
});

const LEVER_DOORS: readonly Door[] = [
  ...FLAT_DOORS.map((f) => f.door),
  HAUSTUER,
];

describe("lever handles are L-shaped and stick out of the door", () => {
  test("every flat door and the Haustür have a lever inside; the outside knob and pull bar stay", () => {
    for (const door of LEVER_DOORS)
      expect(door.grips.find((g) => g.side === "inner")?.shape, door.name).toBe(
        "lever",
      );
    expect(TIBIK_DOOR.grips.find((g) => g.side === "outer")?.shape).toBe(
      "knob",
    );
    expect(HAUSTUER.grips.find((g) => g.side === "outer")?.shape).toBe("bar");
  });

  test("the inside plate sits on the face, the neck stands straight out of it, and the grip runs parallel to the door toward the hinge", () => {
    for (const door of LEVER_DOORS) {
      const { mount: plate, neck, bar } = leverParts(door, 0, "inner");
      const leaf = doorLeaf(door, 0);
      expect(boxGap(plate, leaf), `${door.name} plate`).toBeGreaterThan(-1e-9);
      expect(boxGap(plate, leaf), `${door.name} plate`).toBeLessThan(0.001);
      expect(boxGap(neck, plate), `${door.name} neck`).toBeLessThan(0.001);
      expect(boxGap(neck, bar), `${door.name} neck to grip`).toBeLessThan(
        0.001,
      );
      expect(boxGap(bar, leaf), `${door.name} grip`).toBeCloseTo(
        LEVER.projection - LEVER.radius,
        3,
      );
      const grip = door.grips.find((g) => g.side === "inner")!;
      expect(grip.size[0]).toBeCloseTo(LEVER.length, 9);
      expect(grip.center[0] + grip.size[0] / 2, door.name).toBeLessThan(
        door.width,
      );
    }
  });

  test("the bend and the tip are rounded, never a sharp corner", () => {
    const path = leverPath();
    for (let i = 1; i < path.length - 1; i++) {
      const a = path[i]
        .clone()
        .sub(path[i - 1])
        .normalize();
      const b = path[i + 1].clone().sub(path[i]).normalize();
      expect(a.angleTo(b), `turn at point ${i}`).toBeLessThan(0.2);
    }
    expect(path[0].z).toBeCloseTo(0, 9);
    expect(path[path.length - 1].z).toBeCloseTo(LEVER.projection, 9);
    expect(path[path.length - 1].x).toBeCloseTo(
      -(LEVER.length - LEVER.radius),
      9,
    );
    expect(LEVER.bend).toBeGreaterThan(LEVER.radius);
  });

  test("bodies meet the whole lever, not just its grip", () => {
    for (const door of LEVER_DOORS) {
      const names = gripSolids(door, 0).map((o) => o.name);
      expect(names.filter((n) => /lever/.test(n)).length, door.name).toBe(3);
    }
  });

  test("pressing turns the whole L about its spindle: the grip swings down, the neck stays put", () => {
    for (const door of [TIBIK_DOOR, HAUSTUER]) {
      const up = leverParts(door, 0, "inner", 0);
      const down = leverParts(door, 0, "inner", 0.5);
      expect(down.bar.center.y).toBeLessThan(up.bar.center.y - 0.02);
      expect(down.neck.center.distanceTo(up.neck.center)).toBeLessThan(1e-9);
    }
  });
});

describe("the lock: plates, cylinder and the handles mounted on them", () => {
  test("every lever door has a lock at its lever's spindle: the key 72 mm below the handle on flat and room doors, 92 mm on the Haustür", () => {
    for (const door of LEVER_DOORS) {
      const lock = lockOf(door)!;
      const grip = door.grips.find((g) => g.side === "inner")!;
      expect(lock.spindle[0], door.name).toBeCloseTo(
        grip.center[0] + grip.size[0] / 2,
        9,
      );
      expect(lock.spindle[1] - lock.hole[1], door.name).toBeCloseTo(
        keyOf(door).distance,
        9,
      );
    }
    expect(keyOf(TIBIK_DOOR)).toEqual({ shape: PROFILE, distance: 0.072 });
    expect(keyOf(HAUSTUER)).toEqual({ shape: PROFILE, distance: 0.092 });
    expect(keyOf(LIVING_DOOR)).toEqual({ shape: BUNTBART, distance: 0.072 });
  });

  test("flat doors carry a long plate on both faces, each holding the handle and the cylinder", () => {
    for (const { door } of FLAT_DOORS) {
      const leaf = doorLeaf(door, 0);
      const plates = fittingSolids(door, 0).filter((o) => /plate/.test(o.name));
      expect(plates.map((p) => p.name).sort(), door.name).toEqual([
        `${door.name} inner plate`,
        `${door.name} outer plate`,
      ]);
      for (const plate of plates) {
        expect(boxGap(plate, leaf), plate.name).toBeGreaterThan(-1e-9);
        expect(boxGap(plate, leaf), plate.name).toBeLessThan(0.001);
      }
    }
  });

  test("the outside knob sits on its plate, over the spindle", () => {
    for (const { door } of FLAT_DOORS) {
      const knob = gripSolid(door, 0, "outer");
      const plate = fittingSolids(door, 0).find((o) =>
        /outer plate/.test(o.name),
      )!;
      expect(boxGap(knob, plate), door.name).toBeLessThan(0.001);
      expect(boxGap(knob, plate), door.name).toBeGreaterThan(-1e-9);
      const grip = door.grips.find((g) => g.side === "outer")!;
      expect(
        Math.abs(grip.center[0] - lockOf(door)!.spindle[0]),
        door.name,
      ).toBeLessThan(PLATE.width / 2);
    }
  });

  test("the Haustür's pull bar stands on two posts and leaves room for a key at the cylinder rosette", () => {
    const leaf = doorLeaf(HAUSTUER, 0);
    const solids = fittingSolids(HAUSTUER, 0);
    const rosette = solids.find((o) => /rosette/.test(o.name))!;
    expect(boxGap(rosette, leaf)).toBeGreaterThan(-1e-9);
    expect(boxGap(rosette, leaf)).toBeLessThan(0.001);
    const bar = gripSolid(HAUSTUER, 0, "outer");
    expect(boxGap(bar, rosette)).toBeGreaterThan(0.02);
    const posts = gripSolids(HAUSTUER, 0).filter((o) => /post/.test(o.name));
    expect(posts).toHaveLength(2);
    for (const post of posts) {
      expect(boxGap(post, leaf), post.name).toBeLessThan(0.001);
      expect(boxGap(post, bar), post.name).toBeLessThan(0.001);
    }
  });

  test("the cylinder shows the Euro profile: a 17 mm round head over a tail, 33 mm tall", () => {
    const outline = profileOutline();
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(
      2 * PROFILE.radius,
      4,
    );
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(PROFILE.height, 4);
    expect(2 * PROFILE.radius).toBeCloseTo(0.017, 9);
    expect(PROFILE.height).toBeCloseTo(0.033, 9);
  });
});

describe("the whole drawn lever is solid", () => {
  test("every point of the drawn tube, bend included, lies inside the lever's bar, its neck or the plate it stands on", () => {
    const doors = [TIBIK_DOOR, HAUSTUER, LIVING_DOOR];
    for (const door of doors)
      for (const grip of door.grips.filter((g) => g.shape === "lever")) {
        const { bar, neck, elbow, mount } = leverParts(door, 0, grip.side);
        const [x, y, z] = leverPivot(grip);
        const out = Math.sign(z);
        const frame = doorFrame(door, 0);
        const path = leverPath();
        const inside = (p: Vector3) =>
          [bar, neck, elbow, mount].some((box) =>
            box.axes.every(
              (axis, k) =>
                Math.abs(p.clone().sub(box.center).dot(axis)) <=
                box.half[k] + 1e-4,
            ),
          );
        const outside: string[] = [];
        path.forEach((p, i) => {
          const along = path[Math.min(i + 1, path.length - 1)]
            .clone()
            .sub(path[Math.max(i - 1, 0)])
            .normalize();
          const side = new Vector3(0, 1, 0);
          const across = along.clone().cross(side).normalize();
          for (let k = 0; k < 16; k++) {
            const a = (2 * Math.PI * k) / 16;
            const q = p
              .clone()
              .addScaledVector(side, LEVER.radius * Math.cos(a))
              .addScaledVector(across, LEVER.radius * Math.sin(a));
            const local = new Vector3(
              x + q.x,
              y + q.y,
              out * (door.thickness / 2 + q.z),
            ).applyMatrix4(frame);
            if (!inside(local)) outside.push(`${door.name} ${grip.side} point ${i}`);
          }
        });
        expect([...new Set(outside)].slice(0, 4)).toEqual([]);
      }
  });
});

test("every part of every door has its own name, so a contact report says which side and which part", () => {
  for (const door of [...FLAT_DOORS.map((f) => f.door), HAUSTUER, LIVING_DOOR]) {
    const names = doorSolids(door, 0.3).map((o) => o.name);
    expect(names.length, door.name).toBe(new Set(names).size);
  }
});

describe("the door viewer (Türspion)", () => {
  test("every flat door has a viewer at eye height, centred across the leaf, in a 14 mm bore, its caps standing out of both faces", () => {
    for (const { door } of FLAT_DOORS) {
      const viewer = viewerOf(door)!;
      expect(viewer, door.name).not.toBeNull();
      expect(viewer.height + 0.01).toBeGreaterThanOrEqual(1.4);
      expect(viewer.height + 0.01).toBeLessThanOrEqual(1.6);
      expect(viewer.across).toBeCloseTo(door.width / 2, 9);
      expect(2 * VIEWER.bore).toBeCloseTo(0.014, 9);
      const leaf = doorLeaf(door, 0.2);
      const caps = fittingSolids(door, 0.2).filter((o) => /viewer/.test(o.name));
      expect(caps.map((c) => c.name).sort()).toEqual([
        `${door.name} inner viewer`,
        `${door.name} outer viewer`,
      ]);
      for (const cap of caps) {
        expect(boxGap(cap, leaf), cap.name).toBeGreaterThan(-1e-9);
        expect(boxGap(cap, leaf), cap.name).toBeLessThan(0.001);
      }
    }
    expect(viewerOf(HAUSTUER)).toBeNull();
    expect(viewerOf(LIVING_DOOR)).toBeNull();
  });

  test("the spyhole camera looks out from the outer viewer's lens, never from inside the door or the cap", () => {
    const lens = viewerLens(TIBIK_DOOR);
    const outer = fittingSolids(TIBIK_DOOR, 0).find((o) => /outer viewer/.test(o.name))!;
    const outward = lens.clone().sub(outer.center);
    expect(outward.length()).toBeGreaterThan(outer.half[2]);
    expect(outward.length()).toBeLessThan(outer.half[2] + 0.002);
  });
});

test("a door viewer is solid on any door that has one, whatever its handles", () => {
  const barred = { ...HAUSTUER, viewer: true };
  const names = fittingSolids(barred, 0).map((o) => o.name);
  expect(names).toContain(`${barred.name} outer viewer`);
  expect(names).toContain(`${barred.name} inner viewer`);
});
