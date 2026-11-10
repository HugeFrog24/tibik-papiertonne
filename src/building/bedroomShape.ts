import { CurvePath, Euler, LineCurve3, Matrix4, Vector3 } from "three";
import { clamp, lerp } from "../characters/scalar";
import { frame, obb, partObb, type Solid } from "../physics/collision";
import { FACADE_Z, FRAME_BORDER, OPENING_LAYERS, boundsPart, flatWindow, floorLevel, openingFrame, type Part } from "../street/building";
import { FACADE_THICKNESS } from "../street/facade";
import type { Vec3 } from "../toon/primitives";
import { ROOM_DOOR, doorSolids, roomDoor, type Door } from "./doors";
import { DOOR_FRAME, doorwayFrameParts } from "./doorwayFrame";
import { FLUR } from "./stairwell";

const floor = floorLevel(1);
const WALL = 0.2;

export const BEDROOM = {
  x0: -10.6,
  x1: -7.3,
  z0: -6.6,
  z1: FACADE_Z - FACADE_THICKNESS,
  floor,
  height: FLUR.height,
};
const ceiling = floor + BEDROOM.height;
const centre = { x: (BEDROOM.x0 + BEDROOM.x1) / 2, z: (BEDROOM.z0 + BEDROOM.z1) / 2 };

export const SKIRTING = { height: 0.06, thickness: 0.015 };

export const BEDSIDE_LIGHT = "#ffa957";

export const BED = {
  mattress: [1.6, 2.0] as const,
  top: 0.55,
  frame: 0.05,
  headboard: { height: 1.05, thickness: 0.08 },
  fromWindowWall: 0.7,
  rail: 0.4,
  base: 0.33,
  legs: 0.05,
};

const bed = (() => {
  const z1 = BEDROOM.z1 - BED.fromWindowWall;
  const z0 = z1 - BED.mattress[0] - 2 * BED.frame;
  const head = BEDROOM.x0 + SKIRTING.thickness;
  const x0 = head + BED.headboard.thickness;
  const x1 = x0 + BED.mattress[1];
  return { z0, z1, head, x0, x1, foot: x1 + BED.frame };
})();

export const BED_RECT = {
  x0: bed.x0,
  x1: bed.x1,
  z0: bed.z0 + BED.frame,
  z1: bed.z1 - BED.frame,
  top: floor + BED.top,
};

const up = (a: number, b: number) => [floor + a, floor + b] as const;

const bedParts = (): Part[] => {
  const legs = [bed.foot - BED.legs, bed.foot] as const;
  return [
    boundsPart("headboard", [bed.head, bed.x0], up(0, BED.headboard.height), [bed.z0, bed.z1]),
    boundsPart("bed rail", [bed.x0, bed.foot], up(BED.legs, BED.rail), [bed.z0, bed.z0 + BED.frame]),
    boundsPart("bed rail", [bed.x0, bed.foot], up(BED.legs, BED.rail), [bed.z1 - BED.frame, bed.z1]),
    boundsPart("bed foot rail", [bed.x1, bed.foot], up(BED.legs, BED.rail), [bed.z0 + BED.frame, bed.z1 - BED.frame]),
    boundsPart("bed base", [bed.x0, bed.x1], up(BED.legs, BED.base), [BED_RECT.z0, BED_RECT.z1]),
    boundsPart("mattress", [bed.x0, bed.x1], up(BED.base, BED.top), [BED_RECT.z0, BED_RECT.z1]),
    boundsPart("bed leg", legs, up(0, BED.legs), [bed.z0, bed.z0 + BED.legs]),
    boundsPart("bed leg", legs, up(0, BED.legs), [bed.z1 - BED.legs, bed.z1]),
  ];
};

const CABINET = { width: 0.45, depth: 0.45, height: 0.55, gap: 0.005 };
export const CABINET_INK = 0.006;

export const CABINETS: readonly Part[] = [
  [bed.z1 + CABINET.gap, bed.z1 + CABINET.gap + CABINET.width],
  [bed.z0 - CABINET.gap - CABINET.width, bed.z0 - CABINET.gap],
].map(([a, b]) => boundsPart("cabinet", [bed.head, bed.head + CABINET.depth], up(0, CABINET.height), [a, b]));

export type BedsideLamp = {
  readonly base: Vec3;
  readonly foot: number;
  readonly height: number;
  readonly shade: number;
  readonly shadeHeight: number;
};

