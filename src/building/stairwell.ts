import { Euler, Matrix4 } from "three";
import { frame, obb, type Obb, type Solid } from "../physics/collision";
import {
  BUILDING_HEIGHT,
  DOORSTEP,
  ENTRANCE_X,
  FACADE_Z,
  STOREYS,
  STOREY_HEIGHT,
  floorLevel,
} from "../street/building";
import {
  DOORWAY,
  FACADE_THICKNESS,
  tileAround,
  type Rect,
} from "../street/facade";
import type { Vec3 } from "../toon/primitives";
import { PLATE, doorFrame, doorSolids, leverGrip, type Door } from "./doors";

export const STAIRWELL_LIGHT = "#fff1d6";

export const CORE = {
  x0: -3.2,
  x1: -0.6,
  z0: FACADE_Z - FACADE_THICKNESS,
  z1: -10.0,
};
export const LANE_SPLIT = -1.9;
type Lane = { readonly x0: number; readonly x1: number };
const LANE_A: Lane = { x0: CORE.x0, x1: LANE_SPLIT };
const LANE_B: Lane = { x0: LANE_SPLIT, x1: CORE.x1 };
const BOTH: Lane = { x0: CORE.x0, x1: CORE.x1 };

const GOING = 0.28;
const UPPER_RISE = STOREY_HEIGHT / 16;
const HALF_EDGE = CORE.z0 - 1.4;
const FLOOR_EDGE = HALF_EDGE - 7 * GOING;
export const EG_FIRST_RISER = -3.8;
export const EG_TOP = EG_FIRST_RISER - 17 * GOING;
const SLAB = 0.2;
const WALL = 0.2;

export type Flight = {
  readonly name: string;
  readonly lane: Lane;
  readonly from: number;
  readonly firstRiser: number;
  readonly direction: 1 | -1;
  readonly risers: number;
  readonly rise: number;
  readonly going: number;
  readonly solidBelow: boolean;
};

export const FLIGHTS: readonly Flight[] = [
  {
    name: "EG flight",
    lane: LANE_A,
    from: floorLevel(0),
    firstRiser: EG_FIRST_RISER,
    direction: -1,
    risers: 18,
    rise: (floorLevel(1) - floorLevel(0)) / 18,
    going: GOING,
    solidBelow: true,
  },
  ...Array.from({ length: STOREYS - 2 }, (_, i) => i + 1).flatMap(
    (n): Flight[] => [
      {
        name: `flight ${n}B`,
        lane: LANE_B,
        from: floorLevel(n),
        firstRiser: FLOOR_EDGE,
        direction: 1,
        risers: 8,
        rise: UPPER_RISE,
        going: GOING,
        solidBelow: false,
      },
      {
        name: `flight ${n}A`,
        lane: LANE_A,
        from: floorLevel(n) + 8 * UPPER_RISE,
        firstRiser: HALF_EDGE,
        direction: -1,
        risers: 8,
        rise: UPPER_RISE,
        going: GOING,
        solidBelow: false,
      },
    ],
  ),
];

export type Tread = {
  readonly name: string;
  readonly center: Vec3;
  readonly size: Vec3;
  readonly top: number;
  readonly bottom: number;
};

const slab = (
  name: string,
  lane: Lane,
  z0: number,
  z1: number,
  top: number,
  bottom: number,
): Tread => ({
  name,
  center: [(lane.x0 + lane.x1) / 2, (top + bottom) / 2, (z0 + z1) / 2],
  size: [lane.x1 - lane.x0, top - bottom, Math.abs(z1 - z0)],
  top,
  bottom,
});

const treadOf = (f: Flight, k: number): Tread => {
  const top = f.from + k * f.rise;
  return slab(
    `${f.name} tread ${k}`,
    f.lane,
    f.firstRiser + f.direction * (k - 1) * f.going,
    f.firstRiser + f.direction * k * f.going,
    top,
    f.solidBelow ? f.from : top - f.rise,
  );
};

export const riserZ = (f: Flight, k: number) =>
  f.firstRiser + f.direction * k * f.going;
export const flightEnd = (f: Flight) => riserZ(f, f.risers - 1);
const SLAB_THICKNESS = 0.16;
const slabTop = (f: Flight, z: number) =>
  f.from + ((z - f.firstRiser) * f.direction * f.rise) / f.going;
