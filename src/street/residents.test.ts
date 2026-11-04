import { expect, test } from "vitest";
import { FLYER } from "./layout";
import { HOUSES, NO_ADS, RESIDENTS, residentsOf } from "./building";

test("No. 12 and No. 13 across the street each have their own twelve tenants, no surname in both", () => {
  expect(HOUSES).toEqual([12, 13]);
  const [here, across] = HOUSES.map(residentsOf);
  for (const names of [here, across]) {
    expect(names).toHaveLength(12);
    expect(new Set(names).size).toBe(12);
  }
  expect(here.filter((name) => across.includes(name))).toEqual([]);
  expect(here).toContain("Tibik");
  expect(here).toContain("Schulz");
  expect(across).not.toContain("Tibik");
  expect(across).not.toContain("Schulz");
  expect(RESIDENTS).toEqual(here);
});

test("each house's 'Bitte keine Werbung!' sticker is on a tenant's own box, Schulz's at No. 12", () => {
  for (const house of HOUSES)
    expect(residentsOf(house)).toContain(NO_ADS[house]);
  expect(NO_ADS[12]).toBe("Schulz");
});

test("the pizza flyer sticks out of a No. 12 box only", () => {
  expect(FLYER.house).toBe(12);
  expect(residentsOf(FLYER.house)).toContain(FLYER.resident);
  expect(residentsOf(13)).not.toContain(FLYER.resident);
});