const LAMP_SIZE = { foot: 0.14, footHeight: 0.025, height: 0.4, shade: 0.25, shadeHeight: 0.17, stem: 0.02 };

export const LAMPS: readonly BedsideLamp[] = CABINETS.map((cabinet) => {
  const base: Vec3 = [cabinet.center[0], cabinet.center[1] + cabinet.size[1] / 2, cabinet.center[2]];
  return {
    base,
    foot: LAMP_SIZE.foot,
    height: LAMP_SIZE.height,
    shade: LAMP_SIZE.shade,
    shadeHeight: LAMP_SIZE.shadeHeight,
  };
});

const lampParts = (lamp: BedsideLamp): Part[] => {
  const [x, y, z] = lamp.base;
  const span = (w: number) => [x - w / 2, x + w / 2] as const;
  const depth = (w: number) => [z - w / 2, z + w / 2] as const;
  const shadeBottom = y + lamp.height - lamp.shadeHeight;
  return [
    boundsPart("lamp foot", span(lamp.foot), [y, y + LAMP_SIZE.footHeight], depth(lamp.foot)),
    boundsPart("lamp stem", span(LAMP_SIZE.stem), [y + LAMP_SIZE.footHeight, shadeBottom], depth(LAMP_SIZE.stem)),
    boundsPart("lamp shade", span(lamp.shade), [shadeBottom, y + lamp.height], depth(lamp.shade)),
  ];
};

const his = flatWindow(12, 1, "links");
const [paneW, paneH] = openingFrame(his);
export const PANE = { x0: his.x - paneW / 2, x1: his.x + paneW / 2, y0: his.y - paneH / 2, y1: his.y + paneH / 2 };

export const INNER_GLASS = {
  x: his.x,
  y: his.y,
  z: FACADE_Z + OPENING_LAYERS.glass - 0.001,
  w: paneW - 2 * FRAME_BORDER,
  h: paneH - 2 * FRAME_BORDER,
  tint: 0.08,
};

export const RAIN_ON_THE_GLASS = { ...INNER_GLASS, z: FACADE_Z + OPENING_LAYERS.glass + 0.0005 };

export const RADIATOR: Part = boundsPart(
  "radiator",
  [his.x - 0.5, his.x + 0.5],
  up(0.12, 0.72),
  [BEDROOM.z1 - 0.04 - 0.1, BEDROOM.z1 - 0.04],
);

const THERMOSTAT: Part = boundsPart(
  "thermostat",
  [his.x + 0.5, his.x + 0.57],
  up(0.6, 0.68),
  [BEDROOM.z1 - 0.12, BEDROOM.z1 - 0.06],
);

const SILL = { thickness: 0.02, nose: 0.03, lining: 0.012 };

const HANDLE = { rosette: [0.032, 0.07, 0.012], neck: { width: 0.022, reach: 0.028 }, lever: { below: 0.12, above: 0.012, depth: 0.018 } } as const;

const handleParts = (): Part[] => {
  const x = PANE.x1 - FRAME_BORDER / 2;
  const y = his.y;
  const across = (w: number) => [x - w / 2, x + w / 2] as const;
  const face = FACADE_Z - HANDLE.rosette[2];
  const grip = face - HANDLE.neck.reach;
  return [
    boundsPart("window handle rosette", across(HANDLE.rosette[0]), [y - HANDLE.rosette[1] / 2, y + HANDLE.rosette[1] / 2], [face, FACADE_Z]),
    boundsPart("window handle neck", across(HANDLE.neck.width), [y - HANDLE.lever.above, y + HANDLE.lever.above], [grip, face]),
    boundsPart("window handle lever", across(HANDLE.neck.width), [y - HANDLE.lever.below, y + HANDLE.lever.above], [grip - HANDLE.lever.depth, grip]),
  ];
};

