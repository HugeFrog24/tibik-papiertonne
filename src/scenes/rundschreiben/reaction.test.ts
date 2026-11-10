import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { BLINK } from "../../characters/animate";
import { DEADPAN_HOLD, LINES, ON_HIS_FACE, TAKING_IT_IN, THANKS, rundschreibenTibikAt } from "./choreography";
import { RUNDSCHREIBEN_AMBIENCE, RUNDSCHREIBEN_CUES } from "./soundCues";
import { DUCK } from "../../sound/duck";
import { spokenSpans } from "../../dialogue/voiced";
import { LETTER_READ } from "./narration";
import { FILM_AMBIENCE, TIMELINE_FPS, SCENES } from "../../timeline";
import { FOLDING_SHOT, cameraAt, shotAt } from "./cameras";
import { solveRundschreiben } from "./solve";
import { Vector3 } from "three";
import { FORMATS, type Format } from "../../frameRate";
import { eyesInWorld } from "../../characters/skeleton";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { inFront, onScreen } from "../../dialogue/screen";
import { framesIn } from "../sceneChecks";

test("just after the cut from the letter to his face, Tibik says 'Hä?' with a puzzled tilt of the head, and is done before the shot changes", () => {
  expect(LINES).toHaveLength(1);
  const [reaction] = LINES;
  expect(reaction).toMatchObject({ speaker: "tibik", text: "Hä?", tone: "calm" });
  expect(reaction.from).toBeGreaterThan(THANKS[1] + DEADPAN_HOLD);
  expect(reaction.to).toBeLessThanOrEqual(FOLDING_SHOT);
  const middle = (reaction.from + reaction.to) / 2;
  expect(shotAt(middle).name).toBe("Tibik");
  expect(Math.abs(rundschreibenTibikAt(middle).pose.headRoll)).toBeGreaterThan(0.08);
  expect(rundschreibenTibikAt(reaction.from - 0.6).pose.headRoll).toBeCloseTo(0, 6);
});

test("the scene shows his line in the subtitle bar", () => {
  const scene = readFileSync(path.join("src", "scenes", "rundschreiben", "Rundschreiben.tsx"), "utf8");
  expect(scene.includes("<DialogueTrack lines={LINES} />")).toBe(true);
});

test("on the cut to his face he takes it in with two slow blinks before 'Hä?', a finger snap marking each as his lids shut, and the shot holds a beat after the line", () => {
  expect(TAKING_IT_IN).toHaveLength(2);
  for (const blink of TAKING_IT_IN) {
    expect(blink).toBeGreaterThan(THANKS[1] + DEADPAN_HOLD);
    expect(blink + BLINK.open).toBeLessThan(LINES[0].from);
    expect(shotAt(blink + BLINK.shut).name).toBe("Tibik");
    expect(rundschreibenTibikAt(blink + BLINK.shut).pose.blink).toBeCloseTo(1, 6);
  }
  expect(RUNDSCHREIBEN_CUES.filter((cue) => cue.file === "tibik-blink-snap.mp3").map((cue) => cue.at)).toEqual(TAKING_IT_IN.map((blink) => blink + BLINK.shut));
  expect(FOLDING_SHOT - LINES[0].to).toBeGreaterThanOrEqual(0.3);
});

const irisesOutOfFrame = (t: number, format: Format) => {
  const setup = cameraAt(t, format);
  const { width, height } = FORMATS[format];
  return eyesInWorld(RIG, asCharacter(solveRundschreiben(t).tibik)).filter((eye) => {
    const [x, y] = onScreen(eye, setup, format);
    const [ex, ey] = onScreen(eye.clone().add(new Vector3(0, RIG.eye.iris.radius, 0)), setup, format);
    const r = Math.hypot(ex - x, ey - y);
    return !(inFront(eye, setup) && x >= r && x <= width - r && y >= r && y <= height - r);
  }).length;
};

test.each(["wide", "tall"] as const)("%s: both his irises stay whole in frame while he says 'Hä?' and tilts his head back", (format) => {
  const out = framesIn(LINES[0].from, FOLDING_SHOT).filter((t) => irisesOutOfFrame(t, format) > 0).map((t) => t.toFixed(2));
  expect(out).toEqual([]);
});

test("in 9:16 the close-up on his face keeps his eyes at the height the 16:9 frame has them, within 3 % of the frame", () => {
  const off = framesIn(ON_HIS_FACE, FOLDING_SHOT).filter((t) => {
    const eyes = eyesInWorld(RIG, asCharacter(solveRundschreiben(t).tibik));
    const height = (format: Format) => eyes.reduce((sum, eye) => sum + onScreen(eye, cameraAt(t, format), format)[1], 0) / eyes.length / FORMATS[format].height;
    return Math.abs(height("tall") - height("wide")) > 0.03;
  });
  expect(off.map((t) => t.toFixed(2))).toEqual([]);
});

test("the street and the rain dip under his reaction as under his words, from the cut to his face through 'Hä?', so his eyelids' snaps are heard over the rain (owner, 2026-11-10: unheard), in the scene and in the film", () => {
  const filmStart = SCENES.slice(0, SCENES.findIndex((scene) => scene.name === "Rundschreiben")).reduce((frames, scene) => frames + scene.frames, 0) / TIMELINE_FPS;
  const snaps = RUNDSCHREIBEN_CUES.filter((cue) => cue.file === "tibik-blink-snap.mp3");
  expect(snaps).toHaveLength(2);
  for (const snap of snaps) {
    for (const t of [snap.at, snap.at + 0.05, snap.at + 0.15]) {
      expect(RUNDSCHREIBEN_AMBIENCE.duck(t), `${snap.name} +${(t - snap.at).toFixed(2)} s`).toBeCloseTo(DUCK.floor, 6);
      expect(FILM_AMBIENCE.duck(filmStart + t), `film: ${snap.name}`).toBeCloseTo(DUCK.floor, 6);
    }
  }
  const [, haeSpoken] = spokenSpans("rundschreiben", [...LETTER_READ, ...LINES])(LINES[0]);
  for (let t = TAKING_IT_IN[0]; t <= haeSpoken; t += 0.02) expect(RUNDSCHREIBEN_AMBIENCE.duck(t), t.toFixed(2)).toBeCloseTo(DUCK.floor, 6);
  expect(RUNDSCHREIBEN_AMBIENCE.duck(ON_HIS_FACE - DUCK.attack - 0.05)).toBeGreaterThan(DUCK.floor + 0.1);
});
