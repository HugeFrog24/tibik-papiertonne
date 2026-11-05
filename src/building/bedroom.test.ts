import { Color, SRGBColorSpace } from "three";
import { expect, test } from "vitest";
import { bodyColliders } from "../characters/skeleton";
import { boxGap, obbCorners } from "../physics/collision";
import { FACADE_Z, flatWindow, openingFrame } from "../street/building";
import { FACADE_THICKNESS, facadeOpenings } from "../street/facade";
import { LAMP_LIGHT } from "../street/lamps";
import { overlap, rectFootprint } from "../street/footprint";
import { ARM_TUCK, RIG, TIBIK_REST } from "../Tibik/rig";
import { restPose } from "../characters/legs";
import { doorLeaf, doorSolids } from "./doors";
import {
  BED,
  BED_RECT,
  BEDROOM,
  BEDSIDE_LIGHT,
  BEDROOM_DOOR,
  BEDROOM_DOORWAY,
  CABINETS,
  CABINET_INK,
  CURTAIN,
  DOME_LAMP,
  LAMPS,
  PANE,
  PILLOWS,
  RADIATOR,
  SKIRTING,
  SMOKE_ALARM,
  bedroomParts,
  bedroomSolids,
  curtainPanels,
} from "./bedroomShape";
import { LIVING_ROOM } from "./livingRoomShape";
import { FLUR } from "./stairwell";

type Box = { readonly center: readonly number[]; readonly size: readonly number[] };
const lo = (p: Box, axis: number) => p.center[axis] - p.size[axis] / 2;
const hi = (p: Box, axis: number) => p.center[axis] + p.size[axis] / 2;
const parts = bedroomParts();
const part = (name: string) => {
  const found = parts.find((p) => p.name === name);
  if (!found) throw new Error(`no part "${name}"`);
  return found;
};
const his = flatWindow(12, 1, "links");
const [frameW, frameH] = openingFrame(his);
const pane = { x0: his.x - frameW / 2, x1: his.x + frameW / 2 };

test("the bedroom is a street-side room of his flat, clear of the living room and the Flur", () => {
  const room = rectFootprint(BEDROOM);
  expect(overlap(room, rectFootprint(LIVING_ROOM))).toBe(false);
  expect(overlap(room, rectFootprint(FLUR))).toBe(false);
  expect(BEDROOM.z1).toBeCloseTo(FACADE_Z - FACADE_THICKNESS, 9);
  expect(pane.x0).toBeGreaterThan(BEDROOM.x0);
  expect(pane.x1).toBeLessThan(BEDROOM.x1);
  expect(his.y - frameH / 2).toBeGreaterThan(BEDROOM.floor + 0.8);
  expect(his.y + frameH / 2).toBeLessThan(BEDROOM.floor + BEDROOM.height - 0.1);
});

test("the bed is a 160 × 200 double with its headboard against the side wall", () => {
  const mattress = part("mattress");
  expect(mattress.size[0]).toBeCloseTo(BED.mattress[1], 9);
  expect(mattress.size[2]).toBeCloseTo(BED.mattress[0], 9);
  expect(hi(mattress, 1)).toBeCloseTo(BEDROOM.floor + BED.top, 9);
  const headboard = part("headboard");
  expect(lo(headboard, 0)).toBeCloseTo(BEDROOM.x0 + SKIRTING.thickness, 9);
  expect(hi(headboard, 0)).toBeCloseTo(lo(mattress, 0), 9);
  expect(hi(headboard, 1)).toBeCloseTo(BEDROOM.floor + BED.headboard.height, 9);
  const bed = parts.filter((p) => p.name.startsWith("bed ") || p.name === "headboard");
  expect(Math.max(...bed.map((p) => hi(p, 2)))).toBeCloseTo(BEDROOM.z1 - BED.fromWindowWall, 9);
  const rect = { x0: lo(mattress, 0), x1: hi(mattress, 0), z0: lo(mattress, 2), z1: hi(mattress, 2), top: hi(mattress, 1) };
  for (const key of Object.keys(rect) as (keyof typeof rect)[]) expect(BED_RECT[key], key).toBeCloseTo(rect[key], 9);
});

