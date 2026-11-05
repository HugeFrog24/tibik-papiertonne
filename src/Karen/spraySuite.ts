import { expect, test } from "vitest";
import type { Placement } from "../characters/skeleton";
import type { Solid } from "../physics/collision";
import type { CameraSetup } from "../scenes/hausmuell/cameras";
import type { Burst, Flight, SprayFrame } from "./spray";
import { SPITTLE, type Spike } from "./spittle";
import { atFrame } from "./sceneSpray";
import {
  dropWidthsOnScreen,
  median,
  spittleClashes,
  spittleSpansOnScreen,
} from "./sprayChecks";

export type SprayUnderTest = {
  readonly flights: () => readonly Flight[];
  readonly frameAt: (t: number) => SprayFrame;
  readonly loudest: () => readonly Burst[];
  readonly spittleAt: (t: number) => readonly Spike[];
  readonly targets: (t: number) => readonly Solid[];
  readonly karenAt: (t: number) => Placement & { readonly mouthOpen: number };
  readonly cameraAt: (t: number) => CameraSetup;
};

const SLOW = { timeout: 600_000 };

export const sprayReadabilityTests = (scene: SprayUnderTest) => {
  test("every droplet leaves an open mouth, at least as open as a spittle burst needs", SLOW, () => {
    const shut = scene
      .flights()
      .filter(({ launch }) => scene.karenAt(atFrame(launch.at)).mouthOpen < SPITTLE.open)
      .map(({ launch }) => `${launch.id} at ${launch.at.toFixed(2)} s`);
    expect(shut.slice(0, 6)).toEqual([]);
  });

  test(
    "a droplet in flight is big enough to read on a phone: at least 5 px across in the 1080p frame, about three times real spit",
    SLOW,
    () => {
      const widths = dropWidthsOnScreen(
        scene.flights(),
        scene.frameAt,
        scene.cameraAt,
      );
      expect(widths.length).toBeGreaterThan(10);
      expect(median(widths)).toBeGreaterThanOrEqual(5);
    },
  );

  test(
    "on her loudest syllables a spittle burst flies from her lips, through nothing and never back into her head",
    SLOW,
    () => {
      expect(scene.loudest().length).toBeGreaterThan(3);
      expect(
        spittleClashes(
          scene.loudest(),
          scene.spittleAt,
          scene.targets,
          scene.karenAt,
        ).slice(0, 6),
      ).toEqual([]);
    },
  );

  test(
    "a spittle burst is wide enough to read on a phone: at least 30 px across in the 1080p frame",
    SLOW,
    () => {
      const spans = spittleSpansOnScreen(
        scene.loudest(),
        scene.spittleAt,
        scene.cameraAt,
      );
      expect(spans.length).toBeGreaterThan(2);
      expect(median(spans)).toBeGreaterThanOrEqual(30);
    },
  );
};
