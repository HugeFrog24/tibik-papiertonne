import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import {
  BackSide,
  BoxGeometry,
  Group,
  Line,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
} from "three";
import { INK_BLOCKER, INK_PASS, LINE_CAP, NO_INK, ONE_UNIT, inkIdsOf, inkJoin, inkOf, inkRadius, skipsInkIds, widestLine } from "./inkWidth";
import { selfClosingTags, sourceFiles } from "../tooling/sourceFiles";
import { BEHIND_WHAT_IT_TOUCHES, HULL_VIEW, OUTLINE, hullShader } from "./primitives";

test("the drawn line is one outline wide on screen: 1.4 cm at the part's depth, in pixels", () => {
  const px = inkRadius(0.014, 1080, 50, 2);
  const visibleHeight = 2 * 2 * Math.tan((50 * Math.PI) / 360);
  expect(px).toBeCloseTo((0.014 / visibleHeight) * 1080, 9);
  expect(inkRadius(0.014, 1080, 50, 4)).toBeCloseTo(px / 2, 9);
});

test("every line, drawn by the ink pass or by an outline shell, stops growing at the same 24 px per 1080 px of the frame's shorter side, so in an extreme close-up no part's line is thicker than its neighbour's and none swallows a small detail; the pass's rings sit at most 1.35 times apart from 1 px out", () => {
  expect(widestLine(1920, 1080)).toBe(24);
  expect(widestLine(1080, 1920)).toBe(24);
  expect(widestLine(3840, 2160)).toBe(48);
  expect(INK_PASS.maxRadius).toBe(LINE_CAP.pixels);
  const shader = { vertexShader: "a\n#include <project_vertex>\nb", uniforms: {} as Record<string, { value: unknown }> };
  hullShader(OUTLINE)(shader);
  expect(shader.uniforms["hullCap"]).toBe(HULL_VIEW.hullCap);
  expect(shader.vertexShader).toContain("max(0.0, 0.01400 - hullCap * hullPixel)");
  const reaches = INK_PASS.rings.map((r) => r * INK_PASS.maxRadius);
  expect(reaches[0]).toBeLessThanOrEqual(1.5);
  for (let i = 1; i < reaches.length; i++) {
    expect(reaches[i] / reaches[i - 1]).toBeLessThanOrEqual(1.35 + 1e-9);
    expect(reaches[i] - reaches[i - 1]).toBeLessThanOrEqual(2 + 1e-9);
  }
});

test("the sampling rings reach out to the widest line and start close to the pixel", () => {
  expect(Math.max(...INK_PASS.rings)).toBe(1);
  expect(Math.min(...INK_PASS.rings) * INK_PASS.maxRadius).toBeLessThanOrEqual(
    1.5,
  );
  expect(INK_PASS.turns).toBeGreaterThanOrEqual(8);
});

test("ink hulls, lines and things too small for an outline stay out of the id pass", () => {
  const hull = new Mesh(
    new BoxGeometry(),
    new MeshBasicMaterial({ side: BackSide }),
  );
  const part = new Mesh(new BoxGeometry(), new MeshToonMaterial());
  const fly = new Group();
  fly.userData = { ...NO_INK };
  expect(skipsInkIds(hull)).toBe(true);
  expect(skipsInkIds(new Line())).toBe(true);
  expect(skipsInkIds(fly)).toBe(true);
  expect(skipsInkIds(part)).toBe(false);
});

test("only the ink hulls are drawn from the back: every visible part shows its front, so the id pass outlines it", () => {
  const root = path.resolve(__dirname, "..");
  const backs = sourceFiles(root, /\.tsx$/).flatMap((file) =>
    selfClosingTags(readFileSync(file, "utf8"), String.raw`mesh\w*Material`)
      .filter((material) => material.includes('side={BackSide}') && !material.startsWith("<meshBasicMaterial color={INK}"))
      .map((material) => `${path.relative(root, file)}: ${material}`),
  );
  expect(backs).toEqual([]);
});

test("the ink fades into the haze with three's own exponential fog, at the depth of the surface it outlines", () => {
  const source = readFileSync(`${__dirname}/InkPass.tsx`, "utf8");
  expect(source).toContain("1.0 - exp(-hazeDensity * hazeDensity * inkDepth * inkDepth)");
  expect(source).toContain("inkDepth = min(inkDepth, there.g)");
  expect(source).toMatch(/instanceof FogExp2/);
});

test("a part draws its own line width when it or a group above it sets one, a see-through part blocks the line, and every other part keeps the outline", () => {
  const prop = new Group();
  prop.userData = { ink: 0.002 };
  const tip = new Mesh();
  prop.add(tip);
  expect(inkOf(tip)).toBeCloseTo(0.002, 9);
  const flame = new Mesh();
  flame.userData = INK_BLOCKER;
  prop.add(flame);
  expect(inkOf(flame)).toBeLessThan(0);
  expect(skipsInkIds(flame)).toBe(false);
  expect(inkOf(new Mesh())).toBe(0);
});

test("the ink pass reads each part's own width from the id target and never inks across a see-through part", () => {
  const pass = readFileSync(path.join("src", "toon", "InkPass.tsx"), "utf8");
  expect(pass).toContain("vec4(uId, vDepth, uInk, ");
  expect(pass).toContain("there.b < 0.0");
  expect(pass).toContain("here.b < 0.0");
  expect(pass).toContain("there.b / outline");
});

