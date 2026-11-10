import { expect, test } from "vitest";
import { SPRAY, flightPoint } from "../../Karen/spray";
import {
  outOfPlace,
  passingThrough,
  spotsOffTheirSurface,
  strayFlights,
  tooThin,
} from "../../Karen/sprayChecks";
import { sprayReadabilityTests } from "../../Karen/spraySuite";
import { cameraAt } from "./cameras";
import { LINES } from "./choreography";
import { solveHausmuell } from "./solve";
import {
  hausmuellFlights,
  hausmuellLoudest,
  hausmuellSpittleAt,
  hausmuellSprayAt,
  sprayOn,
  sprayTargets,
} from "./spray";

test(
  "she sprays on her shouted lines only, every droplet leaving from just in front of her lips, outside her head",
  { timeout: 300_000 },
  () => {
    expect(hausmuellFlights().length).toBeGreaterThan(30);
    expect(
      outOfPlace(hausmuellFlights(), LINES, (t) => solveHausmuell(t).karen),
    ).toEqual([]);
  },
);

test(
  "no droplet passes through anything on its way: the street, the bins, the house, Tibik, his box or Karen herself",
  { timeout: 600_000 },
  () => {
    expect(
      passingThrough(hausmuellFlights(), sprayTargets).slice(0, 6),
    ).toEqual([]);
    expect(tooThin(hausmuellFlights(), sprayTargets)).toEqual([]);
  },
);

test(
  "every droplet comes down within two seconds and two metres from her, most on the ground",
  { timeout: 300_000 },
  () => {
    const flights = hausmuellFlights();
    expect(strayFlights(flights)).toEqual([]);
    const ground = flights.filter(({ landing }) => landing!.normal.y > 0.9);
    expect(ground.length / flights.length).toBeGreaterThan(0.5);
  },
);

test(
  "spots on the pavement dry up within a few seconds; spots on his box stay, on the box, wherever he carries it",
  { timeout: 300_000 },
  () => {
    const flights = hausmuellFlights();
    for (const { launch, landing, kind } of flights) {
      if (!landing || kind !== "dries") continue;
      const at = (dt: number) =>
        hausmuellSprayAt(landing.at + dt).spots.find((s) => s.id === launch.id);
      expect(at(0.01)?.opacity).toBeGreaterThan(0.9);
      expect(at(SPRAY.dry + 0.1)).toBeUndefined();
    }
    expect(
      spotsOffTheirSurface(flights, hausmuellSprayAt, sprayOn, [0.5, 2]),
    ).toEqual([]);
  },
);

test("in flight a droplet is drawn as the streak it leaves in one exposure", () => {
  const { launch } = hausmuellFlights()[0];
  const drop = hausmuellSprayAt(launch.at + 0.05).drops.find(
    (d) => d.id === launch.id,
  )!;
  expect(drop.head.distanceTo(flightPoint(launch, 0.05))).toBeLessThan(1e-9);
  expect(drop.tail.distanceTo(flightPoint(launch, 0.05 - 1 / 60))).toBeLessThan(
    1e-9,
  );
  expect(drop.head.distanceTo(drop.tail)).toBeGreaterThan(0.03);
  expect(drop.head.distanceTo(drop.tail)).toBeLessThan(0.1);
});

sprayReadabilityTests({
  flights: hausmuellFlights,
  frameAt: hausmuellSprayAt,
  loudest: hausmuellLoudest,
  spittleAt: hausmuellSpittleAt,
  targets: sprayTargets,
  karenAt: (t) => solveHausmuell(t).karen,
  cameraAt,
});