const windowParts = (): Part[] => {
  const wall = [BEDROOM.z1, BEDROOM.z1 + FACADE_THICKNESS] as const;
  const sillTop = PANE.y0 + SILL.thickness;
  return [
    boundsPart("window wall", [BEDROOM.x0 - WALL, PANE.x0], [floor, ceiling], wall),
    boundsPart("window wall", [PANE.x1, BEDROOM.x1 + WALL], [floor, ceiling], wall),
    boundsPart("window wall", [PANE.x0, PANE.x1], [floor, PANE.y0], wall),
    boundsPart("window wall", [PANE.x0, PANE.x1], [PANE.y1, ceiling], wall),
    boundsPart("window sill", [PANE.x0, PANE.x1], [PANE.y0, sillTop], [BEDROOM.z1 - SILL.nose, FACADE_Z]),
    boundsPart("window reveal", [PANE.x0, PANE.x0 + SILL.lining], [sillTop, PANE.y1], [BEDROOM.z1, FACADE_Z]),
    boundsPart("window reveal", [PANE.x1 - SILL.lining, PANE.x1], [sillTop, PANE.y1], [BEDROOM.z1, FACADE_Z]),
    boundsPart("window reveal", [PANE.x0 + SILL.lining, PANE.x1 - SILL.lining], [PANE.y1 - SILL.lining, PANE.y1], [BEDROOM.z1, FACADE_Z]),
    ...handleParts(),
  ];
};

export const BEDROOM_DOORWAY = { x0: BEDROOM.x1 - 0.1 - 0.885, x1: BEDROOM.x1 - 0.1, height: 2.01 };

export const BEDROOM_DOOR: Door & { readonly open: number } = {
  ...roomDoor("bedroom door", [BEDROOM_DOORWAY.x1 - 0.0125, floor + 0.01, BEDROOM.z0 + DOOR_FRAME.trim + ROOM_DOOR.thickness / 2]),
  open: 1.5,
};

const shellParts = (): Part[] => {
  const back = [BEDROOM.z0 - WALL, BEDROOM.z0] as const;
  const t = SKIRTING.thickness;
  const skirt = up(0, SKIRTING.height);
  const casing = DOOR_FRAME.casing - DOOR_FRAME.lining;
  return [
    boundsPart("floor", [BEDROOM.x0, BEDROOM.x1], [floor - 0.05, floor], [BEDROOM.z0, BEDROOM.z1]),
    boundsPart("ceiling", [BEDROOM.x0, BEDROOM.x1], [ceiling, ceiling + 0.2], [BEDROOM.z0, BEDROOM.z1]),
    boundsPart("west wall", [BEDROOM.x0 - WALL, BEDROOM.x0], [floor, ceiling], [BEDROOM.z0 - WALL, BEDROOM.z1]),
    boundsPart("east wall", [BEDROOM.x1, BEDROOM.x1 + WALL], [floor, ceiling], [BEDROOM.z0 - WALL, BEDROOM.z1]),
    boundsPart("back wall", [BEDROOM.x0, BEDROOM_DOORWAY.x0], [floor, ceiling], back),
    boundsPart("back wall", [BEDROOM_DOORWAY.x1, BEDROOM.x1], [floor, ceiling], back),
    boundsPart("back wall", [BEDROOM_DOORWAY.x0, BEDROOM_DOORWAY.x1], [floor + BEDROOM_DOORWAY.height, ceiling], back),
    boundsPart("skirting", [BEDROOM.x0, BEDROOM.x0 + t], skirt, [BEDROOM.z0, BEDROOM.z1]),
    boundsPart("skirting", [BEDROOM.x1 - t, BEDROOM.x1], skirt, [BEDROOM.z0, BEDROOM.z1]),
    boundsPart("skirting", [BEDROOM.x0 + t, BEDROOM.x1 - t], skirt, [BEDROOM.z1 - t, BEDROOM.z1]),
    boundsPart("skirting", [BEDROOM.x0 + t, BEDROOM_DOORWAY.x0 - casing], skirt, [BEDROOM.z0, BEDROOM.z0 + t]),
    boundsPart("skirting", [BEDROOM_DOORWAY.x1 + casing, BEDROOM.x1 - t], skirt, [BEDROOM.z0, BEDROOM.z0 + t]),
    ...doorwayFrameParts(BEDROOM_DOORWAY, floor, back, [
      ["corridor", [back[0] - DOOR_FRAME.trim, back[0]]],
      ["bedroom", [BEDROOM.z0, BEDROOM.z0 + DOOR_FRAME.trim]],
    ]),
  ];
};

export const CURTAIN = {
  width: BEDROOM.x1 - BEDROOM.x0 - 0.1,
  wall: 0.2,
  rail: 0.05,
  pelmet: { height: 0.08, thickness: 0.02, before: 0.05 },
  hem: 0.02,
  folds: 20,
  fullness: 1.5,
  depth: 0.035,
  stack: 0.35,
  meet: (PANE.x0 + PANE.x1) / 2,
};

