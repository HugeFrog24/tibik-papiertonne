import { readFileSync } from "node:fs";
import { Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { ENVELOPE_TEXT, LETTER_LINES } from "../scenes/rundschreiben/letter";
import { HAUSVERWALTUNG } from "../street/building";
import {
  A4,
  DL,
  CREASES,
  ENVELOPE,
  FOLD_MARKS,
  LETTER_LAYOUT,
  envelopeFlap,
  envelopeSag,
  flapOutline,
  flapPieces,
  letterLineWidth,
  letterPanels,
  paperSpotsAt,
  sheetBow,
} from "./letterShape";

const SPEC = "docs/superpowers/specs/2026-11-04-rundschreiben-design.md";

const specWording = () => {
  const spec = readFileSync(SPEC, "utf8");
  const from = spec.indexOf("```", spec.indexOf("## The letter")) + 3;
  const block = spec.slice(from, spec.indexOf("```", from));
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => l.split(/\s{2,}/));
};

describe("the wording", () => {
  test("the wording is the spec's, word for word", () => {
    expect(LETTER_LINES.map((l) => l.text)).toEqual(specWording());
    const thanks = LETTER_LINES.filter((l) => l.role === "thanks");
    expect(thanks.map((l) => l.text)).toEqual([
      "Vie-len DANK. Vie-len DANK. Vie-len DANK. Vie-len DANK.",
    ]);
    expect(LETTER_LINES.find((l) => l.role === "head")!.text).toContain(HAUSVERWALTUNG);
    expect(
      LETTER_LINES.filter((l) => l.role === "signature").some((l) =>
        l.text.includes(HAUSVERWALTUNG),
      ),
    ).toBe(true);
    expect(LETTER_LINES.find((l) => l.text.startsWith("Sehr geehrte"))!.role).toBe("body");
    expect(ENVELOPE_TEXT).toEqual({
      sender: HAUSVERWALTUNG,
      to: "An alle Mieterinnen und Mieter",
    });
  });

  test("body 11-12 pt, every line inside the DIN 5008 margins", () => {
    const { margins, lines } = LETTER_LAYOUT;
    expect(lines.map((l) => l.text)).toEqual(LETTER_LINES.map((l) => l.text));
    for (const l of lines) {
      if (l.role === "body" || l.role === "thanks") {
        expect(l.pt).toBeGreaterThanOrEqual(11);
        expect(l.pt).toBeLessThanOrEqual(12);
      }
      expect(l.x).toBeGreaterThanOrEqual(margins.left - 1e-9);
      expect(l.x + letterLineWidth(l)).toBeLessThanOrEqual(A4[0] - margins.right + 1e-9);
      expect(l.y).toBeGreaterThanOrEqual(margins.top - 1e-9);
    }
    const read = lines.filter((l) => l.role !== "date").map((l) => l.y);
    for (let i = 1; i < read.length; i++) expect(read[i]).toBeGreaterThan(read[i - 1]);
  });

  test("no line of text sits on a fold, where the crease would cut it", () => {
    for (const l of LETTER_LAYOUT.lines) {
      const height = (l.pt * 0.0254) / 72;
      for (const crease of CREASES)
        expect(crease < l.y - 0.001 || crease > l.y + height + 0.001, l.text).toBe(true);
    }
  });
});

const cornersOf = ({ matrix, size }: ReturnType<typeof letterPanels>[number]) =>
  [
    [0, 0],
    [size[0], 0],
    [0, size[1]],
    [size[0], size[1]],
  ].map(([x, y]) => new Vector3(x, y, 0).applyMatrix4(matrix));

