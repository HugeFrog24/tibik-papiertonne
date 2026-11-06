import { expect, test } from "vitest";
import { wrapAngle } from "../../characters/scalar";
import {
  TOLERANCE,
  frameLabel,
  framesOf,
  penetrations,
  mm,
  tibikHeadOutOfFrame,
} from "../sceneChecks";
import { cameraAt as papiertonnenCameraAt } from "./cameras";
import { contacts, deepest, type Solid } from "../../physics/collision";
import { Vector3 } from "three";
import { armIntoTorso, torsoMatrix } from "../../characters/skeleton";
import {
  BINS,
  FOUND_SHEET,
  SEARCHED_BIN,
  STREET_SOLIDS,
  WINDOWS,
  binContentSolids,
  binItemColliders,
  type BinSpec,
} from "../../street/layout";
import {
  tonneColliders,
  tonneLid,
  tonneLidParts,
} from "../../street/tonneShape";
import { ARM_WALK, RIG, TIBIK_REST } from "../../Tibik/rig";
import {
  PAPIERTONNEN_DURATION,
  SHOT_FOUND_BOX,
  lidAt,
  papiertonnenHaustuerAt,
  tibikAt,
} from "./choreography";
import { solveTreppenhaus, treppenhausEnd } from "../treppenhaus/solve";
import { storyTime } from "../treppenhaus/cameras";
import { FPS, TREPPENHAUS_FRAMES } from "../../timeline";
import { OUTLINE } from "../../toon/primitives";
import {
  binContentViolations,
  guardLid,
  headToKarton,
  papiertonnenEnd,
  papiertonnenViolations,
  solvePapiertonnen,
} from "./solve";

test(
  "Papiertonnen: nothing passes through anything, in any frame",
  { timeout: 120_000 },
  () => {
    expect(
      penetrations(
        framesOf(PAPIERTONNEN_DURATION, FPS),
        (frame) => papiertonnenViolations(solvePapiertonnen(frame / FPS)),
        frameLabel,
      ),
    ).toEqual([]);
  },
);

test(
  "Papiertonnen: bin contents fit inside their bins (lids open or closed)",
  { timeout: 120_000 },
  () => {
    expect(
      penetrations(
        framesOf(PAPIERTONNEN_DURATION, FPS, 5),
        (frame) => binContentViolations(solvePapiertonnen(frame / FPS).lids),
        frameLabel,
      ),
    ).toEqual([]);
  },
);

test("the content check catches a sheet poking through a bin wall", () => {
  const bin = BINS[1];
  const clipping: BinSpec = {
    ...bin,
    contents: [
      {
        name: "bad sheet",
        position: [0.02, 1.0, 0.12],
        rotation: [0.28, 0.1, 0],
        size: [0.5, 0.025, 0.5],
        material: "cardboard",
      },
    ],
  };
  const hits = contacts(
    binItemColliders(clipping),
    tonneColliders(bin.name, bin.position, 0.22),
  );
  expect(deepest(hits)).toBeGreaterThan(TOLERANCE);
});

test(
  "Papiertonnen: guards only nudge the performance, they don't rewrite it",
  { timeout: 120_000 },
  () => {
    for (let frame = 0; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
      const { tibik } = solvePapiertonnen(frame / FPS);
      expect(
        Math.abs(tibik.position[1] - tibikAt(frame / FPS).position[1]),
      ).toBeLessThan(0.01);
      expect(tibik.pose.bob).toBeLessThan(0.15);
    }
  },
);

test("the resting pose touches the belly without sinking into it", () => {
  const depth = armIntoTorso(RIG, TIBIK_REST, "leftArm");
  expect(depth).toBeLessThanOrEqual(TOLERANCE);
  expect(depth).toBeGreaterThan(-0.02);
});

test("walking arms swing past the belly without sinking into it", () => {
  for (let swing = -0.45; swing <= 0.45; swing += 0.05) {
    const pose = {
      ...TIBIK_REST,
      leftArm: { ...ARM_WALK, raise: ARM_WALK.raise + swing },
    };
    expect(armIntoTorso(RIG, pose, "leftArm")).toBeLessThanOrEqual(TOLERANCE);
  }
});

test("a lid flipped open under a window stops at the sill instead of passing through it", () => {
  const window = WINDOWS.find((w) => w.y < 3)!;
  const bin = {
    ...BINS.find((b) => b.name === SEARCHED_BIN)!,
    position: [window.x, 0, BINS[0].position[2]] as [number, number, number],
  };
  const fullyOpen = lidAt(PAPIERTONNEN_DURATION);
  const hitsHouse = (angle: number) =>
    deepest(contacts([tonneLid(bin.name, bin.position, angle)], STREET_SOLIDS));
  expect(hitsHouse(fullyOpen)).toBeGreaterThan(TOLERANCE);
  expect(hitsHouse(guardLid(bin, fullyOpen))).toBeLessThanOrEqual(TOLERANCE);
});

test("the box is taken out of the bin on screen, without jumping", () => {
  const worldPosition = (frame: number) => {
    const state = solvePapiertonnen(frame / FPS);
    const tibik = { ...state.tibik, skeleton: RIG };
    const karton = state.karton!;
    return new Vector3(...karton.position).applyMatrix4(
      torsoMatrix(RIG, tibik),
    );
  };
  const bin = BINS.find((b) => b.name === SEARCHED_BIN)!;
  const lying = bin.contents.find((i) => i.name === FOUND_SHEET)!;
  const inBin = new Vector3(...lying.position).add(
    new Vector3(...bin.position),
  );
  const first = SHOT_FOUND_BOX * FPS;
  expect(worldPosition(first).distanceTo(inBin)).toBeLessThan(0.002);
  for (let frame = first + 1; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
    expect(
      worldPosition(frame).distanceTo(worldPosition(frame - 1)),
    ).toBeLessThan(0.1);
  }
}, 120_000);

