import { readFileSync } from "node:fs";
import path from "node:path";
import type { Vector3 } from "three";
import { expect, test } from "vitest";
import { allColliders } from "../characters/skeleton";
import { TIMELINE_FPS } from "../frameRate";
import { betweenTicks } from "../physics/betweenTicks";
import type { Character } from "../physics/guards";
import { CAST_SCENES } from "./castScenes";
import { mm, seconds } from "./sceneChecks";

const OFF_THE_PATH = { slack: 0.01, bow: 1 / 4 };

const offThePath = (p: Vector3, a: Vector3, b: Vector3) => {
  const along = b.clone().sub(a);
  const u = along.lengthSq() === 0 ? 0 : Math.min(1, Math.max(0, p.clone().sub(a).dot(along) / along.lengthSq()));
  return p.distanceTo(a.clone().addScaledVector(along, u)) - OFF_THE_PATH.bow * along.length();
};

const bodiesOf = (characters: Readonly<Record<string, Character>>) =>
  Object.fromEntries(Object.entries(characters).map(([who, c]) => [who, allColliders(c.skeleton, c).map((sphere) => sphere.center)]));

test.each(CAST_SCENES)(
  "$name: rendered faster than the 30 fps its moves are timed and checked on, the frame halfway between two ticks shows everyone on their way from the one to the next: no part of anyone's body leaves the path between the two by more than a quarter of the way it travels, the most a limb swinging through a right angle in one tick bows out, and 1 cm: a body turning the long way round or blending across a jump in the story is metres off",
  { timeout: 900_000 },
  ({ duration, characters, cuts = [] }) => {
    const shown = betweenTicks(characters, cuts);
    const strays: string[] = [];
    let before = bodiesOf(shown(0));
    for (let f = 0; (f + 1) / TIMELINE_FPS <= duration; f++) {
      const [from, to] = [f / TIMELINE_FPS, (f + 1) / TIMELINE_FPS];
      const middle = (from + to) / 2;
      const [between, after] = [bodiesOf(shown(middle)), bodiesOf(shown(to))];
      if (!cuts.some((cut) => cut > from && cut <= to))
        for (const [who, points] of Object.entries(between)) {
          if (!(who in before) || !(who in after)) continue;
          const [a, b] = [before[who], after[who]];
          if (a.length !== points.length || b.length !== points.length) continue;
          const worst = Math.max(...points.map((p, i) => offThePath(p, a[i], b[i])));
          if (worst > OFF_THE_PATH.slack) strays.push(`${seconds(middle)} ${who}: ${mm(worst)} off the path`);
        }
      before = after;
    }
    expect(strays.slice(0, 10), `${strays.length} in-between frames stray`).toEqual([]);
  },
);

const SCENE_FILES = {
  Treppenhaus: "treppenhaus/Treppenhaus.tsx",
  Papiertonnen: "papiertonnen/Papiertonnen.tsx",
  Hausmuell: "hausmuell/Hausmuell.tsx",
  Klingelsturm: "klingelsturm/Klingelsturm.tsx",
  Nachtruhe: "nachtruhe/Nachtruhe.tsx",
  Rundschreiben: "rundschreiben/Rundschreiben.tsx",
};

test("every scene shows its solved state through betweenTicks, so a frame between two ticks is drawn from the ticks around it and never from a solve the 30 fps checks never saw", () => {
  for (const [scene, file] of Object.entries(SCENE_FILES)) {
    const lines = readFileSync(path.join(__dirname, file), "utf8").split(/\r?\n/).filter((line) => !line.startsWith("import "));
    const naming = lines.filter((line) => line.includes(`solve${scene}`));
    expect(naming.length, scene).toBeGreaterThan(0);
    for (const line of naming) expect(line, scene).toMatch(/betweenTicks\(/);
  }
});