describe("the sheet", () => {
  test("folded by hand, the three panels make one A4 sheet: the creases sit 1-2 mm off the DIN fold marks, the panels meet along them, and folded it still fits a DL envelope", () => {
    expect(FOLD_MARKS).toEqual([0.105, 0.21]);
    CREASES.forEach((crease, i) => {
      const off = Math.abs(crease - FOLD_MARKS[i]);
      expect(off).toBeGreaterThanOrEqual(0.001);
      expect(off).toBeLessThanOrEqual(0.002);
    });
    const flat = letterPanels(1);
    expect(flat.reduce((s, p) => s + p.size[1], 0)).toBeCloseTo(A4[1], 9);
    for (const p of flat) expect(p.size[0]).toBeCloseTo(A4[0], 9);
    const [top, middle, bottom] = flat;
    const edge = (p: typeof top, y: number) => [0, A4[0]].map((x) => new Vector3(x, y, 0).applyMatrix4(p.matrix));
    edge(top, 0).forEach((c, i) => expect(c.distanceTo(edge(middle, middle.size[1])[i])).toBeLessThan(0.0005));
    edge(bottom, bottom.size[1]).forEach((c, i) => expect(c.distanceTo(edge(middle, 0)[i])).toBeLessThan(0.0005));
    const folded = letterPanels(0).flatMap(cornersOf);
    const height = middle.size[1];
    for (const c of folded) {
      expect(Math.abs(c.z)).toBeLessThan(0.001);
      expect(c.x).toBeGreaterThanOrEqual(-1e-9);
      expect(c.x).toBeLessThanOrEqual(0.21 + 1e-9);
      expect(c.y).toBeGreaterThanOrEqual(-1e-9);
      expect(c.y).toBeLessThanOrEqual(height + 1e-9);
    }
    expect((DL[0] - 0.21) / 2).toBeGreaterThanOrEqual(0.002);
    expect((DL[1] - height) / 2).toBeGreaterThanOrEqual(0.002);
  });

  test("held by its side edges, the sheet bows gently between them, towards the text: none at the edges, 1.5-3 mm in the middle", () => {
    expect(sheetBow(0)).toBeCloseTo(0, 9);
    expect(sheetBow(A4[0])).toBeCloseTo(0, 9);
    expect(sheetBow(A4[0] / 2)).toBeGreaterThanOrEqual(0.0015);
    expect(sheetBow(A4[0] / 2)).toBeLessThanOrEqual(0.003);
    for (let x = 0; x <= A4[0]; x += 0.01) expect(sheetBow(x)).toBeGreaterThanOrEqual(0);
  });

  test("a folded letter never lies quite flat again: unfolded, its top and bottom panels keep 4-9 degrees at their creases, both towards the text", () => {
    const [top, middle, bottom] = letterPanels(1);
    const normal = (p: typeof top) => new Vector3(0, 0, 1).transformDirection(p.matrix);
    for (const p of [top, bottom]) {
      const angle = (normal(p).angleTo(normal(middle)) * 180) / Math.PI;
      expect(angle).toBeGreaterThanOrEqual(4);
      expect(angle).toBeLessThanOrEqual(9);
      const centre = new Vector3(p.size[0] / 2, p.size[1] / 2, 0).applyMatrix4(p.matrix);
      expect(centre.z).toBeGreaterThan(0);
    }
  });

  test("folded, it is a C-fold: the bottom third tucked under the top third, the text facing in", () => {
    const [top, middle, bottom] = letterPanels(0);
    const centre = (p: typeof top) =>
      new Vector3(p.size[0] / 2, p.size[1] / 2, 0).applyMatrix4(p.matrix);
    const facing = (p: typeof top) =>
      new Vector3(0, 0, 1).transformDirection(p.matrix).z;
    expect(centre(bottom).z).toBeGreaterThan(centre(middle).z);
    expect(centre(top).z).toBeGreaterThan(centre(bottom).z);
    expect(facing(middle)).toBeCloseTo(1, 9);
    expect(facing(bottom)).toBeCloseTo(-1, 9);
    expect(facing(top)).toBeCloseTo(-1, 9);
  });

  test("no panel passes through another while folding", () => {
    const pierces = (a: ReturnType<typeof letterPanels>[number], b: typeof a) => {
      const inverse = b.matrix.clone().invert();
      const samples = Array.from({ length: 11 * 11 }, (_, k) =>
        new Vector3((a.size[0] * (k % 11)) / 10, (a.size[1] * Math.floor(k / 11)) / 10, 0)
          .applyMatrix4(a.matrix)
          .applyMatrix4(inverse),
      ).filter(
        (p) => p.x >= 0 && p.x <= b.size[0] && p.y > 1e-6 && p.y < b.size[1] - 1e-6,
      );
      const above = samples.some((p) => p.z > 1e-7);
      const below = samples.some((p) => p.z < -1e-7);
      return above && below;
    };
    for (let k = 0; k <= 50; k++) {
      const panels = letterPanels(k / 50);
      for (const a of panels)
        for (const b of panels)
          if (a !== b) expect(pierces(a, b), `fold ${k / 50}`).toBe(false);
    }
  });

  test("it unfolds top panel first, then the bottom one, the reverse of how it was folded", () => {
    const angleOf = (fold: number, i: number) => {
      const [p, mid] = [letterPanels(fold)[i], letterPanels(fold)[1]];
      const n = new Vector3(0, 0, 1).transformDirection(p.matrix);
      const m = new Vector3(0, 0, 1).transformDirection(mid.matrix);
      return Math.acos(Math.min(1, Math.max(-1, n.dot(m))));
    };
    expect(angleOf(0.25, 0)).toBeLessThan(Math.PI - 0.1);
    expect(angleOf(0.25, 2)).toBeCloseTo(Math.PI, 6);
    expect(angleOf(0.75, 0)).toBeCloseTo(angleOf(1, 0), 6);
    expect(angleOf(0.75, 2)).toBeGreaterThan(angleOf(1, 2) + 0.1);
  });
});

