import { Matrix4, Quaternion, Vector3 } from "three";
import { expect, test } from "vitest";
import { seenBy } from "../dialogue/screen";
import { SHOTS } from "../scenes/hausmuell/cameras";
import { ROAD_Y } from "./building";
import {
  PARKED_CARS,
  UMWELTPLAKETTE,
  WINDSHIELD,
  carYaw,
  carZ,
  kerbOf,
  plaketteOnPane,
  windowPane,
  type ParkedCar,
} from "./carShape";

const pane = windowPane(WINDSHIELD);
const paneMatrix = new Matrix4().compose(
  new Vector3(...pane.position),
  new Quaternion().setFromEuler(pane.rotation),
  new Vector3(1, 1, 1),
);
const r = UMWELTPLAKETTE.diameter / 2;
const [px, py, lift] = plaketteOnPane();
const rim = Array.from({ length: 32 }, (_, k) => {
  const a = (2 * Math.PI * k) / 32;
  return [px + r * Math.cos(a), py + r * Math.sin(a)] as const;
});
const local = (x: number, y: number, z = lift) =>
  new Vector3(x, y, z).applyMatrix4(paneMatrix);

const toWorld = (car: ParkedCar, p: Vector3) =>
  p
    .clone()
    .applyAxisAngle(new Vector3(0, 1, 0), carYaw(car))
    .add(new Vector3(car.x, ROAD_Y, carZ(car)));

test("the badge is the 80 mm disc, inside the windscreen with at least 3 cm of glass round it", () => {
  expect(UMWELTPLAKETTE.diameter).toBe(0.08);
  for (const [x, y] of rim) {
    expect(Math.abs(x)).toBeLessThanOrEqual(pane.size[0] / 2 - 0.03);
    expect(Math.abs(y)).toBeLessThanOrEqual(pane.size[1] / 2 - 0.03);
  }
});

test("it sits on the glass, 0.5-2 mm proud of the pane along its outward normal", () => {
  const normal = local(0, 0, 1).sub(local(0, 0, 0));
  const onPane = local(0, 0, 0);
  for (const [x, y] of rim) {
    const gap = local(x, y).sub(onPane).dot(normal);
    expect(gap).toBeGreaterThanOrEqual(0.0005);
    expect(gap).toBeLessThanOrEqual(0.002);
  }
  expect(normal.x).toBeGreaterThan(0);
  expect(normal.y).toBeGreaterThan(0);
});

test("lower right as the driver sees it: the passenger half and the lower half of the windscreen", () => {
  const centre = local(px, py);
  const right = new Vector3(1, 0, 0).cross(new Vector3(0, 1, 0));
  expect(centre.dot(right)).toBeGreaterThan(0.2);
  const [a, b] = WINDSHIELD;
  expect(centre.y).toBeLessThan((a[1] + b[1]) / 2);
});

test("on every parked car the badge is on the kerb side, and behind Karen at least one faces the camera", () => {
  for (const car of PARKED_CARS) {
    const at = toWorld(car, local(px, py));
    expect(Math.sign(at.z - carZ(car))).toBe(
      Math.sign(kerbOf(car) - carZ(car)),
    );
  }
  const shot = SHOTS.find((s) => s.name === "Karen: Hausmüll")!;
  const setup = shot.at((shot.from + shot.to) / 2);
  const eye = new Vector3(...setup.position);
  const seen = PARKED_CARS.filter((car) => {
    const at = toWorld(car, local(px, py));
    const normal = toWorld(car, local(px, py, lift + 1)).sub(at);
    return (
      seenBy(at, setup) && eye.clone().sub(at).normalize().dot(normal) > 0.2
    );
  });
  expect(seen.length).toBeGreaterThanOrEqual(1);
});
