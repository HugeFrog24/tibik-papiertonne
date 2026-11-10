import { Matrix4 } from "three";
import { expect, test } from "vitest";
import { contacts, frame, obb } from "../physics/collision";
import { DOORWAY, facadePieces } from "./facade";
import {
  ENTRANCE_LAMP,
  ENTRANCE_X,
  FACADE_Z,
  STREET_PARTS,
  STREET_SOLIDS,
} from "./layout";
import { facadeClashes, rectOf } from "./streetChecks";

const lamp = STREET_PARTS.find((p) => p.name === "entrance lamp")!;

test("a wall lamp lights the entrance, beside the Haustür, 2–2.5 m up as a motion sensor wants", () => {
  expect(lamp).toBeDefined();
  expect(lamp.center[1]).toBeGreaterThanOrEqual(2.0);
  expect(lamp.center[1]).toBeLessThanOrEqual(2.5);
  const r = rectOf(lamp);
  const beside = Math.max(DOORWAY.x0 - r.x1, r.x0 - DOORWAY.x1);
  expect(beside).toBeGreaterThan(0);
  expect(beside).toBeLessThan(1.0);
  expect(Math.sign(lamp.center[0] - ENTRANCE_X)).toBe(-1);
});

test("the lamp hangs flat on the facade, clear of every window, frame, panel and the mailboxes", () => {
  expect(lamp.center[2] - lamp.size[2] / 2).toBeCloseTo(FACADE_Z, 9);
  expect(facadeClashes(lamp)).toEqual([]);
});

test("the lamp is solid and touches nothing in the street but the wall it hangs on", () => {
  const solid = obb(
    lamp.name,
    frame(new Matrix4(), lamp.center),
    lamp.size,
  );
  expect(STREET_SOLIDS.filter((s) => s.name === lamp.name).length).toBe(1);
  const facade = new Set(facadePieces().map((p) => p.name));
  const rest = STREET_SOLIDS.filter(
    (s) => s.name !== lamp.name && !facade.has(s.name),
  );
  expect(contacts([solid], rest).map((c) => c.b)).toEqual([]);
  expect(ENTRANCE_LAMP.size).toEqual(lamp.size);
});