describe("the envelope", () => {
  test("its shut flap lies on its back outside the body's outline, so no outline runs through the flap", () => {
    const flapPlane = new Vector3(0.1, -0.03, 0).applyMatrix4(envelopeFlap(0)).z;
    const hullBack = -ENVELOPE.thickness - ENVELOPE.ink;
    expect(flapPlane).toBeLessThanOrEqual(hullBack);
    expect(hullBack - flapPlane).toBeLessThan(0.001);
  });

  test("torn open by hand, the flap splits along one ragged line: the piece that lifts and the strip left glued on the back share it, and together they make the whole flap", () => {
    const { lifted, glued } = flapPieces();
    const area = (pts: readonly (readonly [number, number])[]) =>
      Math.abs(pts.reduce((s, [x, y], i) => {
        const [nx, ny] = pts[(i + 1) % pts.length];
        return s + x * ny - nx * y;
      }, 0)) / 2;
    expect(area(lifted) + area(glued)).toBeCloseTo(area(flapOutline()), 7);
    const tear = lifted.filter(([, y]) => y < -1e-9 && y > -ENVELOPE.flapDepth + 1e-9);
    expect(tear.length).toBeGreaterThanOrEqual(16);
    for (const point of tear) expect(glued.some(([x, y]) => Math.abs(x - point[0]) < 1e-9 && Math.abs(y - point[1]) < 1e-9)).toBe(true);
    const ys = tear.map(([, y]) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.003);
    expect(Math.max(...ys)).toBeLessThan(-0.012);
    expect(Math.min(...ys)).toBeGreaterThan(-ENVELOPE.flapDepth + 0.004);
    let turns = 0;
    for (let i = 2; i < ys.length; i++) if ((ys[i] - ys[i - 1]) * (ys[i - 1] - ys[i - 2]) < 0) turns++;
    expect(turns).toBeGreaterThanOrEqual(6);
  });

  test("the tear wanders like a real one: its jags are unevenly spaced, some long runs, some short nicks, not a serrated grid", () => {
    const tear = flapPieces().lifted.slice(2).reverse();
    const gaps = tear.slice(1).map(([x], i) => x - tear[i][0]);
    for (const gap of gaps) expect(gap).toBeGreaterThan(0);
    expect(Math.max(...gaps)).toBeGreaterThan(2.5 * Math.min(...gaps));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const spread = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
    expect(spread / mean).toBeGreaterThan(0.3);
  });

  test("its flap lies on its back when shut and stands up above it when open", () => {
    const tip = (open: number) =>
      new Vector3(DL[0] / 2, -0.06, 0).applyMatrix4(envelopeFlap(open));
    const shut = tip(0);
    expect(shut.y).toBeLessThan(DL[1]);
    expect(shut.z).toBeLessThan(0);
    const open = tip(1);
    expect(open.y).toBeGreaterThan(DL[1]);
    expect(Math.abs(open.z)).toBeLessThan(0.002);
  });
});

describe("rain on the letter", () => {
  test("rain spots appear once the letter is out, stay where they land, inside the sheet", () => {
    const wet = 3;
    expect(paperSpotsAt(wet - 0.01, wet)).toEqual([]);
    let before = paperSpotsAt(wet, wet);
    for (let t = wet; t <= wet + 12; t += 0.25) {
      const now = paperSpotsAt(t, wet);
      expect(now.length).toBeGreaterThanOrEqual(before.length);
      expect(now.slice(0, before.length)).toEqual(before);
      for (const s of now) {
        expect(s.u).toBeGreaterThanOrEqual(0);
        expect(s.u).toBeLessThanOrEqual(1);
        expect(s.v).toBeGreaterThanOrEqual(0);
        expect(s.v).toBeLessThanOrEqual(1);
        expect(s.r).toBeGreaterThan(0);
      }
      before = now;
    }
    expect(before.length).toBeGreaterThan(5);
  });
});

describe("a floppy envelope", () => {
  test("it only ever bends away from his side, its top edge stays straight for the flap's hinge", () => {
    for (let i = 0; i <= 10; i++)
      for (let j = 0; j <= 10; j++) {
        const [x, y] = [(DL[0] * i) / 10, (DL[1] * j) / 10];
        const sag = envelopeSag(x, y, 0.006, 0.004);
        expect(sag).toBeGreaterThanOrEqual(0);
        if (j === 10) expect(sag).toBeCloseTo(0, 12);
      }
    expect(envelopeSag(DL[0] / 2, 0, 0.006, 0)).toBeCloseTo(0.006, 9);
    expect(envelopeFlap(1.12).elements.every(Number.isFinite)).toBe(true);
  });
});