test("a bedside cabinet stands on each side of the headboard, a lamp on each", () => {
  const mattress = part("mattress");
  expect(CABINETS).toHaveLength(2);
  expect(LAMPS).toHaveLength(2);
  const sides = CABINETS.map((c) => Math.sign(c.center[2] - mattress.center[2])).sort();
  expect(sides).toEqual([-1, 1]);
  CABINETS.forEach((cabinet, i) => {
    expect(lo(cabinet, 0)).toBeCloseTo(BEDROOM.x0 + SKIRTING.thickness, 9);
    expect(lo(cabinet, 1)).toBeCloseTo(BEDROOM.floor, 9);
    expect(hi(cabinet, 1) - BEDROOM.floor).toBeLessThanOrEqual(0.6);
    const lamp = LAMPS[i];
    expect(lamp.base[1]).toBeCloseTo(hi(cabinet, 1), 9);
    expect(Math.abs(lamp.base[0] - cabinet.center[0]) + lamp.shade / 2).toBeLessThanOrEqual(cabinet.size[0] / 2 + 0.03);
    expect(Math.abs(lamp.base[2] - cabinet.center[2]) + lamp.shade / 2).toBeLessThanOrEqual(cabinet.size[2] / 2 + 0.03);
    expect(Math.hypot(lamp.rocker[0] - lamp.base[0], lamp.rocker[2] - lamp.base[2])).toBeLessThanOrEqual(lamp.foot / 2);
  });
});

test("the radiator sits under the window and the curtain clears it", () => {
  expect(RADIATOR.center[0]).toBeGreaterThan(pane.x0);
  expect(RADIATOR.center[0]).toBeLessThan(pane.x1);
  expect(lo(RADIATOR, 1) - BEDROOM.floor).toBeCloseTo(0.12, 9);
  expect(his.y - frameH / 2 - hi(RADIATOR, 1)).toBeGreaterThanOrEqual(0.1);
  const behind = BEDROOM.z1 - hi(RADIATOR, 2);
  expect(behind).toBeGreaterThanOrEqual(0.03);
  expect(behind).toBeLessThanOrEqual(0.05);
  for (const open of [0, 0.3, 0.7, 1])
    for (const c of curtainPanels([open, 1 - open])) {
      expect(c.z + c.amplitude, `open ${open}`).toBeLessThan(lo(RADIATOR, 2));
      expect(c.bottom - BEDROOM.floor).toBeCloseTo(0.02, 9);
    }
});

test("walking round the bed's foot fits him, arms hanging or tucked as he squeezes past", () => {
  const foot = Math.max(...parts.filter((p) => p.name.startsWith("bed ")).map((p) => hi(p, 0)));
  for (const pose of [TIBIK_REST, restPose(RIG, ARM_TUCK)]) {
    const spheres = Object.values(bodyColliders(RIG, { position: [0, 0, 0], rotationY: 0, pose })).flat();
    const width = Math.max(...spheres.map((s) => s.center.x + s.radius)) - Math.min(...spheres.map((s) => s.center.x - s.radius));
    expect(BEDROOM.x1 - foot).toBeGreaterThanOrEqual(width + 0.1);
  }
});

