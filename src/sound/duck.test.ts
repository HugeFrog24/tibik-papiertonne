import { expect, test } from "vitest";
import { spokenSpans } from "../dialogue/voiced";
import { SPOKEN } from "../scenes/spokenLines";
import { STREET_LOOPS, streetLevel } from "../street/ambienceLoops";
import { OUT_IN_THE_STREET } from "../street/sceneAmbience";
import { FILM_AMBIENCE, FPS, SCENES } from "../timeline";
import { DUCK, duckUnder } from "./duck";

const SCENE_OF: Readonly<Record<string, string>> = {
  papiertonnen: "Papiertonnen",
  hausmuell: "Hausmuell",
  klingelsturm: "Klingelsturm",
  rundschreiben: "Rundschreiben",
};

test("ducking dips the background by 8 dB under speech, eases down just before a voice and back up after it, and leaves it alone between lines", () => {
  expect(20 * Math.log10(DUCK.floor)).toBeCloseTo(-8, 9);
  const duck = duckUnder([[2, 3]]);
  expect(duck(0)).toBe(1);
  expect(duck(2 - DUCK.attack - 0.01)).toBe(1);
  expect(duck(2)).toBeCloseTo(DUCK.floor, 9);
  expect(duck(2.5)).toBeCloseTo(DUCK.floor, 9);
  expect(duck(3)).toBeCloseTo(DUCK.floor, 9);
  expect(duck(3 + DUCK.release + 0.01)).toBe(1);
  const down = Array.from({ length: 10 }, (_, i) => duck(2 - DUCK.attack + (i * DUCK.attack) / 9));
  down.slice(1).forEach((v, i) => { expect(v).toBeLessThanOrEqual(down[i] + 1e-12); });
  const up = Array.from({ length: 10 }, (_, i) => duck(3 + (i * DUCK.release) / 9));
  up.slice(1).forEach((v, i) => { expect(v).toBeGreaterThanOrEqual(up[i] - 1e-12); });
});

test("every scene with lines ducks its background under each spoken line, on its own and in the film; the scenes without lines never duck", () => {
  let start = 0;
  for (const scene of SCENES) {
    const spoken = SPOKEN.find(({ key }) => SCENE_OF[key] === scene.name);
    if (!spoken) {
      for (let t = 0; t < scene.frames / FPS; t += 0.5) expect(scene.ambience.duck(t), scene.name).toBe(1);
    } else {
      const spanOf = spokenSpans(spoken.key, spoken.lines);
      for (const line of spoken.lines) {
        const [from, to] = spanOf(line);
        const mid = (from + to) / 2;
        expect(scene.ambience.duck(mid), `${scene.name}: ${line.name}`).toBeCloseTo(DUCK.floor, 6);
        const filmT = start / FPS + mid - (scene.skip ?? 0);
        if (filmT >= start / FPS && filmT < (start + scene.frames) / FPS) expect(FILM_AMBIENCE.duck(filmT), `film: ${line.name}`).toBeCloseTo(DUCK.floor, 6);
      }
    }
    start += scene.frames;
  }
});

test("the street's loops play at their level times the duck", () => {
  const ducked = { ...OUT_IN_THE_STREET, duck: () => DUCK.floor };
  for (const loop of STREET_LOOPS) expect(streetLevel(loop, 3, ducked, 1)).toBeCloseTo(streetLevel(loop, 3, OUT_IN_THE_STREET, 1) * DUCK.floor, 12);
});

test("the background stays down across a short pause between lines instead of pumping back up, and recovers in a long one", () => {
  const duck = duckUnder([[2, 3], [3 + DUCK.bridge - 0.05, 5], [9, 10]]);
  for (let t = 3; t <= 3 + DUCK.bridge; t += 0.05) expect(duck(t), t.toFixed(2)).toBeCloseTo(DUCK.floor, 9);
  expect(duck(7)).toBe(1);
  expect(DUCK.bridge).toBeGreaterThanOrEqual(0.8);
});
