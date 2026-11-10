import { Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { distanceToSegment } from "../characters/scalar";
import {
  BODY,
  CAR,
  carFront,
  carZ,
  kerbOf,
  BODY_BEVEL,
  GLASS_BEVEL,
  GREENHOUSE_WIDTH,
  GREENHOUSE,
  MIRROR,
  PLATE,
  faceX,
  plateOn,
  PARKED_CARS,
  SIDE_WINDOWS,
  ARCH_LINERS,
  WELL_WIDTH,
  WHEEL,
  carParts,
  type Point2,
} from "./carShape";
import { STREET_PARTS } from "./layout";
import { KERB_HEIGHT, KERB_Y, ROAD_Y } from "./building";
import { roundedSlab } from "../toon/extrude";

const CURB_Z = 1.92;
const [LENGTH, HEIGHT, WIDTH] = CAR.size;


const edgeDistance = (point: Point2, outline: readonly Point2[]) =>
  Math.min(
    ...outline.map((a, i) =>
      distanceToSegment(point, a, outline[(i + 1) % outline.length]),
    ),
  );

const inside = ([px, py]: Point2, outline: readonly Point2[]) => {
  let crossings = 0;
  outline.forEach(([ax, ay], i) => {
    const [bx, by] = outline[(i + 1) % outline.length];
    if (ay > py !== by > py && px < ax + ((py - ay) * (bx - ax)) / (by - ay))
      crossings++;
  });
  return crossings % 2 === 1;
};

describe("parked cars", () => {
  test("park on the right-hand edge in their direction of travel (StVO §12 (4)): the curb is on their right", () => {
    for (const car of PARKED_CARS) {
      const right = new Vector3(carFront(car), 0, 0).cross(
        new Vector3(0, 1, 0),
      );
      expect(Math.sign(right.z)).toBe(Math.sign(kerbOf(car) - carZ(car)));
    }
    expect(kerbOf(PARKED_CARS.find((car) => !car.far)!)).toBe(CURB_Z);
  });

  test("stand on the road, a 10–12 cm kerb below the pavement, not level with it", () => {
    expect(-ROAD_Y).toBeGreaterThanOrEqual(0.1);
    expect(-ROAD_Y).toBeLessThanOrEqual(0.12);
    expect(KERB_Y + KERB_HEIGHT / 2).toBeGreaterThanOrEqual(0);
    expect(KERB_Y - KERB_HEIGHT / 2).toBeLessThan(ROAD_Y);
    for (const car of PARKED_CARS) {
      const [body, ...mirrors] = carParts(car);
      expect(body.center[1] - body.size[1] / 2).toBeCloseTo(ROAD_Y, 9);
      for (const mirror of mirrors)
        expect(mirror.center[1]).toBeCloseTo(ROAD_Y + MIRROR.y, 9);
    }
  });

  test("both sides of the street are parked up, bumper to bumper with room to get out, every plate unique", () => {
    for (const far of [false, true]) {
      const row = PARKED_CARS.filter((car) => Boolean(car.far) === far)
        .map((car) => car.x)
        .sort((a, b) => a - b);
      expect(row.length).toBeGreaterThanOrEqual(5);
      row
        .slice(1)
        .forEach((x, i) => { expect(x - row[i] - LENGTH).toBeGreaterThanOrEqual(0.35); },
        );
    }
    expect(new Set(PARKED_CARS.map((car) => car.plate)).size).toBe(
      PARKED_CARS.length,
    );
  });

  test("the body and the glasshouse stay inside the car's collision box", () => {
    for (const [x, y] of [...BODY, ...GREENHOUSE]) {
      expect(Math.abs(x)).toBeLessThanOrEqual(LENGTH / 2);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(HEIGHT);
    }
  });

  test("the drawn body and glasshouse, bevels included, stay inside the collision box", () => {
    for (const geometry of [
      roundedSlab(BODY, WIDTH, BODY_BEVEL),
      roundedSlab(GREENHOUSE, GREENHOUSE_WIDTH, GLASS_BEVEL),
    ]) {
      geometry.computeBoundingBox();
      const { min, max } = geometry.boundingBox!;
      expect(Math.max(-min.x, max.x)).toBeLessThanOrEqual(LENGTH / 2 + 1e-6);
      expect(Math.max(-min.z, max.z)).toBeLessThanOrEqual(WIDTH / 2 + 1e-6);
      expect(min.y).toBeGreaterThanOrEqual(0);
      expect(max.y).toBeLessThanOrEqual(HEIGHT + 1e-6);
    }
  });

  test("the wheels stand on the ground, inside the car's width, and turn freely in their arches", () => {
    for (const x of WHEEL.x) {
      const center: Point2 = [x, WHEEL.radius];
      expect(inside(center, BODY)).toBe(false);
      expect(edgeDistance(center, BODY) - WHEEL.radius).toBeGreaterThanOrEqual(
        0.04,
      );
    }
    expect(WHEEL.z + WHEEL.width / 2).toBeLessThanOrEqual(WIDTH / 2 - 0.01);
    expect(WELL_WIDTH / 2).toBeLessThan(WHEEL.z - WHEEL.width / 2);
    ARCH_LINERS.forEach((liner, i) => {
      for (const point of liner) {
        expect(inside(point, BODY)).toBe(false);
        expect(
          Math.hypot(point[0] - WHEEL.x[i], point[1] - WHEEL.radius),
        ).toBeGreaterThanOrEqual(WHEEL.radius + 0.02);
      }
    });
  });

  test("the side windows sit inside their pillars, on the flat side of the glasshouse, above the beltline", () => {
    for (const window of SIDE_WINDOWS) {
      for (const point of window) {
        expect(inside(point, GREENHOUSE)).toBe(true);
        expect(edgeDistance(point, GREENHOUSE)).toBeGreaterThanOrEqual(
          GLASS_BEVEL.size + 0.005,
        );
        expect(inside(point, BODY)).toBe(false);
      }
    }
  });

  test("their number plates lie flat on the bumper and tailgate, neither floating nor sunk in", () => {
    for (const [y, end] of [
      [PLATE.front, 1],
      [PLATE.rear, -1],
    ] as const) {
      const plate = plateOn(y, end);
      for (const along of [-PLATE.size[1] / 2, 0, PLATE.size[1] / 2]) {
        const edge = y + along * Math.cos(plate.tilt);
        const gap =
          end * (plate.x + along * Math.sin(plate.tilt) - faceX(edge, end));
        expect(gap).toBeGreaterThan(0.001);
        expect(gap).toBeLessThan(0.008);
      }
    }
  });

  test("their wing mirrors are solid, so nobody walks through them", () => {
    const mirrors = STREET_PARTS.filter((part) => part.name === "wing mirror");
    expect(mirrors).toHaveLength(2 * PARKED_CARS.length);
    for (const car of PARKED_CARS) {
      for (const mirror of carParts(car).filter(
        (part) => part.name === "wing mirror",
      )) {
        expect(
          Math.abs(mirror.center[2] - carZ(car)) + mirror.size[2] / 2,
        ).toBeCloseTo(WIDTH / 2 + MIRROR.reach, 6);
      }
    }
  });
});
