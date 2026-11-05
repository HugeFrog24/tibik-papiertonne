import { DoubleSide } from "three";
import { useDisposable } from "../toon/useDisposable";
import { bentPlane } from "./bentPlane";
import { BLANKET, blanketEdge, blanketSurface, type BedRect } from "./blanketShape";

type Ball = Parameters<typeof blanketSurface>[1][number];

const SEGMENTS = [64, 40] as const;

export const Blanket: React.FC<{ readonly bed: BedRect; readonly body: readonly Ball[]; readonly cover: number }> = ({ bed, body, cover }) => {
  const edge = blanketEdge(bed, body, cover);
  const far = bed.z1 + BLANKET.hang;
  const geometry = useDisposable(() => {
    const height = blanketSurface(bed, body, cover);
    return bentPlane([bed.x1 - edge, far - (bed.z0 - BLANKET.hang)], SEGMENTS, (u, v) => height(edge + u, far - v));
  }, [bed, body, cover, edge, far]);
  return (
    <mesh geometry={geometry} position={[edge, 0, far]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshToonMaterial color={BLANKET.color} side={DoubleSide} />
    </mesh>
  );
};
