import { expect, test } from "vitest";
import { FLUR_PARTS } from "../building/flurShape";
import { RESIDENTS } from "./building";
import { DOORBELL_FACE, doorbellRow } from "./layout";

test("the outdoor station has a speaker grille above the bell buttons, for the handset in the flats", () => {
  expect(FLUR_PARTS.map((p) => p.name)).toContain("intercom handset");
  const { speaker, rows } = DOORBELL_FACE;
  expect(speaker.top).toBeGreaterThan(0);
  expect(speaker.height).toBeGreaterThanOrEqual(60);
  expect(speaker.top + speaker.height).toBeLessThan(rows.top);
});

test("every resident keeps a name row of readable height, below the grille and inside the panel", () => {
  const { px, rows } = DOORBELL_FACE;
  RESIDENTS.forEach((name, i) => {
    const row = doorbellRow(i);
    expect(row.height, name).toBeGreaterThanOrEqual(28);
    expect(row.y - row.height / 2, name).toBeGreaterThanOrEqual(rows.top);
    expect(row.y + row.height / 2, name).toBeLessThanOrEqual(rows.bottom);
  });
  expect(rows.bottom).toBeLessThanOrEqual(px[1]);
});