const slabDepth = (f: Flight) =>
  SLAB_THICKNESS / Math.cos(Math.atan2(f.rise, f.going));
export const flightSoffit = (f: Flight, z: number) =>
  slabTop(f, z) - slabDepth(f);
const underFlight = (f: Flight, x: number, z: number) =>
  !f.solidBelow &&
  x >= f.lane.x0 &&
  x <= f.lane.x1 &&
  (z - f.firstRiser) * f.direction >= 0 &&
  (z - flightEnd(f)) * f.direction <= 0;

export const FLUR = {
  x0: -5.4,
  x1: CORE.x0 - WALL,
  z0: CORE.z1 - WALL,
  z1: -8.0,
  height: 2.5,
};

export const LIVING_DOORWAY = { x0: -4.745, x1: -3.86, height: 2.01 };

const flurFarWall = (
  name: string,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
) =>
  obb(
    name,
    frame(new Matrix4(), [
      (x0 + x1) / 2,
      floorLevel(1) + (y0 + y1) / 2,
      FLUR.z1 + WALL / 2,
    ]),
    [x1 - x0, y1 - y0, WALL],
  );

export const HALF_LANDINGS = Array.from({ length: STOREYS - 2 }, (_, i) => ({
  y: floorLevel(i + 1) + 8 * UPPER_RISE,
  z0: CORE.z0,
  z1: HALF_EDGE,
}));

export const TREADS: readonly Tread[] = [
  ...FLIGHTS.flatMap((f) =>
    Array.from({ length: f.risers - 1 }, (_, i) => treadOf(f, i + 1)),
  ),
  slab("EG hallway", LANE_A, CORE.z0, EG_FIRST_RISER, floorLevel(0), 0),
  slab("EG hallway", LANE_B, CORE.z0, CORE.z1, floorLevel(0), 0),
  slab("EG hallway", LANE_A, EG_TOP, CORE.z1, floorLevel(0), 0),
  slab(
    "1. OG landing",
    LANE_A,
    EG_TOP,
    CORE.z1,
    floorLevel(1),
    floorLevel(1) - SLAB,
  ),
  slab(
    "1. OG landing",
    LANE_B,
    FLOOR_EDGE,
    CORE.z1,
    floorLevel(1),
    floorLevel(1) - SLAB,
  ),
  ...Array.from({ length: STOREYS - 2 }, (_, i) => i + 2).map((n) =>
    slab(
      `${n}. OG landing`,
      BOTH,
      FLOOR_EDGE,
      CORE.z1,
      floorLevel(n),
      floorLevel(n) - SLAB,
    ),
  ),
  ...HALF_LANDINGS.map((l, i) =>
    slab(`half landing ${i + 1}`, BOTH, l.z0, l.z1, l.y, l.y - SLAB),
  ),
  slab(
    "Flur floor",
    FLUR,
    FLUR.z0,
    FLUR.z1,
    floorLevel(1),
    floorLevel(1) - SLAB,
  ),
];

export const onTread = (t: Tread, x: number, z: number) =>
  Math.abs(x - t.center[0]) <= t.size[0] / 2 &&
  Math.abs(z - t.center[2]) <= t.size[2] / 2;

export const undersideAbove = (x: number, y: number, z: number) =>
  Math.min(
    ...TREADS.filter((t) => onTread(t, x, z) && t.bottom > y + 1e-6).map(
      (t) => t.bottom,
    ),
    ...FLIGHTS.filter(
      (f) => underFlight(f, x, z) && flightSoffit(f, z) > y + 1e-6,
    ).map((f) => flightSoffit(f, z)),
    Infinity,
  );

const FLAT_DOOR = {
  width: 0.985,
  height: 2.11,
  thickness: 0.04,
  opening: 1.01,
  center: -9.3,
};
const LIFT = { x0: -2.35, x1: -1.45, height: 2.0 };
export const LIFT_CABIN = { storey: 4 };
export const liftDisplay = () => String(LIFT_CABIN.storey);

