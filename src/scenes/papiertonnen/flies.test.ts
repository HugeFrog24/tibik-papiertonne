import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { Vector3 } from "three";
import { bodyColliders } from "../../characters/skeleton";
import { onScreen, seenBy, withinFrame } from "../../dialogue/screen";
import { contacts, sphere } from "../../physics/collision";
import {
  binByName,
  binItemColliders,
  FOUND_SHEET,
  SEARCHED_BIN,
} from "../../street/layout";
import { FLY } from "../../street/flyShape";
import { TONNE } from "../../street/tonneShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { FPS } from "../../timeline";
import { cameraAt, insideBinCamera } from "./cameras";
import { buzzVolume, flyBuzzSound } from "./flyBuzz";
import {
  PAPIERTONNEN_DURATION,
  SHOT_FOUND_BOX,
  SHOT_INSIDE_BIN,
  lidAt,
} from "./choreography";
import { DEPARTURES, FLY_COUNT, flyAt } from "./flyPaths";
import { heldKartonSolids, sceneSolids, solvePapiertonnen } from "./solve";

const FLUNG = 1.5;
const LENS = 0.045;
const CLOSE = 0.07;
const LINGER = 0.3;
const CLEAR = FLY.reach + 0.005;

const times = (from: number, to: number, step = 1 / FPS) =>
  Array.from(
    { length: Math.round((to - from) / step) },
    (_, k) => from + k * step,
  );
const flies = Array.from({ length: FLY_COUNT }, (_, i) => i);
const [bx, , bz] = binByName(SEARCHED_BIN).position;

test("until they leave, the flies keep to the searched bin: inside it, or around its mouth once the lid is flung open", () => {
  const problems: string[] = [];
  for (const t of times(0, PAPIERTONNEN_DURATION)) {
    for (const i of flies) {
      const leaves = DEPARTURES[i];
      if (leaves !== undefined && t >= leaves) continue;
      const [px, y, pz] = flyAt(i, t).position;
      const [x, z] = [px - bx, pz - bz];
      const inside =
        Math.abs(x) < TONNE.width / 2 - TONNE.wall &&
        Math.abs(z) < TONNE.depth / 2 - TONNE.wall &&
        y < TONNE.height;
      const mouth =
        lidAt(t) > FLUNG &&
        Math.abs(x) < TONNE.width / 2 &&
        Math.abs(z) < TONNE.depth / 2 &&
        y < 1.4;
      if (!inside && !mouth)
        problems.push(
          `${t.toFixed(2)} s: fly ${i} at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`,
        );
    }
  }
  expect(problems.slice(0, 5)).toEqual([]);
});

test(
  "no fly touches anything: bin, lid, the paper inside, the carton or Tibik",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (const t of times(0, PAPIERTONNEN_DURATION)) {
      const state = solvePapiertonnen(t);
      const tibik = bodyColliders(RIG, asCharacter(state.tibik));
      const solids = [
        ...sceneSolids(
          state.lids,
          state.karton !== null,
          state.haustuer,
          state.indoors,
        ),
        ...heldKartonSolids(state),
        ...binItemColliders(binByName(SEARCHED_BIN)).filter(
          (item) => !(state.karton && item.name.endsWith(FOUND_SHEET)),
        ),
        ...tibik.head,
        ...tibik.torso,
        ...tibik.leftArm,
        ...tibik.rightArm,
        ...tibik.legs,
      ];
      for (const i of flies) {
        const at = new Vector3(...flyAt(i, t).position);
        for (const c of contacts([sphere(`fly ${i}`, at, CLEAR)], solids))
          problems.push(`${t.toFixed(2)} s: fly ${i} touches ${c.b}`);
      }
    }
    expect(problems.slice(0, 5)).toEqual([]);
  },
);

test("no fly flies into the lens of the bin's-eye camera", () => {
  const problems: string[] = [];
  for (const t of times(SHOT_INSIDE_BIN, SHOT_FOUND_BOX)) {
    const lens = new Vector3(...insideBinCamera(t - SHOT_INSIDE_BIN).position);
    for (const i of flies) {
      const gap = lens.distanceTo(new Vector3(...flyAt(i, t).position));
      if (gap < LENS)
        problems.push(
          `${t.toFixed(2)} s: fly ${i} ${(gap * 100).toFixed(0)} cm from the lens`,
        );
    }
  }
  expect(problems.slice(0, 5)).toEqual([]);
});

test("in the bin's-eye shot every fly is on screen for most of the time", () => {
  const shot = times(SHOT_INSIDE_BIN, SHOT_FOUND_BOX);
  for (const i of flies) {
    const seen = shot.filter((t) => {
      const setup = insideBinCamera(t - SHOT_INSIDE_BIN);
      const p = new Vector3(...flyAt(i, t).position);
      return seenBy(p, setup);
    });
    expect(seen.length / shot.length).toBeGreaterThan(0.5);
  }
});

