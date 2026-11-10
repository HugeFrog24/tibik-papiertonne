import { expect, test } from "vitest";
import type { ArmName } from "../characters/skeleton";
import type { Hold } from "../physics/holds";
import { KAREN_LEFT_HOLDS, KAREN_RIGHT_HOLDS, TIBIK_LEFT_HOLDS, TIBIK_RIGHT_HOLDS } from "./klingelsturm/solve";
import { NACHTRUHE_HOLDS } from "./nachtruhe/solve";
import { PAPIERTONNEN_HOLDS } from "./papiertonnen/choreography";
import { RUNDSCHREIBEN_HOLDS } from "./rundschreiben/solve";
import { HOLDS as TREPPENHAUS_HOLDS } from "./treppenhaus/choreography";

const ARMS: readonly ArmName[] = ["leftArm", "rightArm"];
const JUST = 1e-6;

const crowded = (holds: readonly Hold[]) =>
  ARMS.flatMap((arm) => {
    const own = holds.filter((h) => h.arm === arm);
    const moments = own.flatMap((h) => [h.reach + JUST, h.grip, h.release, h.done - JUST]);
    return moments.flatMap((t) => {
      const active = own.filter((h) => t > h.reach && t < h.done);
      return active.length > 2 ? [`${arm} at ${t.toFixed(3)}: ${active.map((h) => h.name).join(" + ")}`] : [];
    });
  });

const hold = (name: string, reach: number, done: number): Hold => ({
  name,
  arm: "leftArm",
  reach,
  grip: reach + 0.1,
  release: done - 0.1,
  done,
  target: () => {
    throw new Error("not reached");
  },
});

test("an arm never has three holds at once: workArm blends only the first two, so a third would be skipped without a word", () => {
  expect(crowded([hold("a", 0, 1), hold("b", 0.5, 2), hold("c", 0.8, 3)])).not.toEqual([]);
  const lists: Readonly<Record<string, readonly Hold[]>> = {
    Treppenhaus: TREPPENHAUS_HOLDS,
    Papiertonnen: PAPIERTONNEN_HOLDS,
    "Klingelsturm, Tibik's left hand": TIBIK_LEFT_HOLDS,
    "Klingelsturm, Tibik's right hand": TIBIK_RIGHT_HOLDS,
    "Klingelsturm, Karen's left hand": KAREN_LEFT_HOLDS,
    "Klingelsturm, Karen's right hand": KAREN_RIGHT_HOLDS,
    Nachtruhe: NACHTRUHE_HOLDS,
    Rundschreiben: RUNDSCHREIBEN_HOLDS,
  };
  expect(Object.entries(lists).flatMap(([scene, holds]) => crowded(holds).map((c) => `${scene}: ${c}`))).toEqual([]);
});