export type CurtainShape = {
  readonly x0: number;
  readonly x1: number;
  readonly z: number;
  readonly amplitude: number;
  readonly folds: number;
  readonly top: number;
  readonly bottom: number;
};

export type CurtainOpen = readonly [west: number, east: number];

const RAIL_ENDS = {
  west: BEDROOM.x0 + (BEDROOM.x1 - BEDROOM.x0 - CURTAIN.width) / 2,
  east: BEDROOM.x1 - (BEDROOM.x1 - BEDROOM.x0 - CURTAIN.width) / 2,
};

const panel = (x0: number, x1: number, closed: number): CurtainShape => {
  const width = x1 - x0;
  const fabric = closed * CURTAIN.fullness;
  return {
    x0,
    x1,
    z: BEDROOM.z1 - CURTAIN.wall,
    amplitude: Math.min(CURTAIN.depth, Math.sqrt(fabric * fabric - width * width) / (Math.PI * CURTAIN.folds)),
    folds: CURTAIN.folds,
    top: ceiling - CURTAIN.rail,
    bottom: floor + CURTAIN.hem,
  };
};

export const curtainPanels = ([west, east]: CurtainOpen): readonly [CurtainShape, CurtainShape] => {
  const westClosed = CURTAIN.meet - RAIL_ENDS.west;
  const eastClosed = RAIL_ENDS.east - CURTAIN.meet;
  return [
    panel(RAIL_ENDS.west, RAIL_ENDS.west + lerp(westClosed, CURTAIN.stack, clamp(west, 0, 1)), westClosed),
    panel(RAIL_ENDS.east - lerp(eastClosed, CURTAIN.stack, clamp(east, 0, 1)), RAIL_ENDS.east, eastClosed),
  ];
};

export const curtainOverPane = (open: CurtainOpen, pane: { readonly x0: number; readonly x1: number }) =>
  curtainPanels(open).flatMap((c) => {
    const x0 = Math.max(pane.x0, c.x0);
    const x1 = Math.min(pane.x1, c.x1);
    return x1 > x0 ? [{ x0, x1 }] : [];
  });

export const CURTAIN_TRANSMITS = 0.4;

export const bareShareOfPane = (open: CurtainOpen) =>
  1 - curtainOverPane(open, PANE).reduce((sum, c) => sum + (c.x1 - c.x0), 0) / (PANE.x1 - PANE.x0);

export const daylightIn = (daylight: number, open: CurtainOpen) => daylight * (1 + (1 / CURTAIN_TRANSMITS - 1) * bareShareOfPane(open));

const curtainParts = (): Part[] => {
  const z = BEDROOM.z1 - CURTAIN.wall;
  const front = z - CURTAIN.depth - CURTAIN.pelmet.before;
  return [
    boundsPart("curtain rail", [RAIL_ENDS.west - 0.02, RAIL_ENDS.east + 0.02], [ceiling - CURTAIN.rail, ceiling], [z - 0.012, z + 0.012]),
    boundsPart("pelmet", [BEDROOM.x0, BEDROOM.x1], [ceiling - CURTAIN.pelmet.height, ceiling], [front - CURTAIN.pelmet.thickness, front]),
  ];
};

export const DOME_LAMP = { center: [centre.x, ceiling, centre.z] as Vec3, diameter: 0.3, height: 0.15 };
export const SMOKE_ALARM = { center: [centre.x, ceiling, centre.z - 0.9] as Vec3, diameter: 0.11, height: 0.045 };

const ceilingParts = (): Part[] => {
  const disc = (name: string, c: Vec3, d: number, h: number) =>
    boundsPart(name, [c[0] - d / 2, c[0] + d / 2], [ceiling - h, ceiling], [c[2] - d / 2, c[2] + d / 2]);
  return [
    disc("ceiling lamp", DOME_LAMP.center, DOME_LAMP.diameter, DOME_LAMP.height),
    disc("smoke alarm", SMOKE_ALARM.center, SMOKE_ALARM.diameter, SMOKE_ALARM.height),
  ];
};

const FITTING = { depth: 0.012, switch: 0.08, socket: [0.08, 0.15] as const, switchHeight: 1.05, fromDoorway: 0.15, socketHeight: 0.7 };

