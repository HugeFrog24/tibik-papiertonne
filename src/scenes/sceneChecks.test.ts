import { expect, test } from "vitest";
import type { Contact } from "../physics/collision";
import type { Character } from "../physics/guards";
import { Matrix4, Vector3 } from "three";
import { TOLERANCE, castHeads, tibikHead, tibikHeadPoints, castOutOfTallFrame, facesUnderBar, speakerOutOfTallFrame, framesOf, mm, penetrations, seconds, tooFastToWalk, type Staged } from "./sceneChecks";
import type { Chunk } from "../dialogue/subtitles";
import type { Line } from "../dialogue/line";
import { obb, type Solid } from "../physics/collision";
import type { CameraSetup } from "../toon/shots";

const contact = (a: string, b: string, depth: number) =>
  ({ a, b, depth }) as Contact;

test("penetrations reports every contact deeper than the tolerance, labelled by its time, and nothing shallower", () => {
  const hits = penetrations(
    [0.5, 1],
    (t) =>
      t === 0.5
        ? [contact("hand", "door", 0.012), contact("foot", "mat", TOLERANCE)]
        : [contact("elbow", "wall", TOLERANCE + 0.0005)],
    seconds,
  );
  expect(hits).toEqual([
    "0.50 s: hand is 12 mm inside door",
    "1.00 s: elbow is 6 mm inside wall",
  ]);
});

test("framesOf lists every frame index before the end, in steps", () => {
  expect(framesOf(1, 30)).toHaveLength(30);
  expect(framesOf(28.5, 30)).toHaveLength(855);
  expect(framesOf(12, 30, 5)).toEqual(
    Array.from({ length: 72 }, (_, i) => i * 5),
  );
  expect(Math.max(...framesOf(12.01, 30))).toBe(360);
});

test("mm writes a length in metres as millimetres, one decimal unless told otherwise", () => {
  expect(mm(0.0123)).toBe("12.3 mm");
  expect(mm(-0.5, 0)).toBe("-500 mm");
  expect(mm(0.00012, 2)).toBe("0.12 mm");
  expect(mm(0.0125, 0)).toBe("13 mm");
});

test("a face low in the frame is under the bar while a chunk shows, unless it is turned away from the camera or no chunk shows", () => {
  const camera: CameraSetup = { position: [0, 0, 0], target: [0, 0, -1], fov: 40 };
  const low = new Vector3(0, -0.566, -2);
  const chunk: Chunk = { text: "Ja.", lines: ["Ja."], from: 0, to: 1, speaker: "tibik", tone: "calm", line: "test" };
  const check = (toward: Vector3, shown: Chunk | null) =>
    facesUnderBar([0.5], () => shown, () => camera, () => [{ points: [low], toward }], "wide");
  expect(check(new Vector3(0, 0, 1), chunk)).toHaveLength(1);
  expect(check(new Vector3(0, 0, -1), chunk)).toEqual([]);
  expect(check(new Vector3(0, 0, 1), null)).toEqual([]);
});

test("the face check projects through the format it is asked about: low in the tall frame is under the tall bar, while the same point sits mid-frame in the wide one", () => {
  const camera: CameraSetup = { position: [0, 0, 0], target: [0, 0, -1], fov: 40 };
  const point = new Vector3(0, -0.396 * Math.tan((20 * Math.PI) / 180) * 2, -2);
  const chunk: Chunk = { text: "Ja.", lines: ["Ja."], from: 0, to: 1, speaker: "tibik", tone: "calm", line: "test" };
  const check = (format: "wide" | "tall") =>
    facesUnderBar([0.5], () => chunk, () => camera, () => [{ points: [point], toward: new Vector3(0, 0, 1) }], format);
  expect(check("tall")).toHaveLength(1);
  expect(check("wide")).toEqual([]);
});

const WIDE_ONLY = { setup: { position: [0, 1.5, 5], target: [0, 1.5, 0], fov: 60 } as CameraSetup, aside: new Vector3(5 * Math.tan((40 * Math.PI) / 180), 1.5, 0) };
const tallLine = (speaker: Line["speaker"]): Line => ({ speaker, from: 1, to: 2, text: "Ja.", name: `${speaker}: Ja`, tone: "calm" });
const oneShot = () => ({ name: "Shot" });

const wall = obb("wall", new Matrix4().makeTranslation(0, 1.5, 2.5), [10, 2, 0.05]);

test("in the tall frame a speaker the wide frame shows must stay in view for the whole line; a listener's, a phone's, one out of the wide frame and anyone's outside the line need not", () => {
  const heads = () => ({ tibik: [WIDE_ONLY.aside], karen: [WIDE_ONLY.aside] });
  const out = (lines: readonly Line[], times: readonly number[], at = heads) => speakerOutOfTallFrame(times, lines, { shotAt: oneShot, cameraAt: () => WIDE_ONLY.setup, headsAt: at });
  expect(out([tallLine("tibik")], [1.5])).toHaveLength(1);
  expect(out([tallLine("tibik")], [0.5, 2.5])).toEqual([]);
  expect(out([tallLine("phone")], [1.5])).toEqual([]);
  expect(out([tallLine("tibik")], [1.5], () => ({ tibik: [new Vector3(0, 1.5, 0)], karen: [WIDE_ONLY.aside] }))).toEqual([]);
  expect(out([tallLine("tibik")], [1.5], () => ({ tibik: [new Vector3(0, 1.5, 9)], karen: [] }))).toEqual([]);
});

