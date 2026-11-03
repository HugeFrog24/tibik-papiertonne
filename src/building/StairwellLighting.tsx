import { floorLevel } from "../street/building";
import { INDOOR_SHADOW_RANGE, SunLight } from "../street/StreetSet";
import { CEILING_LAMPS, FLUR } from "./stairwell";

export const StairwellLighting: React.FC<{
  readonly lights: number;
}> = ({ lights }) => (
  <>
    <hemisphereLight args={["#ffffff", "#b5ad9c", 0.45]} />
    <SunLight range={INDOOR_SHADOW_RANGE} normalBias={0.05} />
    {CEILING_LAMPS.map((lamp, i) => (
      <pointLight key={i} position={lamp} color="#fff1d6" intensity={3.5 * lights} distance={8} decay={2} />
    ))}
    <pointLight
      position={[(FLUR.x0 + FLUR.x1) / 2, floorLevel(1) + 2.2, (FLUR.z0 + FLUR.z1) / 2]}
      color="#ffcf8a"
      intensity={4}
      distance={5}
      decay={2}
    />
  </>
);
