import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { eulerFromBasis } from "../toon/orient";
import { ToonBox, ToonTorus } from "../toon/primitives";
import { KEY_RING, keyParts } from "./keyRingShape";

const AXIS = new Vector3(0, 0, 1);
const RING_STEEL = "#a3a8ad";

export const KeyRing: React.FC<{ readonly matrix: Matrix4 }> = ({ matrix }) => (
  <group matrixAutoUpdate={false} matrix={matrix}>
    <ToonTorus
      radius={KEY_RING.ring.radius}
      tube={KEY_RING.ring.tube}
      color={RING_STEEL}
      ink={KEY_RING.ink}
      segments={[8, 48]}
      receiveShadow
    />
    {keyParts().map((key) => (
      <group key={key.name}>
        <ToonTorus
          position={key.bow.centre}
          rotation={new Euler().setFromQuaternion(
            new Quaternion().setFromUnitVectors(AXIS, key.bow.axis),
          )}
          radius={key.bow.radius}
          tube={key.bow.tube}
          color={key.colour}
          ink={KEY_RING.ink}
          segments={[8, 32]}
          receiveShadow
        />
        <ToonBox
          position={[key.blade.centre.x, key.blade.centre.y, key.blade.centre.z]}
          rotation={eulerFromBasis(...key.blade.axes)}
          size={[...key.blade.size]}
          color={key.colour}
          ink={KEY_RING.ink}
        />
      </group>
    ))}
  </group>
);