const flatDoor = (name: string, side: -1 | 1, storey: number): Door => ({
  name,
  hinge: [
    side === -1 ? CORE.x0 - 0.02 : CORE.x1 + 0.02,
    floorLevel(storey) + 0.01,
    FLAT_DOOR.center - FLAT_DOOR.width / 2,
  ],
  width: FLAT_DOOR.width,
  height: FLAT_DOOR.height,
  thickness: FLAT_DOOR.thickness,
  closedYaw: -Math.PI / 2,
  swing: side === -1 ? -1 : 1,
  viewer: true,
  grips: [
    leverGrip(FLAT_DOOR.width - 0.06, 1.04, (-side * FLAT_DOOR.thickness) / 2),
    {
      side: "outer",
      shape: "knob",
      center: [
        FLAT_DOOR.width - 0.07,
        1.04,
        side * (FLAT_DOOR.thickness / 2 + PLATE.thickness.outer + 0.028),
      ],
      size: [0.056, 0.056, 0.056],
    },
  ],
});

export const TIBIK_DOOR = flatDoor("Tibik's door", -1, 1);
export const NEIGHBOUR_DOOR = flatDoor("neighbour's door", 1, 1);
export const FLAT_DOORS: readonly {
  readonly door: Door;
  readonly storey: number;
  readonly side: "links" | "rechts";
}[] = Array.from({ length: STOREYS }, (_, n) => n).flatMap((n) => [
  {
    door: n === 1 ? TIBIK_DOOR : flatDoor(`${n}. floor links`, -1, n),
    storey: n,
    side: "links" as const,
  },
  {
    door: n === 1 ? NEIGHBOUR_DOOR : flatDoor(`${n}. floor rechts`, 1, n),
    storey: n,
    side: "rechts" as const,
  },
]);
const OTHER_FLAT_DOORS = FLAT_DOORS.map((f) => f.door).filter(
  (d) => d !== TIBIK_DOOR && d !== NEIGHBOUR_DOOR,
);

export const LIFT_DOORS: readonly Door[] = Array.from(
  { length: STOREYS },
  (_, n) => ({
    name: `lift door ${n}`,
    hinge: [LIFT.x0, floorLevel(n), CORE.z1 + 0.03] as Vec3,
    width: LIFT.x1 - LIFT.x0,
    height: LIFT.height,
    thickness: 0.04,
    closedYaw: 0,
    swing: 1 as const,
    grips: [],
  }),
);

const doorOpenings = (): Rect[] =>
  Array.from({ length: STOREYS }, (_, n) => ({
    x0: FLAT_DOOR.center - FLAT_DOOR.opening / 2,
    x1: FLAT_DOOR.center + FLAT_DOOR.opening / 2,
    y0: floorLevel(n),
    y1: floorLevel(n) + 2.135,
  }));

export type WallPlane = {
  readonly plane: "x" | "z";
  readonly at: number;
  readonly along: readonly [number, number];
  readonly openings: readonly Rect[];
};
export const WALL_THICKNESS = WALL;
export const WALL_PLANES: readonly WallPlane[] = [
  {
    plane: "x",
    at: CORE.x0 - WALL / 2,
    along: [CORE.z1 - WALL, CORE.z0],
    openings: doorOpenings(),
  },
  {
    plane: "x",
    at: CORE.x1 + WALL / 2,
    along: [CORE.z1 - WALL, CORE.z0],
    openings: doorOpenings(),
  },
  {
    plane: "z",
    at: CORE.z1 - WALL / 2,
    along: [CORE.x0 - WALL, CORE.x1 + WALL],
    openings: Array.from({ length: STOREYS }, (_, n) => ({
      x0: LIFT.x0,
      x1: LIFT.x1,
      y0: floorLevel(n),
      y1: floorLevel(n) + LIFT.height,
    })),
  },
];
export const WALL_HEIGHT = BUILDING_HEIGHT;

const wallBoxes = (w: WallPlane): Obb[] =>
  tileAround(
    { x0: w.along[0], x1: w.along[1], y0: 0, y1: WALL_HEIGHT },
    w.openings,
  ).map((r) => {
    const mid = (r.x0 + r.x1) / 2;
    const length = r.x1 - r.x0;
    const center: Vec3 =
      w.plane === "x"
        ? [w.at, (r.y0 + r.y1) / 2, mid]
        : [mid, (r.y0 + r.y1) / 2, w.at];
    const size: Vec3 =
      w.plane === "x"
        ? [WALL, r.y1 - r.y0, length]
        : [length, r.y1 - r.y0, WALL];
    return obb("staircase wall", frame(new Matrix4(), center), size);
  });

