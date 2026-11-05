import { Quaternion, Vector3 } from "three";
import { NO_INK } from "../toon/inkWidth";

export const WET = { colour: "#000000", opacity: 0.3, lift: 0.0003, segments: 32 };
const OUT = new Vector3(0, 0, 1);

export const WetMaterial: React.FC<{ readonly opacity: number }> = ({ opacity }) => (
  <meshBasicMaterial
    color={WET.colour}
    transparent
    opacity={WET.opacity * opacity}
    depthWrite={false}
  />
);

export const WetSpot: React.FC<{
  readonly point: Vector3;
  readonly normal: Vector3;
  readonly radius: number;
  readonly opacity: number;
  readonly lift?: number;
}> = ({ point, normal, radius, opacity, lift = WET.lift }) => (
  <mesh
    position={point.clone().addScaledVector(normal, lift)}
    quaternion={new Quaternion().setFromUnitVectors(OUT, normal)}
    userData={NO_INK}
  >
    <circleGeometry args={[radius, WET.segments]} />
    <WetMaterial opacity={opacity} />
  </mesh>
);
