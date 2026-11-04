import { expect, test } from "vitest";
import { SPITTLE } from "./spittle";
import { SPRAY } from "./spray";
import { DROP, bodyOf } from "./sprayLook";

test("every drop and spittle line keeps its outline inside the size the physics flies, so no outline pokes into what it hits", () => {
  for (const r of [...SPRAY.radius, SPITTLE.radius, SPITTLE.bead]) {
    expect(bodyOf(r) + DROP.ink).toBeLessThanOrEqual(r + 1e-12);
    expect(bodyOf(r)).toBeGreaterThanOrEqual(0.001);
  }
});