export const FLUR_FAR_WALL: readonly Obb[] = [
  flurFarWall("Flur wall", FLUR.x0, LIVING_DOORWAY.x0, 0, FLUR.height),
  flurFarWall("Flur wall", LIVING_DOORWAY.x1, FLUR.x1, 0, FLUR.height),
  flurFarWall(
    "Flur lintel",
    LIVING_DOORWAY.x0,
    LIVING_DOORWAY.x1,
    LIVING_DOORWAY.height,
    FLUR.height,
  ),
];

export const STAIRWELL_BOXES: readonly Obb[] = [
  obb(
    "staircase roof",
    frame(new Matrix4(), [
      (CORE.x0 + CORE.x1) / 2,
      BUILDING_HEIGHT + 0.15,
      (CORE.z0 + CORE.z1 - WALL) / 2,
    ]),
    [CORE.x1 - CORE.x0 + 2 * WALL, 0.3, CORE.z0 - CORE.z1 + WALL],
  ),
  obb(
    "Flur wall",
    frame(new Matrix4(), [
      FLUR.x0 - WALL / 2,
      floorLevel(1) + FLUR.height / 2,
      (FLUR.z0 + FLUR.z1) / 2,
    ]),
    [WALL, FLUR.height, FLUR.z1 - FLUR.z0 + 2 * WALL],
  ),
  obb(
    "Flur wall",
    frame(new Matrix4(), [
      (FLUR.x0 + FLUR.x1) / 2,
      floorLevel(1) + FLUR.height / 2,
      FLUR.z0 - WALL / 2,
    ]),
    [FLUR.x1 - FLUR.x0, FLUR.height, WALL],
  ),
  ...FLUR_FAR_WALL,
  obb(
    "Flur ceiling",
    frame(new Matrix4(), [
      (FLUR.x0 + FLUR.x1) / 2,
      floorLevel(1) + FLUR.height + 0.1,
      (FLUR.z0 + FLUR.z1) / 2,
    ]),
    [FLUR.x1 - FLUR.x0, 0.2, FLUR.z1 - FLUR.z0],
  ),
];

export const STAIRWELL_WALLS: readonly Obb[] = [
  ...WALL_PLANES.flatMap(wallBoxes),
  ...STAIRWELL_BOXES,
];

const nosingLine = (f: Flight): [Vec3, Vec3] => {
  const x = (f.lane.x0 + f.lane.x1) / 2;
  return [
    [x, f.from + f.rise, f.firstRiser],
    [
      x,
      f.from + f.risers * f.rise,
      f.firstRiser + f.direction * (f.risers - 1) * f.going,
    ],
  ];
};