test("they fly like house flies: straight runs and sharp turns, never faster than 2 m/s", () => {
  const step = 1 / 120;
  for (const i of flies) {
    const path = times(0, PAPIERTONNEN_DURATION, step).map(
      (t) => new Vector3(...flyAt(i, t).position),
    );
    const velocity = path
      .slice(1)
      .map((p, k) => p.clone().sub(path[k]).divideScalar(step));
    const fastest = Math.max(...velocity.map((v) => v.length()));
    expect(fastest).toBeLessThanOrEqual(2);
    const lag = Math.round(0.1 / step);
    let turns = 0;
    let turning = false;
    velocity.slice(lag).forEach((v, k) => {
      const before = velocity[k];
      const sharp =
        v.length() > 0.05 &&
        before.length() > 0.05 &&
        v.angleTo(before) > Math.PI / 3;
      if (sharp && !turning) turns++;
      turning = sharp;
    });
    const perSecond = turns / PAPIERTONNEN_DURATION;
    expect(perSecond).toBeGreaterThan(1);
    expect(perSecond).toBeLessThan(4);
  }
});

test("each fly plays its own learned buzz", () => {
  const model = JSON.parse(
    readFileSync("assets/recordings/flies.model.json", "utf8"),
  ) as { flies: { sound: string }[] };
  expect(flies.map(flyBuzzSound)).toEqual(model.flies.map((f) => f.sound));
});

test("the buzz is loud in the bin's-eye shot and lost in the street from across it", () => {
  const loudest = (from: number, to: number) =>
    Math.max(
      ...times(from, to).flatMap((t) => flies.map((i) => buzzVolume(i, t))),
    );
  expect(loudest(SHOT_INSIDE_BIN, SHOT_FOUND_BOX)).toBeGreaterThan(0.2);
  expect(loudest(0, SHOT_INSIDE_BIN - 1.6)).toBeLessThan(0.08);
});

test("even right at the lens a fly stays a background sound, and the three together never drone", () => {
  for (const t of times(SHOT_INSIDE_BIN, SHOT_FOUND_BOX)) {
    const each = flies.map((i) => buzzVolume(i, t));
    expect(Math.max(...each), t.toFixed(2)).toBeLessThanOrEqual(0.3);
    expect(
      Math.sqrt(each.reduce((sum, v) => sum + v * v, 0)),
      t.toFixed(2),
    ).toBeLessThan(0.5);
  }
});

test("a fly nearer the camera is louder", () => {
  for (const t of times(SHOT_INSIDE_BIN, SHOT_FOUND_BOX)) {
    const lens = new Vector3(...cameraAt(t).position);
    const byDistance = [...flies].sort(
      (a, b) =>
        lens.distanceTo(new Vector3(...flyAt(a, t).position)) -
        lens.distanceTo(new Vector3(...flyAt(b, t).position)),
    );
    const volumes = byDistance.map((i) => buzzVolume(i, t));
    volumes
      .slice(1)
      .forEach((v, k) => { expect(v).toBeLessThanOrEqual(volumes[k]); });
  }
});

test("in the bin's-eye shot every fly hovers right in front of the lens, on screen, for a moment", () => {
  for (const i of flies) {
    const close = times(SHOT_INSIDE_BIN, SHOT_FOUND_BOX).filter((t) => {
      const setup = insideBinCamera(t - SHOT_INSIDE_BIN);
      const p = new Vector3(...flyAt(i, t).position);
      return (
        withinFrame(onScreen(p, setup)) &&
        p.distanceTo(new Vector3(...setup.position)) < CLOSE
      );
    });
    expect(close.length / FPS, `fly ${i}`).toBeGreaterThanOrEqual(LINGER);
  }
});

test("the flies never bump into each other", () => {
  const problems: string[] = [];
  for (const t of times(0, PAPIERTONNEN_DURATION))
    for (const a of flies)
      for (const b of flies.filter((k) => k > a)) {
        const gap = new Vector3(...flyAt(a, t).position).distanceTo(
          new Vector3(...flyAt(b, t).position),
        );
        if (gap < 2 * FLY.reach)
          problems.push(`${t.toFixed(2)} s: flies ${a} and ${b}`);
      }
  expect(problems.slice(0, 5)).toEqual([]);
});

test("once the box is found the flies disperse: two fly off up and away and fall silent, one stays by the bin", () => {
  const end = PAPIERTONNEN_DURATION - 0.05;
  const mouth = new Vector3(bx, TONNE.height, bz);
  const gone = flies.filter((i) => DEPARTURES[i] !== undefined);
  expect(gone).toHaveLength(FLY_COUNT - 1);
  for (const i of gone) {
    expect(DEPARTURES[i]!).toBeGreaterThanOrEqual(SHOT_FOUND_BOX);
    expect(
      new Vector3(...flyAt(i, end).position).distanceTo(mouth),
    ).toBeGreaterThan(1.5);
    expect(buzzVolume(i, end)).toBeLessThan(0.02);
  }
  const stays = flies.find((i) => DEPARTURES[i] === undefined)!;
  expect(
    new Vector3(...flyAt(stays, end).position).distanceTo(mouth),
  ).toBeLessThan(0.5);
});