test("the smoke alarm is at least 50 cm from every wall, as DIN 14676 asks, and from the ceiling lamp", () => {
  const [x, , z] = SMOKE_ALARM.center;
  const r = SMOKE_ALARM.diameter / 2;
  for (const wall of [x - r - BEDROOM.x0, BEDROOM.x1 - x - r, z - r - BEDROOM.z0, BEDROOM.z1 - z - r])
    expect(wall).toBeGreaterThanOrEqual(0.5);
  const lampGap = Math.hypot(x - DOME_LAMP.center[0], z - DOME_LAMP.center[2]) - r - DOME_LAMP.diameter / 2;
  expect(lampGap).toBeGreaterThanOrEqual(0.5);
  expect(SMOKE_ALARM.center[1]).toBeCloseTo(BEDROOM.floor + BEDROOM.height, 9);
  expect(DOME_LAMP.center[0]).toBeCloseTo((BEDROOM.x0 + BEDROOM.x1) / 2, 9);
  expect(DOME_LAMP.center[2]).toBeCloseTo((BEDROOM.z0 + BEDROOM.z1) / 2, 9);
});

test("no piece of furniture overlaps another, the walls or the closed door", () => {
  for (const open of [[0, 0], [1, 1], [0, 1]] as const) {
    const solids = bedroomSolids({ door: 0, curtain: open });
    for (const [i, a] of solids.entries())
      for (const b of solids.slice(i + 1)) {
        if (a.kind !== "obb" || (a.name.startsWith(BEDROOM_DOOR.name) && b.name.startsWith(BEDROOM_DOOR.name))) continue;
        expect(boxGap(a, b), `${a.name} / ${b.name}, curtain ${open}`).toBeGreaterThanOrEqual(-1e-9);
      }
  }
});

test("the door swings into the bedroom, along the east wall, and clears the furniture at every angle up to its stop", () => {
  const room = bedroomSolids({ door: 0, curtain: [1, 1] }).filter((s) => !s.name.startsWith(BEDROOM_DOOR.name));
  for (let a = 0; a <= BEDROOM_DOOR.open + 1e-9; a += 0.05) {
    const leaf = doorLeaf(BEDROOM_DOOR, a);
    for (const p of obbCorners(leaf)) {
      expect(p.z).toBeGreaterThanOrEqual(BEDROOM.z0 - 1e-6);
      expect(p.x).toBeLessThanOrEqual(BEDROOM.x1 + 1e-6);
    }
    for (const part of doorSolids(BEDROOM_DOOR, a))
      for (const s of room) if (part.kind === "obb") expect(boxGap(part, s), `${part.name} / ${s.name} at ${a.toFixed(2)}`).toBeGreaterThanOrEqual(-1e-9);
  }
});

test("two curtain panels meet at the window's middle when drawn, cover it with room to spare, and each bunches at its own wall when opened", () => {
  const [westClosed, eastClosed] = curtainPanels([0, 0]);
  const middle = (pane.x0 + pane.x1) / 2;
  expect(westClosed.x1).toBeCloseTo(middle, 9);
  expect(eastClosed.x0).toBeCloseTo(middle, 9);
  expect(westClosed.x0).toBeLessThanOrEqual(pane.x0 - 0.05);
  expect(eastClosed.x1).toBeGreaterThanOrEqual(pane.x1 + 0.05);
  const [westOpen, eastOpen] = curtainPanels([1, 1]);
  expect(westOpen.x1).toBeLessThanOrEqual(pane.x0);
  expect(eastOpen.x0).toBeGreaterThanOrEqual(pane.x1);
  expect(westOpen.x0).toBeCloseTo(westClosed.x0, 9);
  expect(eastOpen.x1).toBeCloseTo(eastClosed.x1, 9);
  for (const side of [0, 1] as const) {
    let width = Infinity;
    let depth = 0;
    for (let k = 0; k <= 10; k++) {
      const c = curtainPanels(side === 0 ? [k / 10, 0] : [0, k / 10])[side];
      expect(c.x1 - c.x0).toBeLessThan(width);
      expect(c.amplitude).toBeGreaterThanOrEqual(depth);
      width = c.x1 - c.x0;
      depth = c.amplitude;
    }
  }
  expect(CURTAIN.width).toBeCloseTo(BEDROOM.x1 - BEDROOM.x0 - 0.1, 9);
  expect(BEDROOM.z1 - westClosed.z).toBeCloseTo(0.2, 9);
});

