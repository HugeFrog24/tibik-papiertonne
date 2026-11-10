import { expect, test } from "vitest";
import { Vector3 } from "three";
import { TIMELINE_FPS } from "../../frameRate";
import { doorFrame } from "../../building/doors";
import { HAUSTUER } from "../../street/facade";
import { cameraAt, shotAt } from "./cameras";
import { ENTRY, RUNDSCHREIBEN_DURATION } from "./choreography";

const DOOR_CENTRE = new Vector3(HAUSTUER.width / 2, HAUSTUER.height / 2, 0).applyMatrix4(doorFrame(HAUSTUER, 0));

const offCentre = (t: number, format: "wide" | "tall") => {
  const { position, target } = cameraAt(t, format);
  const eye = new Vector3(...position);
  const look = new Vector3(...target).sub(eye).setY(0).normalize();
  const toDoor = DOOR_CENTRE.clone().sub(eye).setY(0).normalize();
  return Math.acos(Math.min(1, look.dot(toDoor)));
};

test("the coda's last moments look at the Haustür, centred in both formats, once he has gone in and the closer pulls it shut behind him", () => {
  expect(shotAt(RUNDSCHREIBEN_DURATION - 0.1).name).toBe("Coda");
  for (let t = ENTRY.inWalk[1]; t <= RUNDSCHREIBEN_DURATION - 1 / TIMELINE_FPS; t += 0.25)
    for (const format of ["wide", "tall"] as const) expect(offCentre(t, format), `${format} ${t.toFixed(2)} s`).toBeLessThan(0.05);
});
