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
import { INK_BLOCKER, INK_PASS, NO_INK, ONE_UNIT, inkIdsOf, inkJoin, inkOf, inkRadius, skipsInkIds } from "./inkWidth";
import { selfClosingTags, sourceFiles } from "../tooling/sourceFiles";

test("the drawn line is one outline wide on screen: 1.4 cm at the part's depth, in pixels", () => {
  const px = inkRadius(0.014, 1080, 50, 2);
  const visibleHeight = 2 * 2 * Math.tan((50 * Math.PI) / 360);
  expect(px).toBeCloseTo((0.014 / visibleHeight) * 1080, 9);
  expect(inkRadius(0.014, 1080, 50, 4)).toBeCloseTo(px / 2, 9);
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
      .filter((material) => /side=\{BackSide\}/.test(material) && !/^<meshBasicMaterial color=\{INK\}/.test(material))
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
