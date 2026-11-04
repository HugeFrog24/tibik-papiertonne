import { Quaternion, Vector3 } from "three";
import { NO_INK } from "../toon/inkWidth";

const WET = { colour: "#000000", opacity: 0.3, lift: 0.0003 };
const OUT = new Vector3(0, 0, 1);

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
    <circleGeometry args={[radius, 12]} />
    <meshBasicMaterial
      color={WET.colour}
      transparent
      opacity={WET.opacity * opacity}
      depthWrite={false}
    />
  </mesh>
);