test("a head the wide frame crops, its crown above the frame throughout, still keeps in the tall frame every point the wide one shows, such as an eye", () => {
  const crown = new Vector3(0, 1.5 + 5 * Math.tan((35 * Math.PI) / 180), 0);
  const framing = { shotAt: oneShot, cameraAt: () => WIDE_ONLY.setup, headsAt: () => ({ tibik: [WIDE_ONLY.aside, crown] }) };
  expect(speakerOutOfTallFrame([1.5], [tallLine("tibik")], framing)).toHaveLength(1);
  expect(castOutOfTallFrame([1.5], [], framing)).toHaveLength(1);
  expect(speakerOutOfTallFrame([1.5], [tallLine("tibik")], { ...framing, headsAt: () => ({ tibik: [new Vector3(0, 1.5, 0), crown] }) })).toEqual([]);
});

test("in a shot without dialogue, whoever the wide frame shows the tall frame shows too; in a shot with a line, a listener may leave it; a head behind a wall is not shown", () => {
  const silentShot = (t: number) => (t < 3 ? { name: "Silent", from: 0, to: 3 } : { name: "Talk", from: 3, to: 6 });
  const out = (point: Vector3, times: readonly number[], solids: readonly Solid[] = []) =>
    castOutOfTallFrame(times, [{ ...tallLine("tibik"), from: 4, to: 5 }], { shotAt: silentShot, cameraAt: () => WIDE_ONLY.setup, headsAt: () => ({ karen: [point] }), solidsAt: () => solids });
  expect(out(WIDE_ONLY.aside, [0.5])).toHaveLength(1);
  expect(out(WIDE_ONLY.aside, [3.5, 4.5, 5.5])).toEqual([]);
  expect(out(new Vector3(20, 1.5, 0), [0.5])).toEqual([]);
  expect(out(new Vector3(0, 1.5, 0), [0.5])).toEqual([]);
  expect(out(WIDE_ONLY.aside, [0.5], [wall])).toEqual([]);
});

test("a window staged for one person's entrance or exit excuses only that person: another the wide frame shows must stay in the tall frame", () => {
  const silent = () => ({ name: "Silent", from: 0, to: 3 });
  const out = (staged: readonly Staged[]) =>
    castOutOfTallFrame([0.5], [], { shotAt: silent, cameraAt: () => WIDE_ONLY.setup, headsAt: () => ({ karen: [WIDE_ONLY.aside] }), staged });
  expect(out([["Silent", 0, 3, "tibik"]])).toHaveLength(1);
  expect(out([["Silent", 0, 3, "karen"]])).toEqual([]);
  expect(out([["Silent", 0, 3]])).toEqual([]);
});

test("every check means the same by his head: the top of its surface and the tops of his eyes", async () => {
  const { solveTreppenhaus } = await import("./treppenhaus/solve");
  const { solveKlingelsturm } = await import("./klingelsturm/solve");
  const points = (tibik: Parameters<typeof tibikHeadPoints>[0]) => tibikHeadPoints(tibik).map((p) => p.point.toArray());
  const tibik = solveTreppenhaus(5).tibik;
  expect(tibikHead(tibik).tibik.map((p) => p.toArray())).toEqual(points(tibik));
  const state = solveKlingelsturm(20);
  expect(castHeads(state).tibik.map((p) => p.toArray())).toEqual(points(state.tibik));
});

test("walking faster than a walk can go is flagged: speed squared over g times leg length above 0.6 for 0.2 s, unless that person is staged to run then, or a cut falls inside", () => {
  const leg = { thigh: { length: 0.22 }, shin: { length: 0.22 } };
  const walker = (speed: number) => (t: number) => ({ Tibik: { position: [speed * t, 0, 0], skeleton: leg } as unknown as Character });
  const frames = (speed: number) => Array.from({ length: 31 }, (_, f) => ({ t: f / 30, characters: walker(speed)(f / 30) }));
  expect(tooFastToWalk(frames(2), [])).toHaveLength(1);
  expect(tooFastToWalk(frames(1), [])).toEqual([]);
  expect(tooFastToWalk(frames(2), [], { Tibik: [0, 1] })).toEqual([]);
  const jumped = frames(0).map((frame) => (frame.t > 0.5 ? { ...frame, characters: { Tibik: { ...frame.characters.Tibik, position: [3, 0, 0] } as unknown as Character } } : frame));
  expect(tooFastToWalk(jumped, [0.5 + 1 / 60])).toEqual([]);
});