const bar = (
  name: string,
  x: number,
  a: Vec3,
  b: Vec3,
  width: number,
  height: number,
): Obb => {
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const length = Math.hypot(dy, dz);
  return obb(
    name,
    frame(
      new Matrix4(),
      [x, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
      new Euler(Math.atan2(-dy, dz), 0, 0),
    ),
    [width, height, length],
  );
};

const raised = ([x, y, z]: Vec3, by: number): Vec3 => [x, y + by, z];

export const FLIGHT_SLABS: readonly Obb[] = FLIGHTS.filter(
  (f) => !f.solidBelow,
).map((f) => {
  const x = (f.lane.x0 + f.lane.x1) / 2;
  const half = slabDepth(f) / 2;
  const end = flightEnd(f);
  return bar(
    "flight slab",
    x,
    [x, slabTop(f, f.firstRiser) - half, f.firstRiser],
    [x, slabTop(f, end) - half, end],
    f.lane.x1 - f.lane.x0,
    SLAB_THICKNESS,
  );
});

export const HANDRAIL: readonly {
  readonly flight: string;
  readonly from: Vec3;
  readonly to: Vec3;
}[] = FLIGHTS.map((f) => {
  const [a, b] = nosingLine(f);
  const x = f.lane === LANE_A ? CORE.x0 + 0.08 : CORE.x1 - 0.08;
  return {
    flight: f.name,
    from: [x, a[1] + 0.9, a[2]],
    to: [x, b[1] + 0.9, b[2]],
  };
});

export const STAIRWELL_RAILINGS: readonly Obb[] = [
  ...FLIGHTS.map((f) => {
    const [a, b] = nosingLine(f);
    const x = f.lane === LANE_A ? LANE_SPLIT - 0.03 : LANE_SPLIT + 0.03;
    return bar("balustrade", x, raised(a, 0.45), raised(b, 0.45), 0.04, 0.9);
  }),
  obb(
    "balustrade",
    frame(new Matrix4(), [
      LANE_SPLIT + 0.03,
      floorLevel(1) + 0.45,
      (FLOOR_EDGE + EG_TOP) / 2,
    ]),
    [0.04, 0.9, FLOOR_EDGE - EG_TOP],
  ),
  ...HANDRAIL.map((h) => bar("handrail", h.from[0], h.from, h.to, 0.05, 0.05)),
];

export const CEILING_LAMPS: readonly Vec3[] = [
  [-1.9, HALF_LANDINGS[0].y - SLAB - 0.16, -3.3],
  [-1.25, floorLevel(1) - SLAB - 0.16, -7.6],
  [-2.1, floorLevel(2) - SLAB - 0.16, -9.0],
];

export type WallButton = { readonly position: Vec3; readonly normal: Vec3 };
export const BUTTON_SIZE: Vec3 = [0.08, 0.08, 0.02];
export const wallFrame = (on: WallButton): Matrix4 =>
  frame(
    new Matrix4(),
    on.position,
    new Euler(0, Math.atan2(on.normal[0], on.normal[2]), 0),
  );
export const buttonSolid = (button: WallButton): Obb =>
  obb("light button", wallFrame(button), BUTTON_SIZE);
export const TIBIK_LIGHT_BUTTON: WallButton = {
  position: [
    CORE.x0 + 0.012,
    floorLevel(1) + 1.05,
    FLAT_DOOR.center + FLAT_DOOR.opening / 2 + 0.12,
  ],
  normal: [1, 0, 0],
};
export const LIGHT_BUTTONS: readonly WallButton[] = [
  TIBIK_LIGHT_BUTTON,
  {
    position: [
      CORE.x1 - 0.012,
      floorLevel(1) + 1.05,
      FLAT_DOOR.center + FLAT_DOOR.opening / 2 + 0.12,
    ],
    normal: [-1, 0, 0],
  },
  {
    position: [-0.95, floorLevel(0) + 1.05, CORE.z0 - 0.012],
    normal: [0, 0, -1],
  },
];

export const DOORBELL = {
  size: [0.07, 0.1, 0.02] as Vec3,
  along: 0.17,
  height: 1.42,
  proud: 0.03,
};
export const doorLanding = (door: Door) => (door.hinge[0] < CORE.x0 ? -1 : 1);
export const doorbellCenter = (door: Door): Vec3 => [
  door.width + DOORBELL.along,
  DOORBELL.height,
  doorLanding(door) * DOORBELL.proud,
];
export const DOORBELL_BUTTON = {
  size: [0.024, 0.024, 0.006] as Vec3,
  height: 1.44,
};
export const doorbellButtonCenter = (door: Door): Vec3 => [
  door.width + DOORBELL.along,
  DOORBELL_BUTTON.height,
  doorLanding(door) *
    (DOORBELL.proud + DOORBELL.size[2] / 2 + DOORBELL_BUTTON.size[2] / 2),
];
export const doorbellButtonSolid = (door: Door): Obb =>
  obb(
    `${door.name} doorbell button`,
    doorFrame(door, 0),
    DOORBELL_BUTTON.size,
    doorbellButtonCenter(door),
  );
export const doorbellSolid = (door: Door): Obb =>
  obb(
    `${door.name} doorbell`,
    doorFrame(door, 0),
    DOORBELL.size,
    doorbellCenter(door),
  );

export const SMOKE_VENT_BUTTON = {
  size: [0.126, 0.126, 0.032] as Vec3,
  height: 1.4,
  proud: 0.001,
  color: "#e26e0e",
};
export type SmokeVentButton = WallButton & {
  readonly name: string;
  readonly storey: number;
};
const smokeVentButton = (
  name: string,
  storey: number,
  [x, z]: readonly [number, number],
  normal: Vec3,
): SmokeVentButton => {
  const off = SMOKE_VENT_BUTTON.size[2] / 2 + SMOKE_VENT_BUTTON.proud;
  return {
    name,
    storey,
    normal,
    position: [
      x + normal[0] * off,
      floorLevel(storey) + SMOKE_VENT_BUTTON.height,
      z + normal[2] * off,
    ],
  };
};
export const SMOKE_VENT_BUTTONS: readonly SmokeVentButton[] = [
  smokeVentButton("Rauchabzug EG", 0, [CORE.x1, CORE.z0 - 0.4], [-1, 0, 0]),
  smokeVentButton(
    `Rauchabzug ${STOREYS - 1}. OG`,
    STOREYS - 1,
    [-0.95, CORE.z1],
    [0, 0, 1],
  ),
];
export const smokeVentSolid = (button: SmokeVentButton): Obb =>
  obb(button.name, wallFrame(button), SMOKE_VENT_BUTTON.size);

export const NOTICE_BOARD = {
  center: [CORE.x1 - 0.012, 1.55, -4.7] as Vec3,
  size: [0.62, 0.8] as const,
};
export const A5 = [0.148, 0.21] as const;
const SHEET_GAP = 0.09;
export const HAUSVERWALTUNG_SHEET = {
  center: [
    NOTICE_BOARD.center[0],
    1.6,
    NOTICE_BOARD.center[2] + NOTICE_BOARD.size[0] / 2 + SHEET_GAP + A5[0] / 2,
  ] as Vec3,
  size: A5,
};

export const stairwellSolids = (doors: {
  readonly tibik: number;
  readonly tibikLever?: number;
}): Solid[] => [
  ...TREADS.map((t) => obb(t.name, frame(new Matrix4(), t.center), t.size)),
  ...FLIGHT_SLABS,
  ...STAIRWELL_WALLS,
  ...STAIRWELL_RAILINGS,
  ...doorSolids(TIBIK_DOOR, doors.tibik, doors.tibikLever),
  ...doorSolids(NEIGHBOUR_DOOR, 0),
  ...OTHER_FLAT_DOORS.flatMap((d) => doorSolids(d, 0)),
  ...LIGHT_BUTTONS.map(buttonSolid),
  ...SMOKE_VENT_BUTTONS.map(smokeVentSolid),
  ...LIFT_DOORS.flatMap((d) => doorSolids(d, 0)),
];

export const stepLift = (z: number, lead: number, span: number) =>
  DOOR_STEP.top * Math.min(1, Math.max(0, (DOOR_STEP.z1 + lead - z) / span));

export const DOOR_STEP = {
  x0: ENTRANCE_X - DOORSTEP.width / 2,
  x1: ENTRANCE_X + DOORSTEP.width / 2,
  z0: FACADE_Z,
  z1: FACADE_Z + DOORSTEP.depth,
  top: DOORSTEP.height,
};

export const stairwellGround = (x: number, z: number): number => {
  if (x >= FLUR.x0 && x < CORE.x0 && z >= FLUR.z0 && z <= FLUR.z1) {
    return floorLevel(1);
  }
  if (x >= CORE.x0 && x <= LANE_SPLIT && z >= CORE.z1 && z <= CORE.z0) {
    if (z <= EG_TOP) {
      return floorLevel(1);
    }
    if (z < EG_FIRST_RISER) {
      const k = Math.ceil((EG_FIRST_RISER - z) / GOING - 1e-9);
      return floorLevel(0) + Math.min(k, 17) * FLIGHTS[0].rise;
    }
    return floorLevel(0);
  }
  if (x > LANE_SPLIT && x <= CORE.x1 && z >= CORE.z1 && z <= CORE.z0) {
    return floorLevel(0);
  }
  if (x >= DOORWAY.x0 && x <= DOORWAY.x1 && z >= CORE.z0 && z <= FACADE_Z) {
    return floorLevel(0);
  }
  if (
    x >= DOOR_STEP.x0 &&
    x <= DOOR_STEP.x1 &&
    z >= DOOR_STEP.z0 &&
    z <= DOOR_STEP.z1
  ) {
    return DOOR_STEP.top;
  }
  return 0;
};

export const stairwellShown = ({ haustuer, indoors = 0 }: { readonly haustuer: number; readonly indoors?: number }) => haustuer > 0 || indoors > 0;