test("the pillows lie on the mattress against the headboard, each a little askew as slept on", () => {
  const mattress = part("mattress");
  expect(PILLOWS).toHaveLength(2);
  for (const p of PILLOWS) {
    expect(p.cover).toEqual([0.8, 0.8]);
    expect(Math.abs(p.yaw)).toBeGreaterThan(0.01);
    expect(Math.abs(p.yaw)).toBeLessThan(0.08);
    expect(p.center[1] - p.size[1] / 2).toBeCloseTo(hi(mattress, 1), 9);
  }
  expect(Math.sign(PILLOWS[0].yaw)).not.toBe(Math.sign(PILLOWS[1].yaw));
});

test("the bedside lamps are warm, about 2700 K, warmer than the street's 3000 K", () => {
  const rgb = (hex: string) => new Color(hex).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  const lamp = rgb(BEDSIDE_LIGHT);
  expect(lamp.r).toBeCloseTo(1, 2);
  expect(lamp.b / lamp.r).toBeGreaterThan(0.28);
  expect(lamp.b / lamp.r).toBeLessThan(0.4);
  expect(lamp.b / lamp.r).toBeLessThan(rgb(LAMP_LIGHT).b / rgb(LAMP_LIGHT).r);
});

test("the light switch sits beside the door on its latch side, where DIN 18015-3 puts it, and a socket waits above each cabinet for its lamp", () => {
  const sw = part("light switch");
  expect(sw.center[1] - BEDROOM.floor).toBeCloseTo(1.05, 9);
  const fromEdge = BEDROOM_DOORWAY.x0 - sw.center[0];
  expect(fromEdge).toBeGreaterThanOrEqual(0.1);
  expect(fromEdge).toBeLessThanOrEqual(0.3);
  expect(lo(sw, 2)).toBeCloseTo(BEDROOM.z0, 9);
  expect(Math.abs(sw.center[0] - BEDROOM_DOOR.hinge[0])).toBeGreaterThan(BEDROOM_DOORWAY.x1 - BEDROOM_DOORWAY.x0);
  const sockets = parts.filter((p) => p.name === "socket");
  expect(sockets).toHaveLength(2);
  for (const s of sockets) {
    expect(lo(s, 0)).toBeCloseTo(BEDROOM.x0, 9);
    expect(CABINETS.some((c) => Math.abs(c.center[2] - s.center[2]) < 1e-9 && lo(s, 1) > hi(c, 1))).toBe(true);
  }
});

test("his window is a real opening in No. 12's facade, so from the bed he looks out onto the street", () => {
  const hole = facadeOpenings(12).find((r) => r.x0 < his.x && r.x1 > his.x && r.y0 < his.y && r.y1 > his.y);
  expect(hole).toBeDefined();
  expect(hole!.x0).toBeCloseTo(PANE.x0, 9);
  expect(hole!.x1).toBeCloseTo(PANE.x1, 9);
  expect(hole!.y0).toBeCloseTo(PANE.y0, 9);
  expect(hole!.y1).toBeCloseTo(PANE.y1, 9);
  expect(facadeOpenings(13).some((r) => r.x0 < his.x && r.x1 > his.x && r.y0 < his.y && r.y1 > his.y)).toBe(false);
});

test("the ceiling lamp's dome hangs as deep as it is drawn, a half sphere", () => {
  expect(DOME_LAMP.height).toBeCloseTo(DOME_LAMP.diameter / 2, 9);
});

test("the cabinets' outlines stay off the curtain however far it is drawn", () => {
  for (let k = 0; k <= 10; k++)
    for (const c of curtainPanels([k / 10, k / 10]))
      for (const cabinet of CABINETS)
        if (lo(cabinet, 0) < c.x1 && hi(cabinet, 0) > c.x0) expect(hi(cabinet, 2) + CABINET_INK).toBeLessThan(c.z - c.amplitude);
});