const wallFittings = (): Part[] => {
  const sx = BEDROOM_DOORWAY.x0 - FITTING.fromDoorway;
  const sy = floor + FITTING.switchHeight;
  const half = FITTING.switch / 2;
  return [
    boundsPart("light switch", [sx - half, sx + half], [sy - half, sy + half], [BEDROOM.z0, BEDROOM.z0 + FITTING.depth]),
    ...CABINETS.map((cabinet) =>
      boundsPart(
        "socket",
        [BEDROOM.x0, BEDROOM.x0 + FITTING.depth],
        up(FITTING.socketHeight - FITTING.socket[0] / 2, FITTING.socketHeight + FITTING.socket[0] / 2),
        [cabinet.center[2] - FITTING.socket[1] / 2, cabinet.center[2] + FITTING.socket[1] / 2],
      ),
    ),
  ];
};

export type Pillow = {
  readonly cover: readonly [number, number];
  readonly size: Vec3;
  readonly center: Vec3;
  readonly yaw: number;
};

const PILLOW = { footprint: 0.74, height: 0.14, fromHead: 0.4, apart: 0.39 };

export const PILLOWS: readonly Pillow[] = ([
  [1, 0.035],
  [-1, -0.028],
] as const).map(([side, yaw]) => ({
  cover: [0.8, 0.8] as const,
  size: [PILLOW.footprint, PILLOW.height, PILLOW.footprint] as Vec3,
  center: [bed.x0 + PILLOW.fromHead, floor + BED.top + PILLOW.height / 2, (BED_RECT.z0 + BED_RECT.z1) / 2 + side * PILLOW.apart] as Vec3,
  yaw,
}));

const doorPillow = PILLOWS.reduce((a, b) => (b.center[2] < a.center[2] ? b : a));
const pillowTop = doorPillow.center[1] + doorPillow.size[1] / 2;
const SWITCH_AT = { x: BED_RECT.x0 + 0.505, z: BED_RECT.z0 + 0.07 };
const CORD_LEAVES = { x: BED_RECT.x0 + 0.395, z: BED_RECT.z0 + 0.045 };
const switchYaw = Math.atan2(-(CORD_LEAVES.z - SWITCH_AT.z), CORD_LEAVES.x - SWITCH_AT.x);

const SWITCH_SIZE: Vec3 = [0.06, 0.02, 0.027];

export const CORD_SWITCH = {
  center: [SWITCH_AT.x, pillowTop + SWITCH_SIZE[1] / 2, SWITCH_AT.z] as Vec3,
  size: SWITCH_SIZE,
  yaw: switchYaw,
  cord: 0.005,
  color: "#f1efe8",
};

export const cordSwitchSolid = () => obb("cord switch", frame(new Matrix4(), CORD_SWITCH.center, new Euler(0, CORD_SWITCH.yaw, 0)), CORD_SWITCH.size);

export type CordSwitch = { readonly center: Vec3; readonly size: Vec3; readonly yaw: number };

const onSwitch = (sw: CordSwitch, d: number, side = 0): Vec3 => {
  const [x, y, z] = sw.center;
  const u = [Math.cos(sw.yaw), -Math.sin(sw.yaw)];
  const v = [-u[1], u[0]];
  return [x + u[0] * d + v[0] * side, y, z + u[1] * d + v[1] * side];
};

const along = (d: number, side = 0): Vec3 => onSwitch(CORD_SWITCH, d, side);

const CORD_REST = 0.002;
const onTop = (y: number) => y + CORD_SWITCH.cord / 2 + CORD_REST;

export const CORD_STRANDS: readonly (readonly Vec3[])[] = (() => {
  const half = CORD_SWITCH.size[0] / 2;
  const lampFoot = LAMPS.reduce((a, b) => (b.base[2] < a.base[2] ? b : a));
  const cabinetEdge = CABINETS.reduce((a, b) => (b.center[2] < a.center[2] ? b : a));
  const cabinetFront = cabinetEdge.center[2] + cabinetEdge.size[2] / 2;
  const cabinetTop = cabinetEdge.center[1] + cabinetEdge.size[1] / 2;
  const toLamp = (offset: number): Vec3[] => [
    [CORD_LEAVES.x - offset * 0.2, onTop(pillowTop), CORD_LEAVES.z - 0.011],
    [CORD_LEAVES.x - 0.02 - offset * 0.2, onTop(BED_RECT.top), CORD_LEAVES.z - 0.016],
    [CORD_LEAVES.x - 0.045, onTop(BED_RECT.top), BED_RECT.z0 + 0.012 - offset * 0.3],
    [CORD_LEAVES.x - 0.1, onTop(BED_RECT.top), cabinetFront - 0.015 - offset],
    [lampFoot.base[0] + 0.04 + offset, onTop(cabinetTop), lampFoot.base[2] + lampFoot.foot / 2 + 0.01 + offset],
  ];
  const lamp: Vec3[] = [along(-half), ...toLamp(0)];
  const plug: Vec3[] = [
    along(half),
    along(half + 0.02, 0.02),
    along(0, 0.032),
    along(-half - 0.012, 0.022),
    ...toLamp(0.012).slice(0, 4),
    [cabinetEdge.center[0] - cabinetEdge.size[0] / 2 + 0.01, onTop(cabinetTop), cabinetFront - 0.04],
  ];
  return [lamp, plug];
})();

