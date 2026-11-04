import { useMemo } from "react";
import { Object3D } from "three";
import { floorLevel } from "../street/building";
import { INDOOR_SHADOW_RANGE, SunLight } from "../street/StreetSet";
import { WEATHER } from "../weather/overcast";
import { CEILING_LAMPS, CORE, FLUR, TIBIK_DOOR } from "./stairwell";

export const DAYLIGHT = 0.35;

const FLUR_LIGHT = "#ffcf8a";
const DOORWAY_Z = TIBIK_DOOR.hinge[2] + TIBIK_DOOR.width / 2;
const SPILL = {
  intensity: 6,
  from: [CORE.x0 - 0.7, floorLevel(1) + 2.0, DOORWAY_Z] as const,
  onto: [CORE.x0 + 1.8, floorLevel(1), DOORWAY_Z] as const,
  angle: 0.7,
  penumbra: 0.6,
};

const FlurSpill: React.FC<{ readonly spill: number }> = ({ spill }) => {
  const target = useMemo(() => new Object3D(), []);
  return (
    <>
      <primitive object={target} position={SPILL.onto} />
      <spotLight
        position={SPILL.from}
        target={target}
        color={FLUR_LIGHT}
        intensity={SPILL.intensity * spill}
        angle={SPILL.angle}
        penumbra={SPILL.penumbra}
        distance={7}
        decay={2}
      />
    </>
  );
};

export const StairwellLighting: React.FC<{
  readonly lights: number;
  readonly spill?: number;
}> = ({ lights, spill = 0 }) => (
  <>
    <hemisphereLight
      args={[
        WEATHER.sunny.hemisphere.sky,
        WEATHER.sunny.hemisphere.ground,
        0.45 * (DAYLIGHT + (1 - DAYLIGHT) * lights),
      ]}
    />
    <SunLight range={INDOOR_SHADOW_RANGE} normalBias={0.05} />
    {CEILING_LAMPS.map((lamp, i) => (
      <pointLight
        key={i}
        position={lamp}
        color="#fff1d6"
        intensity={3.5 * lights}
        distance={8}
        decay={2}
      />
    ))}
    <pointLight
      position={[
        (FLUR.x0 + FLUR.x1) / 2,
        floorLevel(1) + 2.2,
        (FLUR.z0 + FLUR.z1) / 2,
      ]}
      color={FLUR_LIGHT}
      intensity={4}
      distance={5}
      decay={2}
    />
    <FlurSpill spill={spill} />
  </>
);
