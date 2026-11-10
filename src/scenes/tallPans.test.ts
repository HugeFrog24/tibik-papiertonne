import { Vector3 } from "three";
import { expect, test } from "vitest";
import { aspectOf, TIMELINE_FPS, type Format } from "../frameRate";
import type { CameraSetup, Shot } from "../toon/shots";
import { SHOTS as HAUSMUELL, cameraAt as hausmuell } from "./hausmuell/cameras";
import { HAUSMUELL_DURATION } from "./hausmuell/choreography";
import { SHOTS as KLINGELSTURM, cameraAt as klingelsturm } from "./klingelsturm/cameras";
import { KLINGELSTURM_DURATION } from "./klingelsturm/choreography";
import { NACHTRUHE_DURATION, NACHTRUHE_SHOTS, cameraAt as nachtruhe } from "./nachtruhe/cameras";
import { SHOTS as PAPIERTONNEN, cameraAt as papiertonnen } from "./papiertonnen/cameras";
import { PAPIERTONNEN_DURATION } from "./papiertonnen/choreography";
import { SHOTS as RUNDSCHREIBEN, cameraAt as rundschreiben } from "./rundschreiben/cameras";
import { RUNDSCHREIBEN_DURATION } from "./rundschreiben/choreography";
import { SHOTS as TREPPENHAUS, TREPPENHAUS_DURATION, cameraAt as treppenhaus } from "./treppenhaus/cameras";

const STEADY = 0.03;
const ROUNDING = 1.05;

const SCENES: readonly (readonly [string, readonly Shot[], (t: number, format: Format) => CameraSetup, number])[] = [
  ["Treppenhaus", TREPPENHAUS, treppenhaus, TREPPENHAUS_DURATION],
  ["Papiertonnen", PAPIERTONNEN, papiertonnen, PAPIERTONNEN_DURATION],
  ["Hausmuell", HAUSMUELL, hausmuell, HAUSMUELL_DURATION],
  ["Klingelsturm", KLINGELSTURM, klingelsturm, KLINGELSTURM_DURATION],
  ["Nachtruhe", NACHTRUHE_SHOTS, nachtruhe, NACHTRUHE_DURATION],
  ["Rundschreiben", RUNDSCHREIBEN, rundschreiben, RUNDSCHREIBEN_DURATION],
];

const view = (setup: CameraSetup) => new Vector3(...setup.target).sub(new Vector3(...setup.position)).normalize();

const yawPitch = (setup: CameraSetup) => {
  const v = view(setup);
  return [Math.atan2(v.x, v.z), Math.asin(v.y)];
};

const turnOf = (from: CameraSetup, to: CameraSetup) => {
  const [[yaw0, pitch0], [yaw1, pitch1]] = [yawPitch(from), yawPitch(to)];
  return { sideways: Math.abs(Math.atan2(Math.sin(yaw1 - yaw0), Math.cos(yaw1 - yaw0))), upAndDown: Math.abs(pitch1 - pitch0) };
};

const lensOf = (setup: CameraSetup, format: Format) => {
  const high = (setup.fov * Math.PI) / 180;
  return { sideways: 2 * Math.atan(Math.tan(high / 2) * aspectOf(format)), upAndDown: high };
};

test.each(SCENES)("%s: following someone adds at most a steady 3% of the 9:16 frame a frame to the turn of its 16:9 shot (sideways against its width, up and down against its height), so it never whips", (_, shots, cameraAt, duration) => {
  const problems: string[] = [];
  for (const shot of shots.filter((s) => s.tall)) {
    const frames: number[] = [];
    for (let f = Math.ceil(shot.from * TIMELINE_FPS); f < Math.min(shot.to, duration) * TIMELINE_FPS - 1e-6; f++) frames.push(f / TIMELINE_FPS);
    const talls = frames.map((t) => cameraAt(t, "tall"));
    const wides = frames.map((t) => cameraAt(t, "wide"));
    for (let i = 1; i < frames.length; i++) {
      const tall = turnOf(talls[i - 1], talls[i]);
      const wide = turnOf(wides[i - 1], wides[i]);
      const lens = lensOf(talls[i], "tall");
      for (const way of ["sideways", "upAndDown"] as const)
        if (tall[way] > (wide[way] + STEADY * lens[way]) * ROUNDING + 1e-9)
          problems.push(`${shot.name} ${frames[i].toFixed(2)} s: ${way} ${((tall[way] * 180) / Math.PI).toFixed(2)} deg (16:9 ${((wide[way] * 180) / Math.PI).toFixed(2)} deg)`);
    }
  }
  expect(problems.slice(0, 6)).toEqual([]);
});
