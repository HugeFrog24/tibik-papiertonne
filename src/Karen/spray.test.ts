import { Matrix4, Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { halfSpace, obb, type Solid } from "../physics/collision";
import {
  SPRAY,
  burstsOf,
  flightPoint,
  landingOf,
  launchesOf,
  plosivesOf,
  spotAt,
} from "./spray";
import { AHEAD, karenLine } from "./sprayFixtures";

const line = karenLine;

const GROUND = halfSpace("ground", new Vector3(0, 1, 0), 0);

describe("which sounds spray", () => {
  test("p and b spray most, t and d less, k and g a little; m, n and vowels not at all", () => {
    const counts = (text: string) => plosivesOf(text).map((p) => p.count);
    expect(counts("PAPA")).toEqual([
      SPRAY.strengths.strong,
      SPRAY.strengths.strong,
    ]);
    expect(counts("BAD")).toEqual([
      SPRAY.strengths.strong,
      SPRAY.strengths.medium,
    ]);
    expect(counts("TAG")).toEqual([
      SPRAY.strengths.medium,
      SPRAY.strengths.light,
    ]);
    expect(counts("MAMA NENNE AUA")).toEqual([]);
  });

  test("a plosive at the end of one word and the start of the next is two sounds; ß is one letter", () => {
    expect(plosivesOf("HALT, TIBIK").map((p) => p.letter)).toEqual([
      "T",
      "T",
      "B",
      "K",
    ]);
    expect(plosivesOf("groß Tat").map((p) => p.index)).toEqual(
      plosivesOf("gros Tat").map((p) => p.index),
    );
    const bursts = burstsOf([line("STRAßE! TOT!", 0, 1)]);
    for (const b of bursts) expect(b.at).toBeLessThan(1);
    expect(bursts[bursts.length - 1].at).toBeCloseTo(
      (plosivesOf("STRAßE! TOT!").slice(-1)[0].index + 0.5) / 9,
      9,
    );
  });

  test("German spelling: ch is no plosive, doubled letters are one sound, z is ts, ck is k, pf is p", () => {
    expect(plosivesOf("NICHT").map((p) => p.letter)).toEqual(["T"]);
    expect(plosivesOf("BITTE").map((p) => p.letter)).toEqual(["B", "T"]);
    expect(plosivesOf("SCHULZ").map((p) => p.letter)).toEqual(["T"]);
    expect(plosivesOf("DRECK").map((p) => p.letter)).toEqual(["D", "K"]);
    expect(plosivesOf("KOPF").map((p) => p.letter)).toEqual(["K", "P"]);
    expect(plosivesOf("NACHSPIEL").map((p) => p.letter)).toEqual(["P"]);
  });
});

describe("when she sprays", () => {
  test("only on her shouted lines, each burst inside its line, and an extra drop for each ! at the end, up to three", () => {
    const shout = line("DAS DÜRFEN SIE NICHT!!!!", 1, 3);
    const calm = line("Das dürfen Sie nicht.", 4, 6, "calm");
    const bursts = burstsOf([shout, calm]);
    expect(bursts.length).toBe(plosivesOf(shout.text).length);
    for (const b of bursts) {
      expect(b.at).toBeGreaterThan(shout.from);
      expect(b.at).toBeLessThan(shout.to);
    }
    for (let i = 1; i < bursts.length; i++)
      expect(bursts[i].at).toBeGreaterThan(bursts[i - 1].at);
    const last = bursts[bursts.length - 1];
    expect(last.count).toBe(
      SPRAY.strengths.medium + SPRAY.exclaim * Math.min(SPRAY.maxExclaim, 4),
    );
  });
});

describe("how a droplet flies", () => {
  const bursts = burstsOf([line("PAPP BAD TAG!", 0, 2)]);
  const launches = launchesOf(bursts, () => AHEAD);

  test("each leaves just ahead of her lips at the measured speed of loud speech, inside a cone around her face's forward direction", () => {
    expect(launches.length).toBeGreaterThan(8);
    for (const l of launches) {
      expect(l.from.distanceTo(AHEAD.origin)).toBeLessThan(1e-9);
      const speed = l.velocity.length();
      expect(speed).toBeGreaterThanOrEqual(SPRAY.speed[0]);
      expect(speed).toBeLessThanOrEqual(SPRAY.speed[1]);
      expect(l.velocity.angleTo(AHEAD.forward)).toBeLessThanOrEqual(
        SPRAY.cone + 1e-9,
      );
      expect(l.radius).toBeGreaterThanOrEqual(SPRAY.radius[0]);
      expect(l.radius).toBeLessThanOrEqual(SPRAY.radius[1]);
    }
    expect(new Set(launches.map((l) => l.id)).size).toBe(launches.length);
  });

  test("the same droplets every time the frame is rendered", () => {
    const again = launchesOf(bursts, () => AHEAD);
    again.forEach((l, i) => {
      expect(l.velocity.distanceTo(launches[i].velocity)).toBe(0);
      expect(l.at).toBe(launches[i].at);
    });
  });

  test("in the air it slows down and falls", () => {
    const l = launches[0];
    expect(flightPoint(l, 0).distanceTo(l.from)).toBeLessThan(1e-12);
    const dt = 1e-4;
    const early = flightPoint(l, dt).sub(l.from).divideScalar(dt);
    expect(early.distanceTo(l.velocity)).toBeLessThan(0.01);
    const speedAt = (t: number) => {
      const a = flightPoint(l, t);
      const b = flightPoint(l, t + 0.01);
      return Math.hypot(b.x - a.x, b.z - a.z) / 0.01;
    };
    expect(speedAt(0.3)).toBeLessThan(speedAt(0.05));
    expect(flightPoint(l, 0.6).y).toBeLessThan(flightPoint(l, 0.2).y);
  });

  test("with nothing in the way, it lands on the ground about a metre away within two seconds", () => {
    for (const l of launches) {
      const landing = landingOf(l, () => [GROUND])!;
      expect(landing).not.toBeNull();
      expect(landing.on).toBe("ground");
      expect(landing.at - l.at).toBeLessThanOrEqual(SPRAY.flight);
      expect(landing.point.y).toBeLessThan(l.radius + 0.005);
      const reach = Math.hypot(
        landing.point.x - l.from.x,
        landing.point.z - l.from.z,
      );
      expect(reach).toBeGreaterThan(0.5);
      expect(reach).toBeLessThan(2);
    }
  });

  test("it stops on the first thing in its way and never passes through it", () => {
    const wall = obb(
      "wall",
      new Matrix4().makeTranslation(0, 1.2, 0.3),
      [2, 2, 0.004],
    );
    for (const l of launches) {
      const landing = landingOf(l, () => [GROUND, wall])!;
      expect(landing.on).toBe("wall");
      expect(landing.point.z).toBeLessThan(0.3);
      expect(landing.point.z).toBeGreaterThan(0.3 - 0.002 - l.radius - 0.004);
    }
  });

  test("a drop that lands on a moving box stays on the box, where it landed", () => {
    const boxAt = (t: number): Solid =>
      obb(
        "box",
        new Matrix4().makeTranslation(t * 0.5, 1.2, 0.6),
        [0.6, 0.6, 0.4],
      );
    const l = launches[0];
    const landing = landingOf(l, (t) => [GROUND, boxAt(t)])!;
    expect(landing.on).toBe("box");
    const later = landing.at + 1.5;
    const spot = spotAt(landing, (t) => boxAt(t) as never, later)!;
    expect(spot.x - landing.surface.x).toBeCloseTo(0.5 * 1.5, 6);
    expect(spot.y).toBeCloseTo(landing.surface.y, 6);
    expect(spot.z).toBeCloseTo(landing.surface.z, 6);
    expect(Math.abs(landing.surface.z - 0.4)).toBeLessThan(1e-6);
  });
});
