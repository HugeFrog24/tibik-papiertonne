import { Matrix4, Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { contacts, obb, sphere } from "../physics/collision";
import { SPITTLE, loudestOf, spittleAt } from "./spittle";
import { burstsOf } from "./spray";
import { AHEAD, karenLine } from "./sprayFixtures";

const line = karenLine;

const LOUD = loudestOf(burstsOf([line("Papa kommt!", 0, 2)]));

describe("the comic spittle burst", () => {
  test("bursts on her loudest syllables only: every p and b, and a closing plosive with an exclamation mark", () => {
    expect(LOUD.map((b) => b.seed)).toEqual([
      "Papa kommt!/0",
      "Papa kommt!/1",
      "Papa kommt!/3",
    ]);
    expect(loudestOf(burstsOf([line("Kommt doch", 0, 1)]))).toEqual([]);
  });

  test("its lines shoot out from just ahead of her lips, then thin out from the lips and are gone after a sixth of a second", () => {
    const burst = LOUD[0];
    const at = (dt: number) => spittleAt(LOUD, burst.at + dt, () => AHEAD, () => []);
    expect(at(-0.01)).toEqual([]);
    const early = at(0.02);
    const full = at(SPITTLE.life * 0.45);
    expect(full).toHaveLength(SPITTLE.spikes);
    const reach = (s: { readonly to: Vector3 }) => s.to.distanceTo(AHEAD.origin);
    for (let k = 0; k < full.length; k++) {
      expect(reach(early[k])).toBeLessThan(reach(full[k]));
      expect(full[k].from.distanceTo(AHEAD.origin)).toBeLessThan(0.002);
      expect(reach(full[k])).toBeGreaterThan(SPITTLE.length[0] * 0.9);
    }
    const late = at(SPITTLE.life * 0.8);
    for (const s of late) expect(s.from.distanceTo(AHEAD.origin)).toBeGreaterThan(0.01);
    expect(at(SPITTLE.life + 0.001)).toEqual([]);
  });

  test("it sprays forward, to the sides and down, never up into her nose", () => {
    for (const s of spittleAt(LOUD, LOUD[0].at + 0.07, () => AHEAD, () => [])) {
      const dir = s.to.clone().sub(AHEAD.origin).normalize();
      expect(dir.z).toBeGreaterThan(Math.cos(SPITTLE.cone) - 1e-9);
      expect(dir.y).toBeLessThanOrEqual(1e-9);
    }
  });

  test("a line stops short of anything in its way, its droplet included", () => {
    const wall = obb("wall", new Matrix4().makeTranslation(0, 1.45, 0.025), [1, 1, 0.004]);
    const spikes = spittleAt(LOUD, LOUD[0].at + 0.07, () => AHEAD, () => [wall]);
    expect(spikes.length).toBeGreaterThan(0);
    for (const s of spikes) {
      expect(contacts([sphere("bead", s.to, s.bead)], [wall])).toEqual([]);
      expect(s.to.z).toBeLessThan(0.023);
    }
  });

  test("it shows only while her mouth is open, never from closed lips", () => {
    const at = LOUD[0].at + 0.07;
    const shut = (open: number) => () => ({ ...AHEAD, open });
    expect(spittleAt(LOUD, at, shut(0), () => [])).toEqual([]);
    expect(spittleAt(LOUD, at, shut(SPITTLE.open - 0.01), () => [])).toEqual([]);
    expect(spittleAt(LOUD, at, shut(SPITTLE.open), () => [])).toHaveLength(SPITTLE.spikes);
  });

  test("each spike names the burst it belongs to, even when one seed is a prefix of another", () => {
    const many = loudestOf(burstsOf([line("Papa Papa Papa Papa Papa Papa!", 0, 0.5)]));
    const first = many.find((b) => b.seed.endsWith("/1"))!;
    const tenth = many.find((b) => b.seed.endsWith("/10"))!;
    expect(tenth.seed.startsWith(first.seed)).toBe(true);
    for (const burst of [first, tenth])
      for (const s of spittleAt(many, burst.at + 0.01, () => AHEAD, () => []))
        if (s.burst === burst.seed) expect(s.id.startsWith(`${burst.seed}/spittle/`)).toBe(true);
    const at = first.at + 0.01;
    const own = spittleAt([first], at, () => AHEAD, () => []);
    expect(own.length).toBe(SPITTLE.spikes);
    expect(own.every((s) => s.burst === first.seed)).toBe(true);
  });

  test("the same burst every time the frame is rendered", () => {
    const a = spittleAt(LOUD, LOUD[1].at + 0.05, () => AHEAD, () => []);
    const b = spittleAt(LOUD, LOUD[1].at + 0.05, () => AHEAD, () => []);
    expect(a.map((s) => s.to.toArray())).toEqual(b.map((s) => s.to.toArray()));
  });
});
