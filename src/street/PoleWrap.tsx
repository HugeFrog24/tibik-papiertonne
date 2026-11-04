import type { Texture } from "three";
import { DECAL } from "../toon/primitives";
import { wrapGeometry, type Faceted, type Wrap } from "./wraps";

export const PoleWrap: React.FC<{
  readonly pole: Faceted;
  readonly wrap: Wrap;
  readonly map: Texture;
}> = ({ pole, wrap, map }) => {
  const { y, args } = wrapGeometry(pole, wrap);
  return (
    <mesh position={[0, y, 0]}>
      <cylinderGeometry args={args} />
      <meshToonMaterial map={map} {...DECAL} />
    </mesh>
  );
};
