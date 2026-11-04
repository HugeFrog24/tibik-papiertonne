import { Vector3 } from "three";
import { expect, test } from "vitest";
import { boxGap, collide, contacts, obb, sphere } from "../physics/collision";
import { STOREYS, floorLevel } from "../street/building";
import { HAUSTUER } from "../street/facade";
import { doorSolids, type Door } from "./doors";
import {
  CORE,
  FLAT_DOORS,
  LIFT_DOORS,
  LIGHT_BUTTONS,
  NOTICE_BOARD,
  STAIRWELL_WALLS,
  SMOKE_VENT_BUTTON,
  SMOKE_VENT_BUTTONS,
  TREADS,
  buttonSolid,
  onTread,
  smokeVentSolid,
  stairwellSolids,
  wallFrame,
} from "./stairwell";

const out = (normal: readonly number[], by: number) =>
  new Vector3(normal[0], normal[1], normal[2]).multiplyScalar(by);

test("the smoke vent can be opened from the ground floor and from the top landing", () => {
  expect(SMOKE_VENT_BUTTONS.map((b) => b.storey).sort()).toEqual([
    0,
    STOREYS - 1,
  ]);
  for (const button of SMOKE_VENT_BUTTONS) {
    const floor = floorLevel(button.storey);
    const height = button.position[1] - floor;
    expect(height).toBeGreaterThanOrEqual(1.2);
    expect(height).toBeLessThanOrEqual(1.6);
    const front = new Vector3(...button.position).add(out(button.normal, 0.4));
    const under = TREADS.find(
      (t) => onTread(t, front.x, front.z) && Math.abs(t.top - floor) < 1e-9,
    );
    expect(under, button.name).toBeDefined();
  }
});

test("each button is the usual 126 × 126 × 32 mm box, its back flat against a staircase wall", () => {
  expect(SMOKE_VENT_BUTTON.size).toEqual([0.126, 0.126, 0.032]);
  const faces = { x: [CORE.x0, CORE.x1], z: [CORE.z0, CORE.z1] };
  const walls = STAIRWELL_WALLS.filter((w) => w.name === "staircase wall");
  for (const button of SMOKE_VENT_BUTTONS) {
    const back = new Vector3(...button.position).add(
      out(button.normal, -SMOKE_VENT_BUTTON.size[2] / 2),
    );
    const axis = button.normal[0] !== 0 ? "x" : "z";
    const gap = Math.min(...faces[axis].map((f) => Math.abs(back[axis] - f)));
    expect(gap, button.name).toBeLessThan(0.002);
    const behind = sphere(
      "behind",
      back.clone().add(out(button.normal, -0.03)),
      0.02,
    );
    expect(
      walls.some((w) => collide(behind, w) !== null),
      `${button.name} has wall behind it`,
    ).toBe(true);
  }
});

test("they are solid, and touch nothing in the stairwell", () => {
  const solids = stairwellSolids({ tibik: 0 });
  const vents = SMOKE_VENT_BUTTONS.map(smokeVentSolid);
  expect(
    solids.filter((s) => s.name.startsWith("Rauchabzug")).map((s) => s.name),
  ).toEqual(vents.map((v) => v.name));
  const rest = solids.filter((s) => !s.name.startsWith("Rauchabzug"));
  expect(contacts(vents, rest).map((c) => `${c.a} / ${c.b}`)).toEqual([]);
});

test("no door leaf ever swings in front of a button, so it is never hidden", () => {
  const swings: [Door, number][] = [
    [HAUSTUER, 1.5],
    ...FLAT_DOORS.map(({ door }) => [door, Math.PI / 2] as [Door, number]),
    ...LIFT_DOORS.map((door) => [door, 0] as [Door, number]),
  ];
  for (const button of SMOKE_VENT_BUTTONS) {
    const [w, h, d] = SMOKE_VENT_BUTTON.size;
    const view = obb(
      `in front of ${button.name}`,
      wallFrame(button),
      [w, h, 0.6],
      [0, 0, d / 2 + 0.3],
    );
    for (const [door, max] of swings)
      for (let a = 0; a <= max + 1e-9; a += 0.05)
        expect(
          contacts([view], doorSolids(door, a)).map((c) => c.b),
          `${door.name} at ${a.toFixed(2)} rad`,
        ).toEqual([]);
  }
});

test("they keep clear of the notice board and the light buttons", () => {
  const board = obb(
    "notice board",
    wallFrame({ position: NOTICE_BOARD.center, normal: [-1, 0, 0] }),
    [NOTICE_BOARD.size[0], NOTICE_BOARD.size[1], 0.004],
  );
  for (const button of SMOKE_VENT_BUTTONS)
    for (const other of [board, ...LIGHT_BUTTONS.map(buttonSolid)])
      expect(boxGap(smokeVentSolid(button), other)).toBeGreaterThan(0.1);
});