const SAMPLE = 0.01;

export const cordCurve = (points: readonly Vec3[]) => {
  const path = new CurvePath<Vector3>();
  for (let i = 1; i < points.length; i++) path.add(new LineCurve3(new Vector3(...points[i - 1]), new Vector3(...points[i])));
  return path;
};

const FAR_LAMP = LAMPS.reduce((a, b) => (b.base[2] > a.base[2] ? b : a));
const FAR_CABINET = CABINETS.reduce((a, b) => (b.center[2] > a.center[2] ? b : a));
const FAR_SWITCH_AT = { out: 0.06, across: 0.02, yaw: 0.12 };

export const FAR_CORD_SWITCH: CordSwitch = {
  center: [FAR_LAMP.base[0] + FAR_LAMP.foot / 2 + FAR_SWITCH_AT.out, FAR_LAMP.base[1] + SWITCH_SIZE[1] / 2, FAR_LAMP.base[2] + FAR_SWITCH_AT.across],
  size: SWITCH_SIZE,
  yaw: FAR_SWITCH_AT.yaw,
};

const FAR_CORD_STRANDS: readonly (readonly Vec3[])[] = (() => {
  const half = SWITCH_SIZE[0] / 2;
  const top = onTop(FAR_LAMP.base[1]);
  const [lx, , lz] = FAR_LAMP.base;
  const behind = lz + FAR_LAMP.foot / 2 + 0.04;
  const wallSide = FAR_CABINET.center[0] - FAR_CABINET.size[0] / 2 + 0.01;
  const [ax, , az] = onSwitch(FAR_CORD_SWITCH, -half);
  const [bx, , bz] = onSwitch(FAR_CORD_SWITCH, half);
  return [
    [[ax, top, az], [lx + FAR_LAMP.foot / 2 + 0.008, top, lz + 0.01]],
    [[bx, top, bz], [bx + 0.02, top, bz + 0.03], [bx, top, behind], [wallSide, top, behind]],
  ];
})();

export const SWITCHED_CORDS: readonly { readonly switch: CordSwitch; readonly strands: readonly (readonly Vec3[])[] }[] = [
  { switch: CORD_SWITCH, strands: CORD_STRANDS },
  { switch: FAR_CORD_SWITCH, strands: FAR_CORD_STRANDS },
];

export const cordPath = (): Vector3[] =>
  SWITCHED_CORDS.flatMap((cord) => cord.strands).flatMap((points) => {
    const curve = cordCurve(points);
    return curve.getSpacedPoints(Math.max(2, Math.ceil(curve.getLength() / SAMPLE)));
  });

export const MATTRESS = partObb(bedParts().find((p) => p.name === "mattress")!);

export const bedroomParts = (): readonly Part[] => [
  ...shellParts(),
  ...windowParts(),
  ...bedParts(),
  ...CABINETS,
  ...LAMPS.flatMap(lampParts),
  RADIATOR,
  THERMOSTAT,
  ...curtainParts(),
  ...ceilingParts(),
  ...wallFittings(),
];

export const bedroomSolids = (state: { readonly door: number; readonly curtain: CurtainOpen }): readonly Solid[] => [
  ...bedroomParts().map(partObb),
  ...PILLOWS.map((p) => obb("pillow", frame(new Matrix4(), p.center, new Euler(0, p.yaw, 0)), p.size)),
  ...curtainPanels(state.curtain).map((c) =>
    partObb(boundsPart("curtain", [c.x0, c.x1], [c.bottom, c.top], [c.z - c.amplitude, c.z + c.amplitude])),
  ),
  ...doorSolids(BEDROOM_DOOR, state.door),
];
