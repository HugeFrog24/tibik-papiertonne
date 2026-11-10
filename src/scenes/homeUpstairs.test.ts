import { expect, test } from "vitest";
import { EG_FIRST_RISER } from "../building/stairwell";
import { BALUSTRADE_SIDE, STAIR_SIDE } from "./enterHouse";
import { ENTRY as AT_DUSK } from "./nachtruhe/timeline";
import { solveNachtruhe } from "./nachtruhe/solve";
import { ENTRY as IN_THE_RAIN } from "./rundschreiben/choreography";
import { solveRundschreiben } from "./rundschreiben/solve";

const FACING_UP_THE_FLIGHT = Math.PI;

test("coming home he turns left inside, to the foot of the stairs up to his flat, and stands facing up the flight; he never turns away to the right", { timeout: 300_000 }, () => {
  for (const [entry, at] of [[IN_THE_RAIN, (t: number) => solveRundschreiben(t).tibik], [AT_DUSK, (t: number) => solveNachtruhe(t).tibik]] as const) {
    const end = at(entry.inWalk[1] + 0.3);
    const [x, , z] = end.position;
    expect(x, "in the stairs' lane").toBeLessThan(BALUSTRADE_SIDE);
    expect(x).toBeGreaterThan(STAIR_SIDE);
    expect(z, "at the foot of the flight").toBeGreaterThan(EG_FIRST_RISER);
    expect(z).toBeLessThan(EG_FIRST_RISER + 0.5);
    expect(Math.abs(Math.atan2(Math.sin(end.rotationY - FACING_UP_THE_FLIGHT), Math.cos(end.rotationY - FACING_UP_THE_FLIGHT))), "facing up the flight").toBeLessThan(0.2);
    for (let t = entry.inWalk[0]; t <= entry.inWalk[1] + 0.3; t += 1 / 30) {
      const yaw = at(t).rotationY;
      expect(Math.atan2(Math.sin(yaw - FACING_UP_THE_FLIGHT), Math.cos(yaw - FACING_UP_THE_FLIGHT)), `${t.toFixed(2)} s turned to his right`).toBeGreaterThan(-0.35);
    }
  }
});
