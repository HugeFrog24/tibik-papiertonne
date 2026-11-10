import { Vector3 } from "three";
import { expect, test } from "vitest";
import { seenBy } from "../dialogue/screen";
import { SHOTS } from "../scenes/hausmuell/cameras";
import {
  BALCONIES,
  FACADE_Z,
  HOUSES,
  OPENINGS,
  OPENING_LAYERS,
  TILTED,
  TILTED_BY_HOUSE,
  balconyDecor,
  flatWindow,
  openingsOf,
  type Opening,
} from "./building";

const tilted = OPENINGS.filter((o) => o.tilted);

test("on this summer day a few casement windows stand tilted open (Kippstellung), never behind a lowered shutter, in both houses", () => {
  for (const house of HOUSES) {
    const openings = openingsOf(house);
    const open = openings.filter((o) => o.tilted);
    const windows = openings.filter((o) => o.kind === "window");
    expect(open.length).toBeGreaterThanOrEqual(3);
    expect(open.length / windows.length).toBeLessThanOrEqual(0.2);
    for (const o of open) {
      expect(o.kind).toBe("window");
      expect(o.shutter).toBe(0);
    }
    expect(openings.filter((o) => o.kind !== "window" && o.tilted)).toEqual([]);
    expect(open.length).toBe(TILTED_BY_HOUSE[house].length);
  }
  expect(OPENINGS).toEqual(openingsOf(12));
  expect(TILTED).toBe(TILTED_BY_HOUSE[12]);
});

test("No. 13 across the street is no copy of No. 12: other shutters down, other windows tilted, other balconies planted", () => {
  const [here, across] = [openingsOf(12), openingsOf(13)];
  const shutters = (o: readonly Opening[]) => o.map((w) => w.shutter);
  const tiltedAt = (o: readonly Opening[]) =>
    o.filter((w) => w.tilted).map((w) => `${w.x},${w.y}`);
  const differ = here.filter((o, i) => o.shutter !== across[i].shutter).length;
  expect(differ / here.length).toBeGreaterThan(0.3);
  expect(shutters(here)).not.toEqual(shutters(across));
  expect(tiltedAt(here).filter((p) => tiltedAt(across).includes(p))).toEqual(
    [],
  );
  const decor = (house: number) =>
    BALCONIES.map((_, i) => JSON.stringify(balconyDecor(house, i)));
  expect(decor(13)).not.toEqual(decor(12));
  expect(BALCONIES.map((_, i) => balconyDecor(12, i))).toEqual(
    BALCONIES.map((_, i) => ({ box: i % 3 === 0, dish: i === 4 })),
  );
});

test("a tilted window stays in the Hausmuell wide shot from its first frame to its last", () => {
  const wide = SHOTS.find((s) => s.name === "Wide: Hausverwaltung")!;
  for (const t of [wide.from, (wide.from + wide.to) / 2, wide.to - 1e-3]) {
    const setup = wide.at(t);
    const inFrame = tilted.filter((o) =>
      seenBy(new Vector3(o.x, o.y, FACADE_Z), setup, 0.025),
    );
    expect(inFrame.length, `at ${t.toFixed(2)} s`).toBeGreaterThanOrEqual(1);
  }
});

test("his bedroom window has no roller shutter, inside or out", () => {
  const his = flatWindow(12, 1, "links");
  expect(his.x).toBe(-8.8);
  expect(his.bedroom).toBe(true);
  expect(his.shutter).toBe(0);
  expect(his.tilted).toBe(false);
  expect(his.kind).toBe("window");
  const others = HOUSES.flatMap((house) => openingsOf(house)).filter((o) => o.bedroom);
  expect(others).toEqual([his]);
});

test("from the street a window shows no handle: the handle is on the inside of the casement, so nothing stands proud of the outer frame face but the shutter box", () => {
  const proud = Object.entries(OPENING_LAYERS).filter(([, z]) => z > OPENING_LAYERS.frame).map(([layer]) => layer);
  expect(proud).toEqual(["shutterBox"]);
});