const LIDS_OPEN_AT = 0.01;
const restsOnSomething = (
  bin: (typeof BINS)[number],
  angle: number,
  supports: Solid[],
) => {
  const fallen = angle + (angle < Math.PI / 2 ? -0.03 : 0.03);
  return (
    deepest(contacts(tonneLidParts(bin.name, bin.position, fallen), supports)) >
    0
  );
};

test(
  "open lids never hang in the air: at rest, they lean on something",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    let before = solvePapiertonnen(0);
    for (let frame = 1; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
      const now = solvePapiertonnen(frame / FPS);
      const supports = [
        ...STREET_SOLIDS,
        ...binContentSolids(now.karton ? FOUND_SHEET : undefined),
      ];
      BINS.forEach((bin, i) => {
        const angle = now.lids[i];
        const still = Math.abs(angle - before.lids[i]) < 1e-4;
        if (
          angle > LIDS_OPEN_AT &&
          still &&
          !restsOnSomething(bin, angle, supports)
        ) {
          problems.push(
            `frame ${frame}: ${bin.name} lid open at ${((angle * 180) / Math.PI).toFixed(1)}° with nothing holding it`,
          );
        }
      });
      before = now;
    }
    expect(problems).toEqual([]);
  },
);

test("the lid check catches a lid left hanging just short of vertical", () => {
  const bin = BINS.find((b) => b.name === SEARCHED_BIN)!;
  expect(restsOnSomething(bin, 1.55, [...STREET_SOLIDS])).toBe(false);
  expect(
    restsOnSomething(bin, guardLid(bin, lidAt(PAPIERTONNEN_DURATION)), [
      ...STREET_SOLIDS,
    ]),
  ).toBe(true);
});

test(
  "his chin keeps clear of the box and its flaps, by at least their ink outline",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (let frame = 0; frame < PAPIERTONNEN_DURATION * FPS; frame++) {
      const { tibik, karton } = solvePapiertonnen(frame / FPS);
      const gap = karton ? headToKarton(tibik, karton) : Infinity;
      if (gap < OUTLINE) {
        problems.push(`frame ${frame}: head ${mm(gap)} from the box`);
      }
    }
    expect(problems).toEqual([]);
  },
);

test("papiertonnen ends exactly as before the re-staging", () => {
  const { lids, tibik, karton } = papiertonnenEnd();
  expect({
    lids,
    position: tibik.position,
    rotationY: tibik.rotationY,
    pose: tibik.pose,
    karton,
  }).toMatchSnapshot();
});

const numbersIn = (value: unknown, path = ""): [string, number][] =>
  typeof value === "number"
    ? [[path, value]]
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(([key, inner]) =>
          numbersIn(inner, `${path}.${key}`),
        )
      : [];

test(
  "papiertonnen starts exactly where the treppenhaus ends",
  { timeout: 120_000 },
  () => {
    const end = treppenhausEnd();
    const lastShown = solveTreppenhaus(
      storyTime((TREPPENHAUS_FRAMES - 1) / FPS),
    );
    const shownDiff = numbersIn(lastShown.tibik).filter(
      ([key, v]) =>
        Math.abs(v - (new Map(numbersIn(end.tibik)).get(key) ?? NaN)) > 1e-4 ||
        Number.isNaN(v),
    );
    expect(
      shownDiff,
      "the treppenhaus still moves after its last shown frame",
    ).toEqual([]);
    expect(lastShown.haustuer).toBe(end.haustuer);
    const start = solvePapiertonnen(0);
    start.tibik.position.forEach((v, i) =>
      expect(v, `position ${i}`).toBeCloseTo(end.tibik.position[i], 4),
    );
    expect(
      Math.abs(wrapAngle(start.tibik.rotationY - end.tibik.rotationY)),
    ).toBeLessThan(1e-4);
    const before = new Map(numbersIn(end.tibik.pose));
    const off = numbersIn(start.tibik.pose)
      .filter(
        ([key, v]) => !before.has(key) || Math.abs(v - before.get(key)!) > 1e-4,
      )
      .map(
        ([key, v]) =>
          `${key}: ${v.toFixed(5)} vs ${before.get(key)?.toFixed(5)}`,
      );
    expect(off).toEqual([]);
    expect(papiertonnenHaustuerAt(0)).toBe(end.haustuer);
    expect(start.haustuer).toBe(end.haustuer);
  },
);

test(
  "lids keep their ink outline out of the house wall and its sills, open or shut",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (
      let frame = 0;
      frame < Math.round(PAPIERTONNEN_DURATION * FPS);
      frame += 3
    ) {
      const { lids } = solvePapiertonnen(frame / FPS);
      BINS.forEach((bin, i) => {
        const depth = deepest(
          contacts(
            tonneLidParts(bin.name, bin.position, lids[i], OUTLINE),
            STREET_SOLIDS,
          ),
        );
        if (depth > 0.001)
          problems.push(
            `frame ${frame}: ${bin.name} lid outline ${mm(depth, 0)} into the house`,
          );
      });
    }
    expect(problems.slice(0, 6)).toEqual([]);
  },
);

test("in 'Side: open the lid' the top of his head and his eyes are in frame", () => {
  const frames = Array.from({ length: Math.round((6.3 - 4.7) * FPS) }, (_, i) => 4.7 + i / FPS);
  expect(frames.flatMap((t) => tibikHeadOutOfFrame(solvePapiertonnen(t).tibik, papiertonnenCameraAt(t)).map((part) => `${t.toFixed(2)} s: ${part}`)).slice(0, 6)).toEqual([]);
});