test("a doormat's coir and the box under it are one ink unit, so the id pass never stripes the coir where the two lie at the same depth", () => {
  const mats = readFileSync(path.join("src", "building", "Doormats.tsx"), "utf8");
  expect(mats.replace(/\s+/g, " ")).toMatch(/<group key=\{`[^`]*mat\.side[^`]*`\}\s*userData=\{ONE_UNIT\}\s*>/);
});

test("a part can grow out of the unit around it: near its own origin it counts as that outer unit, so no line is drawn where it joins, and further out as its own unit, so it keeps its outline", () => {
  const body = new Group();
  body.userData = { ...ONE_UNIT };
  const arm = new Group();
  arm.userData = { ...ONE_UNIT };
  const root = new Mesh();
  root.userData = inkJoin(0.15);
  const hand = new Mesh();
  body.add(arm);
  arm.add(root, hand);
  expect(inkIdsOf(root)).toEqual({ id: arm.id, join: { id: body.id, reach: 0.15 } });
  expect(inkIdsOf(hand)).toEqual({ id: arm.id, join: null });
  const alone = new Group();
  alone.userData = { ...ONE_UNIT };
  const loose = new Mesh();
  loose.userData = inkJoin(0.15);
  alone.add(loose);
  expect(inkIdsOf(loose)).toEqual({ id: alone.id, join: null });
  expect(inkIdsOf(new Mesh()).join).toBeNull();
});

test("a joining part keeps its own id everywhere, so no line runs across it where the join ends; within reach of its origin it also carries the outer unit's id, and the ink pass draws no line between it and that unit there", () => {
  const pass = readFileSync(path.join("src", "toon", "InkPass.tsx"), "utf8");
  expect(pass).toContain("vec4(uId, vDepth, uInk, length(vLocal) < uJoinReach ? uJoinId : 0.0)");
  expect(pass).toContain("(there.a > 0.5 && abs(there.a - here.r) < 0.5) || (here.a > 0.5 && abs(here.a - there.r) < 0.5)");
  expect(pass).toMatch(/inkIdsOf\(mesh\)/);
});

test("a hand draws its outline shell pushed back behind whatever it touches, at least a line's width, and the doorbell plate flat on the wall has none, so no black band shows where a hand presses the bell while the hand keeps its full line", () => {
  expect(BEHIND_WHAT_IT_TOUCHES).toBeGreaterThanOrEqual(OUTLINE);
  const shader = { vertexShader: "a\n#include <project_vertex>\nb", uniforms: {} as Record<string, { value: unknown }> };
  hullShader(OUTLINE, 0.02)(shader);
  expect(shader.vertexShader).toContain("mvPosition.xyz *= 1.0 + 0.0200 / length(mvPosition.xyz);\ngl_Position = projectionMatrix * mvPosition;\nb");
  const root = path.resolve(__dirname, "..");
  const tag = (file: string, opening: RegExp) => {
    const source = readFileSync(path.join(root, file), "utf8");
    const at = source.search(opening);
    return at < 0 ? "" : source.slice(at, source.indexOf("/>", at));
  };
  expect(tag("characters/Limbs.tsx", /<Blob\s+position=\{\[0, -skeleton\.hand\.offset/)).toMatch(/hullBehind=\{BEHIND_WHAT_IT_TOUCHES\}/);
  expect(tag("building/StairwellSet.tsx", /<ToonBox\s+position=\{doorbellCenter\(door\)\}/)).toMatch(/outline=\{false\}/);
});

test("an outline shell shrinks to the line cap only by the growth it declares, so none is pulled inside its object: a shell that grew unevenly declares none and is never shrunk, every evenly grown one declares its real growth", () => {
  const shader = { vertexShader: "#include <project_vertex>", uniforms: {} as Record<string, { value: unknown }> };
  hullShader(0)(shader);
  expect(shader.vertexShader).toContain("max(0.0, 0.00000 - hullCap * hullPixel)");
  const root = path.resolve(__dirname, "..");
  const declared = (file: string) => [...readFileSync(path.join(root, file), "utf8").matchAll(/<InkHull([^/>]*)\/>/g)].map((m) => m[1].trim());
  expect(readFileSync(path.join(root, "toon/primitives.tsx"), "utf8")).toMatch(/\(\{ behind = 0, grown = 0 \}\)/);
  expect(declared("characters/TorsoMesh.tsx")).toEqual(["grown={OUTLINE}"]);
  expect(declared("Karen/HairClump.tsx")).toEqual(["grown={OUTLINE}"]);
  expect(declared("Tibik/Tibik.tsx")).toEqual(["grown={OUTLINE}", "grown={IRIS_INK}"]);
  expect(declared("street/BikeStands.tsx")).toEqual(["grown={CABLE.ink}"]);
  expect(declared("building/DoorGrips.tsx")).toEqual(["grown={OUTLINE}"]);
  expect(declared("Karen/Karen.tsx")).toEqual(["grown={TEETH.ink}", "grown={NOSE.ink}", ""]);
  expect(declared("street/Tonne.tsx")).toEqual([""]);
  expect(declared("street/Car.tsx")).toEqual([""]);
});
