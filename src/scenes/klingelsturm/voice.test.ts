import { Vector3 } from "three";
import { expect, test } from "vitest";
import { mouthInWorld, seenBy } from "../../dialogue/screen";
import { KAREN_SKELETON } from "../../Karen/rig";
import type { Vec3 } from "../../toon/primitives";
import { SHOTS } from "./cameras";
import { LINES } from "./choreography";
import { karenVoice, solveKlingelsturm, tailTo } from "./solve";

test("her bubble's tail aims at her mouth only when the camera can see it, never at a mouth behind the camera", () => {
  const state = solveKlingelsturm(8);
  const mouth = mouthInWorld(KAREN_SKELETON, state.karen);
  const eye = mouth.clone().add(new Vector3(0, 0, 0.6));
  const away = eye.clone().add(new Vector3(0, 0, 1));
  const behind = {
    position: eye.toArray() as Vec3,
    target: away.toArray() as Vec3,
    fov: 50,
  };
  expect(seenBy(mouth, behind)).toBe(false);
  expect(karenVoice(state, behind).distanceTo(mouth)).toBeGreaterThan(0.1);
  const facing = {
    position: eye.toArray() as Vec3,
    target: mouth.toArray() as Vec3,
    fov: 50,
  };
  expect(karenVoice(state, facing).distanceTo(mouth)).toBe(0);
});

test("in the insert on her phone her mouth is out of the frame, so her bubble has no tail, as for any speaker the shot cannot show; every other line of hers keeps its tail", { timeout: 120_000 }, () => {
  const insert = SHOTS.find((s) => s.name === "Insert: her phone")!;
  const problems: string[] = [];
  for (const line of LINES.filter((l) => l.speaker === "karen"))
    for (let t = line.from; t <= line.to; t += 0.1) {
      const inInsert = t >= insert.from && t < insert.to;
      const tail = tailTo(line, t);
      if (inInsert && tail !== null) problems.push(`${line.name} at ${t.toFixed(1)} s: a tail in the insert`);
      if (!inInsert && tail === null) problems.push(`${line.name} at ${t.toFixed(1)} s: no tail`);
    }
  expect(problems.slice(0, 6)).toEqual([]);
});
