import { expect, test } from "vitest";
import {
  outOfPlace,
  passingThrough,
  spotsOffTheirSurface,
  strayFlights,
  tooThin,
} from "../../Karen/sprayChecks";
import { TIBIK_DOOR } from "../../building/stairwell";
import { sprayReadabilityTests } from "../../Karen/spraySuite";
import { cameraAt } from "./cameras";
import { LINES } from "./choreography";
import { solveKlingelsturm } from "./solve";
import {
  klingelsturmFlights,
  klingelsturmLoudest,
  klingelsturmSpittleAt,
  klingelsturmSprayAt,
  klingelsturmSprayOn,
  klingelsturmSprayTargets,
} from "./spray";

test(
  "at his door and on the phone she sprays on her shouted lines only, from just in front of her lips",
  { timeout: 600_000 },
  () => {
    expect(klingelsturmFlights().length).toBeGreaterThan(30);
    expect(
      outOfPlace(
        klingelsturmFlights(),
        LINES,
        (t) => solveKlingelsturm(t).karen,
      ),
    ).toEqual([]);
  },
);

test(
  "no droplet passes through anything: his door, its viewer, the walls, the floor, the phone, Tibik or Karen",
  { timeout: 600_000 },
  () => {
    expect(
      passingThrough(klingelsturmFlights(), klingelsturmSprayTargets).slice(
        0,
        6,
      ),
    ).toEqual([]);
    expect(tooThin(klingelsturmFlights(), klingelsturmSprayTargets)).toEqual(
      [],
    );
  },
);

test(
  "every droplet comes down within two seconds and two metres; the door shouts land on his door",
  { timeout: 600_000 },
  () => {
    const flights = klingelsturmFlights();
    expect(strayFlights(flights)).toEqual([]);
    const atTheDoor = flights.filter(({ launch }) => launch.at < 15);
    expect(atTheDoor.length).toBeGreaterThan(10);
    for (const { landing } of atTheDoor)
      expect(landing!.on.startsWith(TIBIK_DOOR.name)).toBe(true);
  },
);

test(
  "spots on his door stay on the door as it swings open",
  { timeout: 600_000 },
  () => {
    expect(
      spotsOffTheirSurface(
        klingelsturmFlights(),
        klingelsturmSprayAt,
        klingelsturmSprayOn,
        [0.3, 1.5, 3],
      ),
    ).toEqual([]);
  },
);

sprayReadabilityTests({
  flights: klingelsturmFlights,
  frameAt: klingelsturmSprayAt,
  loudest: klingelsturmLoudest,
  spittleAt: klingelsturmSpittleAt,
  targets: klingelsturmSprayTargets,
  karenAt: (t) => solveKlingelsturm(t).karen,
  cameraAt,
});
